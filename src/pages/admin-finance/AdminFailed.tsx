import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { getAdminPayments, getAdminTopups, type PaymentStatus } from '../../lib/api/payment'
import { getSettlements } from '../../lib/api/settlement'
import type { TopupStatus } from '../../lib/api/wallet'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { mmddhm, retryHint, sellerName } from './format'
import { MOCK_FAILED } from './mock'
import s from './AdminFinance.module.css'

type Kind = 'payment' | 'topup' | 'refund' | 'settlement' | 'delivery'
type Tab = 'ALL' | Kind

export type FailedRow = {
  key: string
  kind: Kind
  type: string
  tone: Tone
  at: string // ISO
  who: string
  amount: number | null
  cause: string
  handle: string
  /** 월 정산으로 바로 가기 */
  toSettlement?: boolean
  /** API가 없어 예시로 채운 행 */
  mock?: boolean
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'payment', label: '결제' },
  { value: 'topup', label: '충전' },
  { value: 'refund', label: '환불' },
  { value: 'settlement', label: '정산' },
  { value: 'delivery', label: '배송' },
]
const COLS = '1fr .8fr .7fr .7fr 1.2fr 1.4fr .8fr'
/** 최근 결제·충전 몇 건에서 실패를 골라요 */
const SCAN_SIZE = 100

const PAYMENT_CAUSE: Partial<Record<PaymentStatus, string>> = {
  FAILED_INSUFFICIENT_BALANCE: '예치금 부족',
  FAILED_ORDER_EXPIRED: '주문 만료',
  FAILED_SYSTEM_ERROR: '시스템 오류',
}
const TOPUP_CAUSE: Partial<Record<TopupStatus, string>> = {
  PROCESSING: '토스 승인 응답 없음',
  FAILED_PG_DECLINED: '결제사 승인 거절',
  FAILED_AMOUNT_MISMATCH: '금액 불일치',
  FAILED_SYSTEM_ERROR: '시스템 오류',
}

async function loadFailed(): Promise<FailedRow[]> {
  // 정산: 실패(재시도 중) · 수동 처리 필요 정산서
  const [manual, failed, payments, topups] = await Promise.all([
    getSettlements({ status: 'MANUAL_REQUIRED', size: 50 }),
    getSettlements({ status: 'FAILED', size: 50 }),
    // TODO(API 미구현): 관리자 결제·충전 조회에 상태(실패) 필터가 없어요 — 최근 SCAN_SIZE건에서 실패만 골라 보여 줘요
    getAdminPayments({ size: SCAN_SIZE }).catch(() => null),
    getAdminTopups({ size: SCAN_SIZE }).catch(() => null),
  ])
  const rows: FailedRow[] = []
  for (const st of [...manual.items, ...failed.items]) {
    const isManual = st.status === 'MANUAL_REQUIRED'
    rows.push({
      key: `stl-${st.settlementId}`,
      kind: 'settlement',
      type: isManual ? '정산 수동 필요' : '정산 재시도 중',
      tone: isManual ? 'dark' : 'amber',
      at: st.createdAt,
      who: sellerName(st),
      amount: st.payoutAmount,
      cause: isManual ? `재시도 ${st.retryCount}번 실패 · ${st.lastFailReason ?? ''}` : (st.lastFailReason ?? '-'),
      handle: isManual ? '' : retryHint(st.nextRetryAt),
      toSettlement: isManual,
    })
  }
  for (const p of payments?.items ?? []) {
    const cause = PAYMENT_CAUSE[p.status]
    if (!cause) continue
    rows.push({
      key: `pay-${p.paymentId}`,
      kind: 'payment',
      type: '결제 실패',
      tone: 'red',
      at: p.createdAt,
      who: p.memberEmail ?? `회원 #${p.memberId}`,
      amount: p.amount,
      cause: p.failReason ?? cause,
      handle: '구매자가 다시 결제할 수 있어요',
    })
  }
  for (const t of topups?.items ?? []) {
    const cause = TOPUP_CAUSE[t.status]
    if (!cause) continue
    const pending = t.status === 'PROCESSING'
    rows.push({
      key: `top-${t.topupId}`,
      kind: 'topup',
      type: pending ? '충전 확인 지연' : '충전 실패',
      tone: pending ? 'amber' : 'red',
      at: t.createdAt,
      who: t.memberEmail ?? `회원 #${t.memberId}`,
      amount: t.amount,
      cause: t.failReason ?? cause,
      handle: pending ? '자동 확인 대기' : '구매자가 다시 충전할 수 있어요',
    })
  }
  // TODO(API 미구현): 환불 실패 목록 API(payment_refund), 배송 추적 실패 목록 API — 지금은 예시 행
  rows.push(...MOCK_FAILED)
  return rows.sort((a, b) => b.at.localeCompare(a.at))
}

/** 관리자 · 실패 거래 (A7, 조회 전용) */
export default function AdminFailed() {
  const desktop = useIsDesktop()
  const [tab, setTab] = useState<Tab>('ALL')
  const data = useApi(loadFailed, [])
  const all = data.data ?? []
  const rows = useMemo(() => (tab === 'ALL' ? all : all.filter((r) => r.kind === tab)), [all, tab])
  const tabs = TABS.map((t) => {
    const n = t.value === 'ALL' ? all.length : all.filter((r) => r.kind === t.value).length
    return { value: t.value, label: data.data && n > 0 ? `${t.label} ${n}` : t.label }
  })

  const handle = (r: FailedRow) =>
    r.toSettlement ? (
      <Button variant="outline" size="sm" to="/admin/settlements?status=MANUAL_REQUIRED">
        월 정산으로
      </Button>
    ) : r.kind === 'delivery' ? (
      <span className={c.sub}>물류 담당자 확인</span>
    ) : null

  const body =
    data.loading && !data.data ? (
      <Loading />
    ) : data.error ? (
      <ErrorView message={data.error} onRetry={data.reload} />
    ) : rows.length === 0 ? (
      <Empty title="실패한 거래가 없어요." />
    ) : null

  return (
    <ConsoleShell
      variant="admin"
      active="failed"
      title={<span className={s.titleWithBadge}>실패 거래 {!desktop && <Badge>조회 전용</Badge>}</span>}
      actions={<Badge>조회 전용</Badge>}
    >
      <div className={s.page}>
        {desktop ? (
          <>
            <div className={c.toolbar}>
              <Segment label="유형" items={tabs} value={tab} onChange={setTab} />
            </div>
            <div className={c.table} role="table" aria-label="실패 거래">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>유형</span>
                <span>일시</span>
                <span>대상</span>
                <span>금액</span>
                <span>원인</span>
                <span>처리</span>
                <span></span>
              </div>
              {body}
              {rows.map((r) => (
                <div key={r.key} role="row" className={`${c.tr} ${c.num}`} style={{ gridTemplateColumns: COLS }}>
                  <span className={s.badges}>
                    <Badge tone={r.tone}>{r.type}</Badge>
                    {r.mock && <Badge>예시</Badge>}
                  </span>
                  <span>{mmddhm(r.at)}</span>
                  <span className={c.ellipsis} title={r.who}>
                    {r.who}
                  </span>
                  <span>{r.amount === null ? '—' : won(r.amount)}</span>
                  <span className={c.ellipsis} title={r.cause}>
                    {r.cause}
                  </span>
                  <span className={c.sub}>{r.handle}</span>
                  <span>{handle(r)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Chips label="유형" items={tabs} value={tab} onChange={setTab} />
            {body}
            <ul className={s.cards}>
              {rows.map((r) => (
                <li key={r.key} className={s.cardItem}>
                  <div className={s.cardHead}>
                    <span className={s.badges}>
                      <Badge tone={r.tone}>{r.type}</Badge>
                      {r.mock && <Badge>예시</Badge>}
                    </span>
                    <span className={s.meta}>{mmddhm(r.at)}</span>
                  </div>
                  <div className={s.cardHead}>
                    <span className={c.ellipsis}>{r.who}</span>
                    <b>{r.amount === null ? '—' : won(r.amount)}</b>
                  </div>
                  <p className={s.meta}>원인 · {r.cause}</p>
                  {r.toSettlement ? (
                    <Link to="/admin/settlements?status=MANUAL_REQUIRED" className={s.inlineLink}>
                      월 정산에서 다시 실행하기
                    </Link>
                  ) : (
                    <p className={s.meta}>{r.kind === 'delivery' ? '물류 담당자 확인' : r.handle}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className={s.foot}>
          조회 전용이에요. 수동 처리는 월 정산 재처리만 할 수 있어요. 배송 문제는 물류 담당자가 처리해요.
        </p>
      </div>
    </ConsoleShell>
  )
}
