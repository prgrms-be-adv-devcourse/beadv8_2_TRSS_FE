import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { logout, useAuth, type MemberRole } from '../lib/auth'
import { getMySeller, type MySeller, type SellerStatus as ApiSellerStatus } from '../lib/seller'
import { makeCx } from '../lib/ui'
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

const ROLE_LABEL: Record<MemberRole, string> = { USER: '일반 회원', SELLER: '판매자', ADMIN: '관리자' }

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

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useMyPageView({ sellerStatus }: { sellerStatus?: SellerStatus }) {
  const auth = useAuth()
  const seller = useMySeller(auth.loggedIn && !sellerStatus)
  // ?sellerStatus=… 로 들어오면 디자인 확인용으로 그 상태를 보여줘요.
  const status: SellerStatus = sellerStatus ?? seller?.status ?? '신청 전'
  const m = SELLER[status] ?? SELLER['신청 전']
  const reason = !sellerStatus && seller?.reason ? seller.reason : null
  const text = status === 'REJECTED' && reason ? `반려 사유: ${reason}` : m[2]
  const view = {
    auth,
    s: { chip: m[0], tag: m[1], text, act: m[3], href: m[4], btn: m[3] ? 'btn-p' : '', hasAct: !!m[3] },
  }
  return view
}

/** 마이페이지 */
export default function MyPagePage(props: { sellerStatus?: SellerStatus }) {
  const view = useMyPageView(props)
  const { s, auth } = view
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
              <Link to="/seller/apply" style={{ padding: '10px 12px', color: '#45454F' }}>
                판매자
              </Link>
              <Link
                to="/login"
                onClick={() => void logout()}
                style={{ padding: '10px 12px', color: '#5F5F6A', marginTop: '12px' }}
              >
                로그아웃
              </Link>
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
                  <dd style={{ margin: '0' }}>{me ? (ROLE_LABEL[me.role] ?? me.role) : '…'}</dd>
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
                      48,000원
                    </Link>{' '}
                    <span className={cx('sub')}>구매 확정 대기 72,900원</span>
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
                    <span style={{ color: '#A33A1F', fontWeight: '500' }}>1건 있어요</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>정산받지 않은 판매 금액</span>
                    <span style={{ color: '#1C6B47', fontWeight: '500' }}>없어요</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span>남은 예치금</span>
                    <span className={cx('num')} style={{ color: '#A33A1F', fontWeight: '500' }}>
                      48,000원
                    </span>
                  </li>
                </ul>
                <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                  세 항목이 모두 비어야 탈퇴할 수 있어요. 예치금은 자동으로 돌려드리지 않으니 쓰거나, 쓰지 않은 충전
                  건을 <Link to="/wallet">예치금</Link>에서 취소해 주세요. 탈퇴하면 개인정보는 복구할 수 없게 지워져요.
                </p>
                <button
                  className={cx('btn')}
                  disabled
                  style={{ alignSelf: 'flex-start', color: '#83838F', cursor: 'not-allowed' }}
                >
                  탈퇴하기
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
