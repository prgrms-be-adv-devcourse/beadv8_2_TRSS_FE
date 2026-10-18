import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { toPageParam } from '../lib/api'
import {
  getAdminPayments,
  getAdminTopups,
  type AdminPaymentQuery,
  type HoldingStatus,
  type PaymentStatus,
} from '../lib/api/payment'
import type { TopupStatus } from '../lib/api/wallet'
import { SMALL_BTN, SMALL_BTN_ON, fmtDateTime } from '../lib/admin'
import { useApi } from '../lib/useApi'
import { useDebounced } from '../lib/useDebounced'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './AdminPayments.module.css'
import AdminLayout from '../components/AdminLayout'
import Pager from '../components/Pager'

const cx = makeCx(styles)

const PAGE_SIZE = 20

type TabKey = 'PAYMENT' | 'TOPUP' | 'REFUND'

/** 탭 목록. 환불은 payment_refund가 생기면 visible만 true로 바꿔요 */
const TABS: Array<{ key: TabKey; label: string; visible: boolean }> = [
  { key: 'PAYMENT', label: '결제', visible: true },
  { key: 'TOPUP', label: '충전', visible: true },
  { key: 'REFUND', label: '환불', visible: false }, // 환불 미구현 (10/17)
]

/** 결제 상태 [칩 색, 칩 글자] */
const PAYMENT_STATUS: Record<PaymentStatus, [string, string]> = {
  PAID: ['c-ok', '결제 완료'],
  REFUNDED: ['c-blue', '환불'],
  FAILED_INSUFFICIENT_BALANCE: ['c-low', '잔액 부족'],
  FAILED_ORDER_EXPIRED: ['c-mute', '주문 만료'],
  FAILED_SYSTEM_ERROR: ['c-low', '시스템 오류'],
}

/** 충전 상태 [칩 색, 칩 글자] */
const TOPUP_STATUS: Record<TopupStatus, [string, string]> = {
  READY: ['c-mute', '결제 전'],
  PROCESSING: ['c-low', '확인 중'],
  DONE: ['c-ok', '충전 완료'],
  CANCELED: ['c-mute', '취소됨'],
  FAILED_USER_CANCEL: ['c-mute', '사용자 취소'],
  FAILED_PG_DECLINED: ['c-low', '승인 거절'],
  FAILED_AMOUNT_MISMATCH: ['c-low', '금액 불일치'],
  FAILED_EXPIRED: ['c-mute', '시간 만료'],
  FAILED_SYSTEM_ERROR: ['c-low', '시스템 오류'],
}

/** 보관 금액 상태. 실패 건은 null → '-' */
const HOLDING_LABEL: Record<HoldingStatus, string> = {
  HELD: '보관 중',
  RELEASED: '환불 완료',
  SETTLED: '정산됨',
}

type Period = '7' | '30' | 'custom'

/** Date → 'yyyy-MM-dd' (브라우저 현지 시각 = KST 기준) */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** 최근 N일 = 오늘 포함 N일 (예: 최근 7일 = 6일 전 ~ 오늘) */
const recentRange = (days: number) => {
  const to = new Date()
  const from = new Date(to.getFullYear(), to.getMonth(), to.getDate() - (days - 1))
  return { from: ymd(from), to: ymd(to) }
}

/** 값이 없으면 '-' (주문번호처럼 BE가 아직 채우지 않는 값도 FE 수정 없이 표시돼요) */
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

/** 충전번호 칸의 글자 버튼 모양 (표 글자와 같게, 점선 밑줄로 누를 수 있는 것만 표시) */
const COPY_BTN: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: '0',
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  textDecoration: 'underline dotted',
  textUnderlineOffset: '3px',
}

/** 검색·탭·기간·페이지와 탭별 목록 */
function useAdminPaymentsView() {
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
  // 충전번호는 TOPUP- 뒤 4자리 이상(총 10자 이상)부터 찾아요 (BE PR #149). 더 짧으면 API를 부르지 않고 안내해요
  const topupIdTooShort =
    tab === 'TOPUP' && q.startsWith(TOPUP_PREFIX) && q.length < TOPUP_PREFIX.length + TOPUP_ID_MIN_DIGITS
  const blocked = periodInvalid || topupIdTooShort

  // 페이지는 검색 조건에 묶어 둬요. 조건이 바뀌면 같은 렌더에서 바로 1페이지가 돼서, 이전 페이지로 요청이 한 번 더 가지 않아요
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

  // 지금 열린 탭의 API만 불러요. 다른 탭은 요청을 보내지 않아요
  const payments = useApi(() => (tab === 'PAYMENT' && !blocked ? getAdminPayments(query) : Promise.resolve(null)), deps)
  const topups = useApi(() => (tab === 'TOPUP' && !blocked ? getAdminTopups(query) : Promise.resolve(null)), deps)

  const current = tab === 'PAYMENT' ? payments : topups
  const paymentItems = payments.data?.items ?? []
  const topupItems = topups.data?.items ?? []
  const count = tab === 'PAYMENT' ? paymentItems.length : topupItems.length
  // 탭을 막 바꾼 직후엔 그 탭의 응답이 아직 없어요(data null). 이때는 '내역 없음'이 아니라 불러오는 중이에요
  const waiting = !blocked && !current.error && (current.loading || current.data === null)

  return {
    tabs: TABS.filter((t) => t.visible).map((t) => ({
      label: t.label,
      on: tab === t.key,
      pick: () => setTab(t.key),
    })),
    tab,
    keyword,
    changeKeyword: (v: string) => setKeyword(v),
    period,
    changePeriod: (v: Period) => setPeriod(v),
    customFrom,
    customTo,
    setCustomFrom,
    setCustomTo,
    periodInvalid,
    paymentItems,
    topupItems,
    copied,
    copyOrderId,
    loading: waiting && count === 0,
    empty: !blocked && !waiting && !current.error && count === 0,
    error: periodInvalid
      ? '시작일이 종료일보다 늦어요. 기간을 다시 골라 주세요.'
      : topupIdTooShort
        ? `충전번호는 앞 ${TOPUP_PREFIX.length + TOPUP_ID_MIN_DIGITS}자 이상 입력해 주세요. (예: ${TOPUP_PREFIX}1a47)`
        : current.error,
    page,
    setPage,
    totalPages: current.data?.totalPages ?? 0,
  }
}

/** 관리자 · 결제 조회 */
export default function AdminPaymentsPage() {
  const v = useAdminPaymentsView()
  const isTopup = v.tab === 'TOPUP'
  return (
    <div className={styles.page}>
      <AdminLayout active="결제 조회" minHeight={820}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>결제 조회</h1>
          <span className={cx('chip c-mute')}>조회 전용</span>
        </div>
        <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {v.tabs.map((t) => (
            <button
              key={t.label}
              role="tab"
              aria-selected={t.on}
              className={cx('btn')}
              style={t.on ? SMALL_BTN_ON : SMALL_BTN}
              onClick={t.pick}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            className={cx('in')}
            placeholder="주문번호, 충전번호, 회원 이메일"
            aria-label="검색"
            value={v.keyword}
            onChange={(e) => v.changeKeyword(e.target.value)}
            style={{ flex: '1 1 300px' }}
          />
          <select
            className={cx('in')}
            aria-label="기간"
            value={v.period}
            onChange={(e) => v.changePeriod(e.target.value as Period)}
          >
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="custom">기간 직접 고르기</option>
          </select>
          {v.period === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className={cx('in')}
                aria-label="시작일"
                value={v.customFrom}
                max={v.customTo || undefined}
                onChange={(e) => v.setCustomFrom(e.target.value)}
              />
              <span className={cx('sub')}>~</span>
              <input
                type="date"
                className={cx('in')}
                aria-label="종료일"
                value={v.customTo}
                min={v.customFrom || undefined}
                onChange={(e) => v.setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                {isTopup ? (
                  <tr>
                    <th style={{ textAlign: 'left' }}>충전일</th>
                    <th style={{ textAlign: 'left' }}>충전번호</th>
                    <th style={{ textAlign: 'left' }}>회원</th>
                    <th style={{ textAlign: 'right' }}>금액</th>
                    <th style={{ textAlign: 'left' }}>충전 상태</th>
                    <th style={{ textAlign: 'right' }}>남은 금액</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ textAlign: 'left' }}>결제일</th>
                    <th style={{ textAlign: 'left' }}>주문번호</th>
                    <th style={{ textAlign: 'left' }}>회원</th>
                    <th style={{ textAlign: 'right' }}>금액</th>
                    <th style={{ textAlign: 'left' }}>결제 상태</th>
                    <th style={{ textAlign: 'left' }}>보관 금액</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {v.loading && (
                  <tr>
                    <td colSpan={6} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      불러오는 중이에요.
                    </td>
                  </tr>
                )}
                {v.empty && (
                  <tr>
                    <td colSpan={6} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      {v.keyword.trim() ? '검색 결과가 없어요.' : '이 기간에 내역이 없어요.'}
                    </td>
                  </tr>
                )}
                {!isTopup &&
                  v.paymentItems.map((p) => {
                    const [chip, label] = PAYMENT_STATUS[p.status] ?? ['c-mute', p.status]
                    return (
                      <tr key={p.paymentId}>
                        <td style={{ textAlign: 'left' }}>{fmtDateTime(p.createdAt)}</td>
                        <td style={{ textAlign: 'left' }} title={`주문 ID ${p.orderId}`}>
                          {orDash(p.orderNumber)}
                        </td>
                        <td style={{ textAlign: 'left' }}>{orDash(p.memberEmail)}</td>
                        <td style={{ textAlign: 'right' }}>{won(p.amount)}원</td>
                        <td style={{ textAlign: 'left' }}>
                          <span className={cx('chip', chip)} title={p.failReason ?? undefined}>
                            {label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'left' }}>{p.holdingStatus ? HOLDING_LABEL[p.holdingStatus] : '-'}</td>
                      </tr>
                    )
                  })}
                {isTopup &&
                  v.topupItems.map((t) => {
                    const [chip, label] = TOPUP_STATUS[t.status] ?? ['c-mute', t.status]
                    return (
                      <tr key={t.topupId}>
                        <td style={{ textAlign: 'left' }}>{fmtDateTime(t.createdAt)}</td>
                        <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            style={COPY_BTN}
                            title={`${t.orderId}\n클릭하면 전체 충전번호를 복사해요`}
                            aria-label={`충전번호 ${t.orderId} 복사`}
                            onClick={() => v.copyOrderId(t.topupId, t.orderId)}
                          >
                            {orDash(t.orderId.slice(0, ORDER_ID_VIEW_LENGTH))}
                          </button>
                          {v.copied?.topupId === t.topupId && (
                            <span role="status" className={cx('sub')} style={{ marginLeft: '8px', fontSize: '12px' }}>
                              {v.copied.ok ? '복사했어요' : '복사하지 못했어요'}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'left' }}>{orDash(t.memberEmail)}</td>
                        <td style={{ textAlign: 'right' }}>{won(t.amount)}원</td>
                        <td style={{ textAlign: 'left' }}>
                          <span className={cx('chip', chip)} title={t.failReason ?? undefined}>
                            {label}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {t.status === 'DONE' ? `${won(t.remainingAmount)}원` : '-'}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
          {v.error && (
            <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
              {v.error}
            </p>
          )}
          <Pager page={v.page} totalPages={v.totalPages} onChange={v.setPage} buttonClassName={cx('btn')} />
        </section>
      </AdminLayout>
    </div>
  )
}
