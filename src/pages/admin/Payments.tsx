import { useEffect, useRef, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, won, type Tone } from '../../components/ui/Misc'
import Icon from '../../components/ui/Icon'
import c from '../../components/ui/console.module.css'
import { toPageParam } from '../../lib/api'
import {
  getAdminPayments,
  getAdminTopups,
  type AdminPayment,
  type AdminPaymentQuery,
  type AdminTopup,
  type HoldingStatus,
  type PaymentStatus,
} from '../../lib/api/payment'
import type { TopupStatus } from '../../lib/api/wallet'
import { useApi } from '../../lib/useApi'
import { useDebounced } from '../../lib/useDebounced'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, Pager, fmtDateTime } from './shared'
import s from './admin.module.css'

const PAGE_SIZE = 20
const COLS = { gridTemplateColumns: '1fr 1.3fr 1fr 1fr .8fr .8fr' }

// 환불 탭은 payment_refund가 생기면 추가해요 (10/17 기준 미구현)
type TabKey = 'PAYMENT' | 'TOPUP'

/** 결제 결과 [글자, 배지 색] */
const PAYMENT_STATUS: Record<PaymentStatus, [string, Tone]> = {
  PAID: ['결제 완료', 'green'],
  REFUNDED: ['환불', 'blue'],
  FAILED_INSUFFICIENT_BALANCE: ['잔액 부족', 'red'],
  FAILED_ORDER_EXPIRED: ['주문 만료', 'neutral'],
  FAILED_SYSTEM_ERROR: ['시스템 오류', 'red'],
}

/** 충전 상태 [글자, 배지 색] */
const TOPUP_STATUS: Record<TopupStatus, [string, Tone]> = {
  READY: ['결제 전', 'neutral'],
  PROCESSING: ['확인 중', 'amber'],
  DONE: ['충전 완료', 'green'],
  CANCELED: ['취소됨', 'neutral'],
  FAILED_USER_CANCEL: ['사용자 취소', 'neutral'],
  FAILED_PG_DECLINED: ['승인 거절', 'red'],
  FAILED_AMOUNT_MISMATCH: ['금액 불일치', 'red'],
  FAILED_EXPIRED: ['시간 만료', 'neutral'],
  FAILED_SYSTEM_ERROR: ['시스템 오류', 'red'],
}

/** 보관 금액 상태. 실패 건은 null → '-' */
const HOLDING: Record<HoldingStatus, [string, Tone]> = {
  HELD: ['보관 중', 'neutral'],
  RELEASED: ['환불 완료', 'red'],
  SETTLED: ['정산됨', 'green'],
}

type Period = '7' | '30' | 'custom'
const PERIODS: { value: Period; label: string }[] = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
  { value: 'custom', label: '기간 직접 고르기' },
]

/** Date → 'yyyy-MM-dd' (브라우저 현지 시각 = KST 기준) */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 최근 N일 = 오늘 포함 N일 (예: 최근 7일 = 6일 전 ~ 오늘) */
const recentRange = (days: number) => {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - (days - 1))
  return { from: ymd(from), to: ymd(to) }
}

/** 값이 없으면 '-' */
const orDash = (v: string | null | undefined) => (v && v.trim() ? v : '-')

/** 충전번호는 앞 13자만 보여 줘요. 이 길이로도 검색돼요 (BE PR #149: TOPUP- 뒤 4자리 이상 앞부분 일치) */
const ORDER_ID_VIEW_LENGTH = 13
const TOPUP_PREFIX = 'TOPUP-'
/** 충전번호 검색에 필요한 TOPUP- 뒤 최소 자릿수 (BE와 같은 값) */
const TOPUP_ID_MIN_DIGITS = 4

/**
 * 글자를 클립보드에 복사해요. 성공하면 true
 * navigator.clipboard는 https나 localhost에서만 동작해서, 개발 서버(http + IP)에서는 예전 방식(execCommand)으로 대신 복사해요
 */
async function copyText(text: string) {
  if (window.isSecureContext && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 아래 예전 방식으로 다시 시도
    }
  }
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  try {
    return document.execCommand('copy')
  } catch {
    return false
  } finally {
    document.body.removeChild(el)
  }
}

/** 검색·탭·기간·페이지와 탭별 목록 */
function usePaymentsView() {
  const [tab, setTab] = useState<TabKey>('PAYMENT')
  const [keyword, setKeyword] = useState('')
  const [period, setPeriod] = useState<Period>('7')
  const [customFrom, setCustomFrom] = useState(recentRange(7).from)
  const [customTo, setCustomTo] = useState(recentRange(7).to)
  const [pageState, setPageState] = useState({ key: '', page: 1 })
  const [copied, setCopied] = useState<{ topupId: number; ok: boolean } | null>(null)
  const copiedTimer = useRef<number | undefined>(undefined)

  // 화면을 떠나면 "복사했어요" 표시 타이머를 정리해요
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  /** 충전번호 전체를 복사하고 1.5초 동안 결과를 보여 줘요 */
  async function copyOrderId(topupId: number, orderId: string) {
    const ok = await copyText(orderId)
    setCopied({ topupId, ok })
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1500)
  }

  const q = useDebounced(keyword.trim())
  const range = period === 'custom' ? { from: customFrom, to: customTo } : recentRange(Number(period))
  const periodInvalid = period === 'custom' && !!customFrom && !!customTo && customFrom > customTo
  // 충전번호는 TOPUP- 뒤 4자리 이상(총 10자 이상)부터 찾아요. 더 짧으면 API를 부르지 않고 안내해요
  const topupIdTooShort =
    tab === 'TOPUP' && q.startsWith(TOPUP_PREFIX) && q.length < TOPUP_PREFIX.length + TOPUP_ID_MIN_DIGITS
  const blocked = periodInvalid || topupIdTooShort

  // 페이지는 검색 조건에 묶어 둬요. 조건이 바뀌면 같은 렌더에서 바로 1페이지가 돼요
  const filterKey = [tab, q, range.from, range.to].join('|')
  const page = pageState.key === filterKey ? pageState.page : 1
  const setPage = (next: number) => setPageState({ key: filterKey, page: next })

  const query: AdminPaymentQuery = {
    keyword: q || undefined,
    from: range.from || undefined,
    to: range.to || undefined,
    page: toPageParam(page),
    size: PAGE_SIZE,
  }
  const deps = [tab, q, range.from, range.to, page, blocked]

  // 지금 열린 탭의 API만 불러요
  const payments = useApi(() => (tab === 'PAYMENT' && !blocked ? getAdminPayments(query) : Promise.resolve(null)), deps)
  const topups = useApi(() => (tab === 'TOPUP' && !blocked ? getAdminTopups(query) : Promise.resolve(null)), deps)

  const current = tab === 'PAYMENT' ? payments : topups
  const paymentItems: AdminPayment[] = payments.data?.items ?? []
  const topupItems: AdminTopup[] = topups.data?.items ?? []
  const count = tab === 'PAYMENT' ? paymentItems.length : topupItems.length
  // 탭을 막 바꾼 직후엔 그 탭의 응답이 아직 없어요(data null). 이때는 '내역 없음'이 아니라 불러오는 중이에요
  const waiting = !blocked && !current.error && (current.loading || current.data === null)

  return {
    tab,
    setTab,
    keyword,
    setKeyword,
    period,
    setPeriod,
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    paymentItems,
    topupItems,
    copied,
    copyOrderId,
    loading: waiting && count === 0,
    busy: waiting && count > 0,
    empty: !blocked && !waiting && !current.error && count === 0,
    emptyText: keyword.trim() ? '검색 결과가 없어요.' : '이 기간에 내역이 없어요.',
    blockMessage: periodInvalid
      ? '시작일이 종료일보다 늦어요. 기간을 다시 골라 주세요.'
      : topupIdTooShort
        ? `충전번호는 앞 ${TOPUP_PREFIX.length + TOPUP_ID_MIN_DIGITS}자 이상 입력해 주세요. (예: ${TOPUP_PREFIX}1a47)`
        : '',
    error: current.error,
    reload: current.reload,
    page,
    setPage,
    totalPages: current.data?.totalPages ?? 0,
  }
}
type View = ReturnType<typeof usePaymentsView>

const TAB_ITEMS: { value: TabKey; label: string }[] = [
  { value: 'PAYMENT', label: '결제' },
  { value: 'TOPUP', label: '충전' },
]

function DateRange({ v, className }: { v: View; className?: string }) {
  if (v.period !== 'custom') return null
  return (
    <div className={`${s.dates} ${className ?? ''}`}>
      <input
        type="date"
        aria-label="시작일"
        value={v.customFrom}
        max={v.customTo || undefined}
        onChange={(e) => v.setCustomFrom(e.target.value)}
      />
      <span>~</span>
      <input
        type="date"
        aria-label="종료일"
        value={v.customTo}
        min={v.customFrom || undefined}
        onChange={(e) => v.setCustomTo(e.target.value)}
      />
    </div>
  )
}

/** 충전번호 (앞 13자, 누르면 전체 복사) */
function TopupNumber({ v, t }: { v: View; t: AdminTopup }) {
  return (
    <>
      <button
        type="button"
        className={s.copyBtn}
        title={`${t.orderId}\n누르면 전체 충전번호를 복사해요`}
        aria-label={`충전번호 ${t.orderId} 복사`}
        onClick={(e) => {
          e.stopPropagation()
          v.copyOrderId(t.topupId, t.orderId)
        }}
      >
        {orDash(t.orderId.slice(0, ORDER_ID_VIEW_LENGTH))}
      </button>
      {v.copied?.topupId === t.topupId && (
        <span role="status" className={s.copied}>
          {v.copied.ok ? '복사했어요' : '복사하지 못했어요'}
        </span>
      )}
    </>
  )
}

function ListState({ v }: { v: View }) {
  if (v.blockMessage) return <Notice tone="error">{v.blockMessage}</Notice>
  if (v.error) return <ErrorView message={v.error} onRetry={v.reload} />
  if (v.loading) return <Loading />
  return null
}

function DesktopPayments({ v }: { v: View }) {
  const isTopup = v.tab === 'TOPUP'
  return (
    <>
      <div className={c.toolbar}>
        <div className={c.toolGroup}>
          <Segment label="종류" value={v.tab} onChange={v.setTab} items={TAB_ITEMS} />
          <Segment label="기간" value={v.period} onChange={v.setPeriod} items={PERIODS} />
          <DateRange v={v} />
        </div>
        <label className={c.search}>
          <Icon name="search" size={16} />
          <input
            aria-label="주문번호, 충전번호, 회원 이메일"
            placeholder="주문번호, 충전번호, 회원 이메일"
            value={v.keyword}
            onChange={(e) => v.setKeyword(e.target.value)}
          />
        </label>
      </div>
      <div role="table" className={`${c.table} ${v.busy ? s.busy : ''}`}>
        {isTopup ? (
          <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
            <span>충전번호</span>
            <span>회원</span>
            <span>충전 일시</span>
            <span className={s.right}>충전 금액</span>
            <span>충전 상태</span>
            <span className={s.right}>남은 금액</span>
          </div>
        ) : (
          <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
            <span>주문번호</span>
            <span>회원</span>
            <span>결제 일시</span>
            <span className={s.right}>결제 금액</span>
            <span>결제 결과</span>
            <span>보관 상태</span>
          </div>
        )}
        <ListState v={v} />
        {v.empty && <div className={s.tableEmpty}>{v.emptyText}</div>}
        {!isTopup &&
          v.paymentItems.map((p) => {
            const [label, tone] = PAYMENT_STATUS[p.status] ?? [p.status, 'neutral']
            return (
              <div role="row" key={p.paymentId} className={c.tr} style={COLS}>
                <span className={`${c.ellipsis} ${c.strong}`} title={`주문 ID ${p.orderId}`}>
                  {orDash(p.orderNumber)}
                </span>
                <span className={c.ellipsis}>{orDash(p.memberEmail)}</span>
                <span className={c.num}>{fmtDateTime(p.createdAt)}</span>
                <span className={`${s.right} ${c.num}`}>{won(p.amount)}</span>
                <span title={p.failReason ?? undefined}>
                  <Badge tone={tone}>{label}</Badge>
                </span>
                <span>
                  {p.holdingStatus ? <Badge tone={HOLDING[p.holdingStatus][1]}>{HOLDING[p.holdingStatus][0]}</Badge> : '-'}
                </span>
              </div>
            )
          })}
        {isTopup &&
          v.topupItems.map((t) => {
            const [label, tone] = TOPUP_STATUS[t.status] ?? [t.status, 'neutral']
            return (
              <div role="row" key={t.topupId} className={c.tr} style={COLS}>
                <span className={c.strong}>
                  <TopupNumber v={v} t={t} />
                </span>
                <span className={c.ellipsis}>{orDash(t.memberEmail)}</span>
                <span className={c.num}>{fmtDateTime(t.createdAt)}</span>
                <span className={`${s.right} ${c.num}`}>{won(t.amount)}</span>
                <span title={t.failReason ?? undefined}>
                  <Badge tone={tone}>{label}</Badge>
                </span>
                <span className={`${s.right} ${c.num}`}>{t.status === 'DONE' ? won(t.remainingAmount) : '-'}</span>
              </div>
            )
          })}
      </div>
      <Pager page={v.page} totalPages={v.totalPages} onChange={v.setPage} />
    </>
  )
}

function MobilePayments({ v }: { v: View }) {
  const isTopup = v.tab === 'TOPUP'
  return (
    <div className={s.mBody}>
      <div className={s.mBar}>
        <div className={s.mSegment}>
          <Segment label="종류" value={v.tab} onChange={v.setTab} items={TAB_ITEMS} />
        </div>
      </div>
      <div className={s.mBar}>
        <Chips label="기간" value={v.period} onChange={v.setPeriod} items={PERIODS} />
        <DateRange v={v} className={s.mDates} />
      </div>
      <div className={s.mBar}>
        <label className={`${c.mobileSearch} ${s.flush}`}>
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label="검색"
            placeholder="주문번호, 충전번호, 회원 이메일"
            value={v.keyword}
            onChange={(e) => v.setKeyword(e.target.value)}
          />
        </label>
      </div>
      <ListState v={v} />
      {v.empty && <Empty title={v.emptyText} />}
      <ul className={`${s.mList} ${v.busy ? s.busy : ''}`}>
        {!isTopup &&
          v.paymentItems.map((p) => {
            const [label, tone] = p.holdingStatus ? HOLDING[p.holdingStatus] : (PAYMENT_STATUS[p.status] ?? [p.status, 'neutral'])
            return (
              <li key={p.paymentId} className={s.mItem}>
                <div className={s.mItemBody}>
                  <p className={s.mItemTitle}>
                    <span>{orDash(p.orderNumber)}</span>
                  </p>
                  <span className={s.mItemMeta}>
                    {orDash(p.memberEmail)} · {fmtDateTime(p.createdAt)}
                  </span>
                </div>
                <div className={s.mItemEnd}>
                  <b className={c.num}>{won(p.amount)}</b>
                  <br />
                  <Badge tone={tone}>{label}</Badge>
                </div>
              </li>
            )
          })}
        {isTopup &&
          v.topupItems.map((t) => {
            const [label, tone] = TOPUP_STATUS[t.status] ?? [t.status, 'neutral']
            return (
              <li key={t.topupId} className={s.mItem}>
                <div className={s.mItemBody}>
                  <p className={s.mItemTitle}>
                    <span>
                      <TopupNumber v={v} t={t} />
                    </span>
                  </p>
                  <span className={s.mItemMeta}>
                    {orDash(t.memberEmail)} · {fmtDateTime(t.createdAt)}
                  </span>
                </div>
                <div className={s.mItemEnd}>
                  <b className={c.num}>{won(t.amount)}</b>
                  <br />
                  <Badge tone={tone}>{label}</Badge>
                </div>
              </li>
            )
          })}
      </ul>
      <Pager page={v.page} totalPages={v.totalPages} onChange={v.setPage} />
    </div>
  )
}

/** 관리자 · 결제 조회 (조회 전용) */
export default function AdminPayments() {
  const desktop = useIsDesktop()
  const v = usePaymentsView()
  return (
    <ConsoleShell variant="admin" active="payments" title="결제 조회" actions={<Badge>조회 전용</Badge>}>
      {desktop ? <DesktopPayments v={v} /> : <MobilePayments v={v} />}
    </ConsoleShell>
  )
}
