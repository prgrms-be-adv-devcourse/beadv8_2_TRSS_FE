import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { ApiError, errorMessage, type PageResponse } from '../../lib/api'
import {
  getDeliveryFailures,
  getPaymentFailures,
  getSettlementFailures,
  getTopupFailures,
  type AdminFailureItem,
  type AdminFailureType,
} from '../../lib/api/failure'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { mmddhm } from './format'
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
  /** 월 정산 화면에서 열 정산서 ID (정산 수동 필요만) */
  settlementId?: number
}

/** 서비스 한 곳의 결과. 다른 서비스가 실패해도 이 탭만 오류로 보여요 */
type Source = {
  kind: Kind
  rows: FailedRow[]
  total: number
  /** 아직 API가 배포되지 않음(404) */
  notReady: boolean
  error: string | null
}

const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'payment', label: '결제' },
  { value: 'topup', label: '충전' },
  { value: 'refund', label: '환불' },
  { value: 'settlement', label: '정산' },
  { value: 'delivery', label: '배송' },
]
const KIND_LABEL: Record<Kind, string> = {
  payment: '결제',
  topup: '충전',
  refund: '환불',
  settlement: '정산',
  delivery: '배송',
}
const COLS = '1fr .8fr .9fr .7fr 1.3fr 1.3fr .8fr'
/** 서비스마다 최신 몇 건을 불러와요 */
const SIZE = 50

const KIND_OF: Record<AdminFailureType, Kind> = {
  PAYMENT_FAILED: 'payment',
  TOPUP_DELAYED: 'topup',
  REFUND_FAILED: 'refund',
  SETTLEMENT_MANUAL_REQUIRED: 'settlement',
  DELIVERY_TRACKING_FAILED: 'delivery',
}

/** 유형 배지 이름과 색 (시안 A7) */
function badgeOf(item: AdminFailureItem): { type: string; tone: Tone } {
  switch (item.type) {
    case 'PAYMENT_FAILED':
      return { type: '결제 실패', tone: 'red' }
    case 'TOPUP_DELAYED':
      // 결과 확인 대기는 지연, 그 밖에는 실패
      return item.handlingCode === 'AUTO_RECHECK'
        ? { type: '충전 확인 지연', tone: 'amber' }
        : { type: '충전 실패', tone: 'red' }
    case 'REFUND_FAILED':
      return { type: '환불 실패', tone: 'red' }
    case 'SETTLEMENT_MANUAL_REQUIRED':
      return { type: '정산 수동 필요', tone: 'dark' }
    case 'DELIVERY_TRACKING_FAILED':
      return { type: '배송 추적 실패', tone: 'red' }
  }
}

function toRow(item: AdminFailureItem): FailedRow {
  const target = item.targetType === 'SELLER' ? '판매자' : '회원'
  const name = item.targetLabel ?? (item.targetId === null ? '-' : `${target} #${item.targetId}`)
  return {
    key: `${item.type}-${item.refId}`,
    kind: KIND_OF[item.type],
    ...badgeOf(item),
    at: item.occurredAt,
    who: `[${target}] ${name}`,
    amount: item.amount,
    cause: item.reasonLabel,
    handle: item.handlingLabel,
    settlementId: item.type === 'SETTLEMENT_MANUAL_REQUIRED' ? item.refId : undefined,
  }
}

async function load(kind: Kind, fetch: () => Promise<PageResponse<AdminFailureItem>>): Promise<Source> {
  try {
    const page = await fetch()
    return { kind, rows: page.items.map(toRow), total: page.totalElements, notReady: false, error: null }
  } catch (e) {
    const notReady = e instanceof ApiError && e.status === 404
    return { kind, rows: [], total: 0, notReady, error: notReady ? null : errorMessage(e) }
  }
}

/** 서비스마다 따로 불러 합쳐요. 한 곳이 실패해도 나머지는 보여요 */
async function loadFailed(): Promise<Source[]> {
  const q = { size: SIZE }
  return Promise.all([
    load('payment', () => getPaymentFailures('PAYMENT_FAILED', q)),
    load('topup', () => getTopupFailures(q)),
    load('refund', () => getPaymentFailures('REFUND_FAILED', q)),
    load('settlement', () => getSettlementFailures(q)),
    load('delivery', () => getDeliveryFailures(q)),
  ])
}

/** 관리자 · 실패 거래 (A7, 조회 전용) */
export default function AdminFailed() {
  const desktop = useIsDesktop()
  const [tab, setTab] = useState<Tab>('ALL')
  const data = useApi(loadFailed, [])
  const sources = useMemo(() => data.data ?? [], [data.data])
  const all = useMemo(() => sources.flatMap((x) => x.rows).sort((a, b) => b.at.localeCompare(a.at)), [sources])
  const rows = useMemo(() => (tab === 'ALL' ? all : all.filter((r) => r.kind === tab)), [all, tab])
  const tabs = TABS.map((t) => {
    const n =
      t.value === 'ALL'
        ? sources.reduce((sum, x) => sum + x.total, 0)
        : (sources.find((x) => x.kind === t.value)?.total ?? 0)
    return { value: t.value, label: data.data && n > 0 ? `${t.label} ${n}` : t.label }
  })
  // 지금 탭에서 보여 줄 서비스별 안내 (준비 중, 오류)
  const shown = tab === 'ALL' ? sources : sources.filter((x) => x.kind === tab)
  const notices = shown
    .filter((x) => x.notReady || x.error)
    .map((x) => (x.notReady ? `${KIND_LABEL[x.kind]} 실패 목록은 준비 중이에요.` : `${KIND_LABEL[x.kind]}: ${x.error}`))

  const settlementTo = (r: FailedRow) => `/admin/settlements?settlementId=${r.settlementId}`
  const handle = (r: FailedRow) =>
    r.settlementId !== undefined ? (
      <Button variant="outline" size="sm" to={settlementTo(r)}>
        월 정산으로
      </Button>
    ) : r.kind === 'delivery' ? (
      <span className={c.sub}>{r.handle}</span>
    ) : null

  const body =
    data.loading && !data.data ? (
      <Loading />
    ) : data.error ? (
      <ErrorView message={data.error} onRetry={data.reload} />
    ) : rows.length === 0 && notices.length === 0 ? (
      <Empty title="실패한 거래가 없어요." />
    ) : null
  const noticeView =
    notices.length > 0 ? (
      <div className={s.foot} role="status">
        {notices.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
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
            {noticeView}
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
                  </span>
                  <span>{mmddhm(r.at)}</span>
                  <span className={c.ellipsis} title={r.who}>
                    {r.who}
                  </span>
                  <span>{r.amount === null ? '—' : won(r.amount)}</span>
                  <span className={c.ellipsis} title={r.cause}>
                    {r.cause}
                  </span>
                  <span className={c.sub}>{r.settlementId !== undefined || r.kind === 'delivery' ? '' : r.handle}</span>
                  <span>{handle(r)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Chips label="유형" items={tabs} value={tab} onChange={setTab} />
            {noticeView}
            {body}
            <ul className={s.cards}>
              {rows.map((r) => (
                <li key={r.key} className={s.cardItem}>
                  <div className={s.cardHead}>
                    <span className={s.badges}>
                      <Badge tone={r.tone}>{r.type}</Badge>
                    </span>
                    <span className={s.meta}>{mmddhm(r.at)}</span>
                  </div>
                  <div className={s.cardHead}>
                    <span className={c.ellipsis}>{r.who}</span>
                    <b>{r.amount === null ? '—' : won(r.amount)}</b>
                  </div>
                  <p className={s.meta}>원인 · {r.cause}</p>
                  {r.settlementId !== undefined ? (
                    <Link to={settlementTo(r)} className={s.inlineLink}>
                      월 정산에서 다시 실행하기
                    </Link>
                  ) : (
                    <p className={s.meta}>{r.handle}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        <p className={s.foot}>
          조회 전용이에요. 수동 처리는 월 정산 재처리만 할 수 있어요. 배송 문제는 물류 담당자가 처리해요. 유형마다 최근{' '}
          {SIZE}건까지 보여요.
        </p>
      </div>
    </ConsoleShell>
  )
}
