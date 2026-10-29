import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../lib/api'
import { logout, memberTypeLabel, useAuth } from '../lib/auth'
import {
  canApply,
  getMySeller,
  getWithdrawalCheck,
  withdrawMember,
  type MySeller,
  type SellerStatus as ApiSellerStatus,
} from '../lib/api/member'
import { getWallet } from '../lib/api/wallet'
import { useApi } from '../lib/useApi'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './MyPage.module.css'
import BuyerHeader from '../components/BuyerHeader'

export type SellerStatus = '신청 전' | ApiSellerStatus
// [칩 색, 표시 이름, 설명, 버튼 문구, 이동 경로]
const SELLER: Record<SellerStatus, [string, string, string, string, string]> = {
  '신청 전': [
    'c-mute',
    '신청 전',
    '사업자 정보를 내면 관리자가 확인한 뒤 판매를 시작할 수 있어요.',
    '판매자 신청하기',
    '/seller/apply',
  ],
  PENDING: ['c-blue', '심사 중', '관리자가 신청 내용을 확인하고 있어요.', '', ''],
  REJECTED: [
    'c-low',
    '반려됨',
    '반려 사유: 사업자등록번호와 상호명이 맞지 않아요. 고친 뒤 다시 신청할 수 있어요.',
    '다시 신청하기',
    '/seller/apply',
  ],
  APPROVED: [
    'c-ok',
    '판매 중',
    '상품을 등록하고 주문과 정산을 관리할 수 있어요.',
    '판매자 센터로 가기',
    '/seller/products',
  ],
  WITHDRAW_REQUESTED: ['c-low', '철회 심사 중', '판매 철회를 요청했어요. 확인하는 동안 판매 기능은 잠겨요.', '', ''],
  WITHDRAWN: ['c-mute', '철회됨', '판매를 그만뒀어요. 구매는 그대로 할 수 있어요.', '다시 신청하기', '/seller/apply'],
  SANCTIONED: ['c-low', '이용 제한', '판매 활동이 제한됐어요. 다시 신청할 수 없어요.', '', ''],
}

const fmtDate = (iso?: string) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '-'
    : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 내 판매자 신청 상태를 불러와요. 신청 내역이 없으면(404) '신청 전'이에요. */
function useMySeller(enabled: boolean) {
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    getMySeller()
      .then((d) => alive && setSeller(d))
      .catch((e) => alive && setSeller(e instanceof ApiError && e.status === 404 ? null : undefined))
    return () => {
      alive = false
    }
  }, [enabled])
  return seller
}

const cx = makeCx(styles)

// 탈퇴 조건: 남아 있으면 빨강, 비었으면 초록 (시안 색)
const LEFT = { color: '#A33A1F', fontWeight: '500' }
const CLEAR = { color: '#1C6B47', fontWeight: '500' }

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useMyPageView({ sellerStatus }: { sellerStatus?: SellerStatus }) {
  const auth = useAuth()
  const seller = useMySeller(auth.loggedIn && !sellerStatus)
  // 마이페이지는 구매자·판매자만 들어와서 바로 지갑을 조회한다
  const wallet = useApi(getWallet)
  // ?sellerStatus=… 로 들어오면 디자인 확인용으로 그 상태를 보여줘요.
  const status: SellerStatus = sellerStatus ?? seller?.status ?? '신청 전'
  const m = SELLER[status] ?? SELLER['신청 전']
  const reason = !sellerStatus && seller?.reason ? seller.reason : null
  const text = status === 'REJECTED' && reason ? `반려 사유: ${reason}` : m[2]
  const view = {
    auth,
    wallet: wallet.data,
    // 탈퇴 조건 안내용 실제 판매자 상태 (디자인 확인용 ?sellerStatus와 별개)
    sellerStatus: seller?.status,
    // 사이드바 판매자 메뉴: 신청할 수 있을 때만 보인다. 판매자 상태를 불러오는 중(undefined)에는 숨겨 깜빡임을 막는다
    showSellerMenu: sellerStatus
      ? canApply(sellerStatus === '신청 전' ? null : sellerStatus)
      : seller !== undefined && canApply(seller?.status ?? null),
    s: { chip: m[0], tag: m[1], text, act: m[3], href: m[4], btn: m[3] ? 'btn-p' : '', hasAct: !!m[3] },
  }
  return view
}

/**
 * 회원 탈퇴: 조건 조회와 비밀번호 확인 패널.
 * 성공하면 홈으로 이동한 뒤 로그인 상태를 지운다 (먼저 지우면 이 화면이 로그인으로 보낸다)
 */
function useWithdrawal() {
  const navigate = useNavigate()
  const check = useApi(getWithdrawalCheck)
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    setPassword('')
    setError('')
  }

  async function submit() {
    if (!password || submitting) return
    setError('')
    setSubmitting(true)
    try {
      await withdrawMember(password)
      navigate('/', { replace: true })
      await logout().catch(() => {})
    } catch (e) {
      setError(errorMessage(e))
      // 조건이 바뀌었으면(409) 목록을 다시 불러와 남은 항목을 보여준다
      if (e instanceof ApiError && e.status === 409) check.reload()
      setSubmitting(false)
    }
  }

  return { check: check.data, open, setOpen, close, password, setPassword, submit, submitting, error }
}

/** 마이페이지 */
export default function MyPagePage(props: { sellerStatus?: SellerStatus }) {
  const view = useMyPageView(props)
  const { s, auth, wallet, sellerStatus, showSellerMenu } = view
  const w = useWithdrawal()
  const c = w.check
  // 판매자 활동(심사 중·판매 중·철회 심사 중)이면 탈퇴 불가. 표시 이름은 위 판매자 카드와 같다
  const sellerActive = !!c?.reasons.includes('SELLER_ACTIVE')
  const sellerActivityLabel = sellerStatus ? SELLER[sellerStatus][1] : '활동 중'
  const me = auth.me
  if (auth.ready && !me) return <Navigate to="/login" replace />
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="mypage" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '28px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <nav
              aria-label="마이페이지 메뉴"
              className={cx('panel')}
              style={{ flex: '1 1 200px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '2px' }}
            >
              <Link
                to="/mypage"
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#F3F1F6',
                  color: '#8A6A2C',
                  fontWeight: '700',
                  textDecoration: 'none',
                }}
              >
                내 정보
              </Link>
              <Link to="/orders" style={{ padding: '10px 12px', color: '#45454F' }}>
                주문 내역
              </Link>
              <Link to="/wallet" style={{ padding: '10px 12px', color: '#45454F' }}>
                예치금
              </Link>
              {showSellerMenu && (
                <Link to="/seller/apply" style={{ padding: '10px 12px', color: '#45454F' }}>
                  판매자
                </Link>
              )}
            </nav>
            <div style={{ flex: '999 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700' }}>내 정보</h1>
              <section className={cx('panel')} style={{ padding: '24px 28px' }}>
                <dl
                  style={{
                    margin: '0',
                    display: 'grid',
                    gridTemplateColumns: '120px 1fr',
                    gap: '14px 16px',
                    fontSize: '15px',
                  }}
                >
                  <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                    이메일
                  </dt>
                  <dd style={{ margin: '0' }}>{me?.email ?? '…'}</dd>
                  <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                    이름
                  </dt>
                  <dd style={{ margin: '0' }}>{me?.name ?? '…'}</dd>
                  <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                    회원 유형
                  </dt>
                  <dd style={{ margin: '0' }}>{me ? memberTypeLabel(me.role, sellerStatus) : '…'}</dd>
                  <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                    가입일
                  </dt>
                  <dd style={{ margin: '0' }} className={cx('num')}>
                    {fmtDate(me?.createdAt)}
                  </dd>
                  <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                    예치금
                  </dt>
                  <dd style={{ margin: '0' }} className={cx('num')}>
                    <Link to="/wallet" style={{ fontWeight: '700' }}>
                      {wallet ? `${won(wallet.balance)}원` : '…'}
                    </Link>{' '}
                    {wallet && <span className={cx('sub')}>구매 확정 대기 {won(wallet.heldAmount)}원</span>}
                  </dd>
                </dl>
              </section>
              <section
                className={cx('panel')}
                style={{
                  padding: '24px 28px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '520px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매자로 활동하기</h2>
                    <span className={cx(`chip ${s.chip}`)}>{s.tag}</span>
                  </div>
                  <p style={{ margin: '0', color: '#45454F' }}>{s.text}</p>
                </div>
                {s.hasAct && (
                  <>
                    <Link className={cx(`btn ${s.btn}`)} to={s.href}>
                      {s.act}
                    </Link>
                  </>
                )}
              </section>
              <section
                className={cx('panel')}
                style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>회원 탈퇴</h2>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: '0',
                    padding: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '15px',
                  }}
                >
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>진행 중인 주문</span>
                    <span style={c?.hasActiveOrders ? LEFT : CLEAR}>
                      {c ? (c.hasActiveOrders ? '있어요' : '없어요') : '…'}
                    </span>
                  </li>
                  {/* 판매자 정보가 있는 회원만. 판매자 정보를 불러오기 전이라도 막는 이유가 있으면 보여준다 */}
                  {(sellerStatus || c?.hasActiveSales) && (
                    <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                      <span>진행 중인 판매</span>
                      <span style={c?.hasActiveSales ? LEFT : CLEAR}>
                        {c ? (c.hasActiveSales ? '있어요' : '없어요') : '…'}
                      </span>
                    </li>
                  )}
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>정산받지 않은 판매 금액</span>
                    <span className={cx('num')} style={c && c.unsettledAmount > 0 ? LEFT : CLEAR}>
                      {c ? (c.unsettledAmount > 0 ? `${won(c.unsettledAmount)}원` : '없어요') : '…'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>남은 예치금</span>
                    <span className={cx('num')} style={c && c.balance > 0 ? LEFT : CLEAR}>
                      {c ? (c.balance > 0 ? `${won(c.balance)}원` : '없어요') : '…'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>결과 확인 중인 충전</span>
                    <span style={c?.hasPendingTopups ? LEFT : CLEAR}>
                      {c ? (c.hasPendingTopups ? '있어요' : '없어요') : '…'}
                    </span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>판매자 활동</span>
                    <span style={sellerActive ? LEFT : CLEAR}>
                      {c ? (sellerActive ? `${sellerActivityLabel}이에요` : '없어요') : '…'}
                    </span>
                  </li>
                </ul>
                <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                  모든 항목이 비어야 탈퇴할 수 있어요. 판매자로 활동 중이면 판매자 철회가 끝난 뒤, 판매한 주문이
                  남아 있으면 구매 확정과 정산이 끝난 뒤 탈퇴할 수 있어요. 충전 결과를 확인하는 중에는 탈퇴할 수 없으니
                  잠시 후 다시 확인해 주세요.
                  예치금은 자동으로 돌려드리지 않으니 쓰거나, 쓰지 않은 충전 건을 <Link to="/wallet">예치금</Link>에서
                  취소해 주세요. 탈퇴하면 개인정보는 복구할 수 없게 지워져요.
                </p>
                <button
                  className={cx('btn')}
                  disabled={!c?.withdrawable || w.open}
                  onClick={() => w.setOpen(true)}
                  style={
                    c?.withdrawable
                      ? { alignSelf: 'flex-start' }
                      : { alignSelf: 'flex-start', color: '#83838F', cursor: 'not-allowed' }
                  }
                >
                  탈퇴하기
                </button>
              </section>
              {w.open && (
                <section
                  className={cx('panel')}
                  style={{
                    padding: '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    outline: '2px solid #8A6A2C',
                  }}
                >
                  <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>정말 탈퇴할까요?</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="wd-pw" style={{ fontSize: '14px', fontWeight: '500' }}>
                      비밀번호 확인
                    </label>
                    <input
                      id="wd-pw"
                      className={cx('in')}
                      type="password"
                      autoComplete="current-password"
                      value={w.password}
                      onChange={(e) => w.setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && w.submit()}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                    탈퇴하면 개인정보는 복구할 수 없게 지워지고, 이 계정으로 다시 로그인할 수 없어요.
                  </p>
                  {w.error && (
                    <p role="alert" style={NOTICE}>
                      {w.error}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className={cx('btn')} onClick={w.close}>
                      닫기
                    </button>
                    <button className={cx('btn btn-p')} disabled={!w.password || w.submitting} onClick={w.submit}>
                      탈퇴하기
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
