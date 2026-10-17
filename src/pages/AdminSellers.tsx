import { useEffect, useState, type CSSProperties } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import {
  approveSeller,
  approveSellerWithdrawal,
  getAdminSeller,
  getAdminSellers,
  rejectSeller,
  rejectSellerWithdrawal,
  sanctionSeller,
  type AdminSellerCounts,
  type AdminSellerDetail,
  type SellerStatus,
} from '../lib/api/member'
import { useApi } from '../lib/useApi'
import { ADMIN_SELLER_STATUS, SMALL_BTN, SMALL_BTN_ON, fmtDay } from '../lib/admin'
import { NOTICE, makeCx, phone } from '../lib/ui'
import styles from './AdminSellers.module.css'
import AdminLayout from '../components/AdminLayout'
import Pager from '../components/Pager'

const cx = makeCx(styles)

const PAGE_SIZE = 20

// ALL = 상태 필터 없이 전체
type Tab = SellerStatus | 'ALL'
const TABS: Tab[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'WITHDRAW_REQUESTED', 'WITHDRAWN', 'SANCTIONED']
// 탭별 건수 응답의 필드
const COUNT_KEY: Record<Tab, keyof AdminSellerCounts> = {
  ALL: 'all',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAW_REQUESTED: 'withdrawRequested',
  WITHDRAWN: 'withdrawn',
  SANCTIONED: 'sanctioned',
}

// .btn에는 비활성 스타일이 없어 판매자 정보 화면의 꺼진 버튼과 같은 모양을 쓴다
const OFF: CSSProperties = { color: '#83838F', cursor: 'not-allowed' }

/** 1234567890 → 123-45-67890 */
const fmtBusinessNumber = (n: string | null) =>
  n && /^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}` : (n ?? '-')

type Action = 'approve' | 'reject' | 'withdrawalApprove' | 'withdrawalReject' | 'sanction'

/** 상태별로 할 수 있는 동작 */
const ALLOWED: Record<Action, SellerStatus[]> = {
  approve: ['PENDING'],
  reject: ['PENDING'],
  withdrawalApprove: ['WITHDRAW_REQUESTED'],
  withdrawalReject: ['WITHDRAW_REQUESTED'],
  sanction: ['APPROVED', 'WITHDRAW_REQUESTED'],
}
const NEEDS_REASON: Action[] = ['reject', 'withdrawalReject', 'sanction']

/** 목록(탭·페이지)과 선택한 판매자 상세, 심사 동작 */
function useAdminSellersView() {
  const [tab, setTab] = useState<Tab>('PENDING')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminSellerDetail | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const list = useApi(
    () => getAdminSellers({ status: tab === 'ALL' ? undefined : tab, page: toPageParam(page), size: PAGE_SIZE }),
    [tab, page],
  )
  const items = list.data?.sellers.items ?? []
  const totalPages = list.data?.sellers.totalPages ?? 0
  const counts = list.data?.counts

  // 새 목록이 도착했을 때 선택한 줄이 없으면 첫 줄을 고른다.
  // 응답 기준으로 고르므로, 페이지를 바꾼 직후 남아 있는 이전 목록으로 잘못 고르지 않는다
  useEffect(() => {
    const first = list.data?.sellers.items[0]
    if (first) setSelectedId((cur) => cur ?? first.sellerId)
  }, [list.data])

  useEffect(() => {
    setReason('')
    setActionError('')
    if (selectedId === null) return setDetail(null)
    let alive = true
    getAdminSeller(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setActionError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  function changeTab(next: Tab) {
    setTab(next)
    setPage(1)
    setSelectedId(null)
  }

  function changePage(next: number) {
    setPage(next)
    setSelectedId(null)
  }

  const can = (action: Action) => !!detail && ALLOWED[action].includes(detail.status) && !busy

  async function run(action: Action) {
    if (!detail || !can(action)) return
    const r = reason.trim()
    if (NEEDS_REASON.includes(action) && !r) return setActionError('사유를 입력해 주세요.')
    const id = detail.sellerId
    setActionError('')
    setBusy(true)
    try {
      const calls: Record<Action, () => Promise<AdminSellerDetail>> = {
        approve: () => approveSeller(id),
        reject: () => rejectSeller(id, r),
        withdrawalApprove: () => approveSellerWithdrawal(id),
        withdrawalReject: () => rejectSellerWithdrawal(id, r),
        sanction: () => sanctionSeller(id, r),
      }
      setDetail(await calls[action]())
      setReason('')
      list.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return {
    tab,
    changeTab,
    page,
    changePage,
    totalPages,
    items,
    counts,
    listError: list.error,
    listEmpty: !list.loading && !list.error && items.length === 0,
    selectedId,
    setSelectedId,
    detail,
    reason,
    setReason,
    can,
    run,
    actionError,
  }
}

/** 관리자 · 판매자 심사 */
export default function AdminSellersPage() {
  const v = useAdminSellersView()
  const d = v.detail
  return (
    <div className={styles.page}>
      <AdminLayout active="판매자 심사" minHeight={1000}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>판매자 심사</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {TABS.map((s) => (
            <button
              key={s}
              className={cx('btn')}
              style={v.tab === s ? SMALL_BTN_ON : SMALL_BTN}
              onClick={() => v.changeTab(s)}
            >
              {s === 'ALL' ? '전체' : ADMIN_SELLER_STATUS[s][0]}
              {v.counts && ` ${v.counts[COUNT_KEY[s]]}`}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <section className={cx('panel')} style={{ flex: '999 1 480px', minWidth: '0', padding: '8px 20px 12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>신청일</th>
                    <th style={{ textAlign: 'left' }}>상호명</th>
                    <th style={{ textAlign: 'left' }}>사업자번호</th>
                    <th style={{ textAlign: 'left' }}>신청자</th>
                    <th style={{ textAlign: 'left' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {v.listEmpty && (
                    <tr>
                      <td colSpan={5} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                        판매자가 없어요.
                      </td>
                    </tr>
                  )}
                  {v.items.map((s) => (
                    <tr
                      key={s.sellerId}
                      onClick={() => v.setSelectedId(s.sellerId)}
                      style={{ cursor: 'pointer', ...(v.selectedId === s.sellerId ? { background: '#F3F1F6' } : {}) }}
                    >
                      <td style={{ textAlign: 'left' }}>{fmtDay(s.appliedAt)}</td>
                      <td style={{ textAlign: 'left' }}>{s.businessName}</td>
                      <td style={{ textAlign: 'left' }}>{fmtBusinessNumber(s.businessNumber)}</td>
                      <td style={{ textAlign: 'left' }}>{s.email}</td>
                      <td style={{ textAlign: 'left' }}>
                        <span className={cx('chip', ADMIN_SELLER_STATUS[s.status][1])}>
                          {ADMIN_SELLER_STATUS[s.status][2]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {v.listError && (
              <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
                {v.listError}
              </p>
            )}
            <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} buttonClassName={cx('btn')} />
          </section>
          {d && (
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>{d.businessName}</h2>
              <dl
                style={{
                  margin: '0',
                  display: 'grid',
                  gridTemplateColumns: '110px 1fr',
                  gap: '10px 12px',
                  fontSize: '14px',
                }}
              >
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  사업자번호
                </dt>
                <dd style={{ margin: '0' }}>
                  <span className={cx('num')}>{fmtBusinessNumber(d.businessNumber)}</span>
                </dd>
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  휴대폰
                </dt>
                <dd style={{ margin: '0' }}>
                  <span className={cx('num')}>{phone(d.phoneNumber)}</span>
                </dd>
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  정산 계좌
                </dt>
                <dd style={{ margin: '0' }}>
                  {d.bankName} 끝자리 {d.accountNumber.slice(-4)}
                </dd>
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  신청자
                </dt>
                <dd style={{ margin: '0' }}>{d.email}</dd>
              </dl>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="rj" style={{ fontSize: '14px', fontWeight: '500' }}>
                  사유 (반려·철회 거절·제재할 때 필수)
                </label>
                <textarea
                  id="rj"
                  className={cx('in')}
                  style={{ minHeight: '72px', padding: '10px 12px' }}
                  maxLength={255}
                  value={v.reason}
                  onChange={(e) => v.setReason(e.target.value)}
                ></textarea>
              </div>
              {v.actionError && (
                <p role="alert" style={NOTICE}>
                  {v.actionError}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className={cx('btn')}
                  style={{ flex: '1', ...(v.can('reject') ? {} : OFF) }}
                  disabled={!v.can('reject')}
                  onClick={() => v.run('reject')}
                >
                  반려하기
                </button>
                <button
                  className={cx('btn btn-p')}
                  style={{ flex: '1' }}
                  disabled={!v.can('approve')}
                  onClick={() => v.run('approve')}
                >
                  승인하기
                </button>
              </div>
              <p className={cx('sub')} style={{ margin: '0' }}>
                승인하면 이 계정에 판매자 권한이 생겨요.
              </p>
              <div
                style={{
                  borderTop: '1px solid #E8E8ED',
                  paddingTop: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <strong style={{ fontSize: '15px' }}>승인된 판매자일 때</strong>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    className={cx('btn')}
                    style={v.can('withdrawalApprove') ? SMALL_BTN : { ...SMALL_BTN, ...OFF }}
                    disabled={!v.can('withdrawalApprove')}
                    onClick={() => v.run('withdrawalApprove')}
                  >
                    철회 승인
                  </button>
                  <button
                    className={cx('btn')}
                    style={v.can('withdrawalReject') ? SMALL_BTN : { ...SMALL_BTN, ...OFF }}
                    disabled={!v.can('withdrawalReject')}
                    onClick={() => v.run('withdrawalReject')}
                  >
                    철회 거절
                  </button>
                  <button
                    className={cx('btn')}
                    style={
                      v.can('sanction')
                        ? { ...SMALL_BTN, borderColor: '#C2410C', color: '#A33A1F' }
                        : { ...SMALL_BTN, ...OFF }
                    }
                    disabled={!v.can('sanction')}
                    onClick={() => v.run('sanction')}
                  >
                    제재하기
                  </button>
                </div>
                <p className={cx('sub')} style={{ margin: '0' }}>
                  제재하면 바로 판매가 철회되고, 결제 대기 주문 취소와 모든 상품 판매 중지, 정산 보류까지 함께 처리돼요.
                  사유를 꼭 남겨요.
                </p>
              </div>
            </aside>
          )}
        </div>
      </AdminLayout>
    </div>
  )
}
