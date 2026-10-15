import { useEffect, useState } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import { getAdminMember, getAdminMembers, type AdminMemberDetail, type MemberStatus } from '../lib/api/member'
import type { MemberRole } from '../lib/auth'
import { ADMIN_SELLER_STATUS, fmtDay } from '../lib/admin'
import { useApi } from '../lib/useApi'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './AdminMembers.module.css'
import AdminLayout from '../components/AdminLayout'
import Pager from '../components/Pager'

const cx = makeCx(styles)

const PAGE_SIZE = 20

const ROLE_LABEL: Record<MemberRole, string> = { USER: '구매자', SELLER: '판매자', ADMIN: '관리자' }

const ORDER_STATUS_LABEL: Record<string, string> = {
  CREATED: '결제 대기',
  PAYMENT_FAILED: '결제 실패',
  PAID: '결제 완료',
  CONFIRMED: '구매 확정',
  CANCELED: '주문 취소',
  RETURN_REQUESTED: '반품 요청',
  RETURNED: '반품 완료',
}

/** 입력이 멈춘 뒤에만 검색어를 바꾼다 (글자마다 요청하지 않도록) */
function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** 검색·필터·페이지와 선택한 회원 상세 */
function useAdminMembersView() {
  const [keyword, setKeyword] = useState('')
  const [role, setRole] = useState<MemberRole | ''>('')
  const [status, setStatus] = useState<MemberStatus | ''>('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const email = useDebounced(keyword.trim())

  // 조건이 바뀌면 첫 페이지부터 다시 고른다
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [email, role, status])

  const list = useApi(
    () =>
      getAdminMembers({
        email: email || undefined,
        role: role || undefined,
        status: status || undefined,
        page: toPageParam(page),
        size: PAGE_SIZE,
      }),
    [email, role, status, page],
  )
  const items = list.data?.items ?? []

  // 새 목록이 도착했을 때 선택한 줄이 없으면 첫 줄을 고른다.
  // 응답 기준으로 고르므로, 페이지를 바꾼 직후 남아 있는 이전 목록으로 잘못 고르지 않는다
  useEffect(() => {
    const first = list.data?.items[0]
    if (first) setSelectedId((cur) => cur ?? first.memberId)
  }, [list.data])

  useEffect(() => {
    setDetailError('')
    if (selectedId === null) return setDetail(null)
    let alive = true
    getAdminMember(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  function changePage(next: number) {
    setPage(next)
    setSelectedId(null)
  }

  return {
    keyword,
    setKeyword,
    role,
    setRole,
    status,
    setStatus,
    page,
    changePage,
    totalPages: list.data?.totalPages ?? 0,
    items,
    listError: list.error,
    listEmpty: !list.loading && !list.error && items.length === 0,
    selectedId,
    setSelectedId,
    detail,
    detailError,
  }
}

/** 관리자 · 회원 */
export default function AdminMembersPage() {
  const v = useAdminMembersView()
  const d = v.detail
  return (
    <div className={styles.page}>
      <AdminLayout active="회원" minHeight={900}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>회원</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            className={cx('in')}
            placeholder="이메일"
            aria-label="이메일로 회원 검색"
            style={{ flex: '1 1 260px' }}
            value={v.keyword}
            onChange={(e) => v.setKeyword(e.target.value)}
          />
          <select
            className={cx('in')}
            aria-label="역할"
            value={v.role}
            onChange={(e) => v.setRole(e.target.value as MemberRole | '')}
          >
            <option value="">모든 역할</option>
            <option value="USER">구매자</option>
            <option value="SELLER">판매자</option>
            <option value="ADMIN">관리자</option>
          </select>
          <select
            className={cx('in')}
            aria-label="상태"
            value={v.status}
            onChange={(e) => v.setStatus(e.target.value as MemberStatus | '')}
          >
            <option value="">모든 상태</option>
            <option value="ACTIVE">활성</option>
            <option value="DELETED">탈퇴</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <section className={cx('panel')} style={{ flex: '999 1 480px', minWidth: '0', padding: '8px 20px 12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>가입일</th>
                    <th style={{ textAlign: 'left' }}>이메일</th>
                    <th style={{ textAlign: 'left' }}>이름</th>
                    <th style={{ textAlign: 'left' }}>역할</th>
                    <th style={{ textAlign: 'left' }}>판매자 상태</th>
                    <th style={{ textAlign: 'left' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {v.listEmpty && (
                    <tr>
                      <td colSpan={6} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                        회원이 없어요.
                      </td>
                    </tr>
                  )}
                  {v.items.map((m) => {
                    const deleted = m.status === 'DELETED'
                    return (
                      <tr
                        key={m.memberId}
                        onClick={() => v.setSelectedId(m.memberId)}
                        style={{ cursor: 'pointer', ...(v.selectedId === m.memberId ? { background: '#F3F1F6' } : {}) }}
                      >
                        <td style={{ textAlign: 'left' }}>{fmtDay(m.createdAt)}</td>
                        <td style={{ textAlign: 'left' }}>{deleted ? '탈퇴한 회원' : m.email}</td>
                        <td style={{ textAlign: 'left' }}>{deleted ? '' : m.name}</td>
                        <td style={{ textAlign: 'left' }}>{ROLE_LABEL[m.role]}</td>
                        <td style={{ textAlign: 'left' }}>
                          {m.sellerStatus && (
                            <span className={cx('chip', ADMIN_SELLER_STATUS[m.sellerStatus][1])}>
                              {ADMIN_SELLER_STATUS[m.sellerStatus][2]}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'left' }}>
                          {deleted ? <span className={cx('sub')}>탈퇴</span> : '활성'}
                        </td>
                      </tr>
                    )
                  })}
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
          {(d || v.detailError) && (
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              {v.detailError && (
                <p role="alert" style={NOTICE}>
                  {v.detailError}
                </p>
              )}
              {d && (
                <>
                  <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
                    {d.status === 'DELETED' ? '탈퇴한 회원' : d.name}
                  </h2>
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
                      이메일
                    </dt>
                    <dd style={{ margin: '0' }}>{d.status === 'DELETED' ? '-' : d.email}</dd>
                    <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                      역할
                    </dt>
                    <dd style={{ margin: '0' }}>{ROLE_LABEL[d.role]}</dd>
                    <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                      판매자 상태
                    </dt>
                    <dd style={{ margin: '0' }}>{d.sellerStatus ? ADMIN_SELLER_STATUS[d.sellerStatus][2] : '-'}</dd>
                    <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                      예치금
                    </dt>
                    <dd style={{ margin: '0' }}>
                      <span className={cx('num')}>{won(d.wallet.balance)}원</span>
                    </dd>
                    <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                      구매 확정 대기
                    </dt>
                    <dd style={{ margin: '0' }}>
                      <span className={cx('num')}>{won(d.wallet.heldAmount)}원</span>
                    </dd>
                  </dl>
                  <strong style={{ fontSize: '15px', borderTop: '1px solid #E8E8ED', paddingTop: '14px' }}>
                    최근 주문
                  </strong>
                  <div
                    className={cx('num')}
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}
                  >
                    {d.recentOrders.length === 0 && <span className={cx('sub')}>최근 주문이 없어요.</span>}
                    {d.recentOrders.map((o) => (
                      <div key={o.orderId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>#{o.orderId}</span>
                        <span>
                          {won(o.totalAmount)}원 {ORDER_STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className={cx('sub')} style={{ margin: '0' }}>
                    회원 정보는 조회만 할 수 있어요.
                  </p>
                </>
              )}
            </aside>
          )}
        </div>
      </AdminLayout>
    </div>
  )
}
