import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { won } from '../../components/ui/Misc'
import { getMySeller, type MySeller } from '../../lib/api/member'
import { getOrders, type OrderStatus } from '../../lib/api/order'
import { getInfluencerPartnerships } from '../../lib/api/partnership'
import { getMyReviews } from '../../lib/api/review'
import { getWallet } from '../../lib/api/wallet'
import { getWishlist } from '../../lib/api/wishlist'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import { INFLUENCER_META, MOCK_PICKS, useInfluencerStatus } from '../influencer/mock'
import { notFoundAsNull, sellerMenu, SELLER_META, type SellerView } from './util'
import s from './account.module.css'

/** 내 판매자 신청 상태. 신청 내역이 없으면(404) null, 모르면 undefined */
export function useMySeller(enabled = true) {
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled) return
    let alive = true
    getMySeller()
      .then((d) => alive && setSeller(d))
      .catch((e) => alive && setSeller(notFoundAsNull(e)))
    return () => {
      alive = false
    }
  }, [enabled])
  return seller
}

/** 주문 현황 칸: [이름, 상태들, 숫자 색] */
const ORDER_CELLS: [string, OrderStatus[], string][] = [
  ['결제 대기', ['CREATED', 'PAYMENT_FAILED'], s.red],
  ['결제 완료', ['PAID'], ''],
  ['반품 요청', ['RETURN_REQUESTED'], s.green],
  ['구매 확정', ['CONFIRMED'], ''],
]

const total = (p: Promise<{ totalElements: number }>) => p.then((r) => r.totalElements).catch(() => null)

/**
 * ⑨ 마이페이지
 * 화면 확인용: ?sellerStatus=APPROVED, ?influencerStatus=APPROVED
 */
export default function MyPagePage(props: { sellerStatus?: SellerView; influencerStatus?: string }) {
  const { me } = useAuth()
  const seller = useMySeller(!props.sellerStatus)
  const sellerView: SellerView | undefined = props.sellerStatus ?? (seller === undefined ? undefined : (seller?.status ?? '신청 전'))
  const inf = useInfluencerStatus(props.influencerStatus)
  const approvedInfluencer = inf.view === 'APPROVED'

  const wallet = useApi(getWallet, [])
  const counts = useApi(
    () => Promise.all(ORDER_CELLS.map(([, statuses]) => total(getOrders({ statuses, size: 1 })))),
    [],
  )
  const wish = useApi(() => total(getWishlist({ size: 1 })), [])
  const reviews = useApi(() => total(getMyReviews({ size: 1 })), [])
  const requested = useApi(
    () => (approvedInfluencer ? total(getInfluencerPartnerships({ status: 'REQUESTED', size: 1 })) : Promise.resolve(null)),
    [approvedInfluencer],
  )

  const sm = sellerView ? sellerMenu(sellerView) : null
  const infMeta = inf.view ? INFLUENCER_META[inf.view] : null

  return (
    <AppFrame tab="my">
      <PageHeader title="마이페이지" right={<HeaderIcon to="/notifications" icon="bell" label="알림" />} />

      <div className={s.me}>
        <span aria-hidden="true" className={s.avatar}>
          {me?.name?.slice(0, 1) ?? 'P'}
        </span>
        <div className={s.meText}>
          <p className={s.meName}>{me ? `${me.name}님` : '…'}</p>
          <p className={s.meMail}>{me?.email}</p>
        </div>
        <div className={s.meActions}>
          <Button to="/mypage/profile" variant="outline" size="sm">
            내 정보
          </Button>
          {/* 메인 도착 후 LogoutOnArrive가 로그아웃해요 */}
          <Button to="/" state={{ logout: true }} variant="outline" size="sm">
            로그아웃
          </Button>
        </div>
      </div>

      <div className={s.walletWrap}>
        <div className={s.walletBar}>
          <Link to="/wallet" className={s.walletLink} aria-label="예치금 내역 보기">
            <Icon name="wallet" size={18} />
            <span className={s.walletLabel}>예치금</span>
            <span className={s.walletAmount}>{wallet.data ? won(wallet.data.balance) : '-'}</span>
          </Link>
          <Button to="/wallet/topup" size="sm">
            충전
          </Button>
        </div>
        {wallet.data && <p className={s.walletHeld}>구매 확정 대기 {won(wallet.data.heldAmount)}</p>}
      </div>

      {/* TODO(API 미구현): AI 뷰티 프로필 요약 — AI 설문 결과 API가 생기면 실제 요약으로 */}
      <Link to="/survey/result" className={s.aiCard}>
        <span className={s.aiTag}>AI</span>
        <span className={s.aiText}>
          <b>내 뷰티 프로필</b>
          <span>설문으로 피부 타입과 고민을 알려 주세요</span>
        </span>
        <span className={s.aiMore}>보기 ›</span>
      </Link>

      <section aria-labelledby="my-orders" className={s.block}>
        <div className={s.blockHead}>
          <h2 id="my-orders">주문 현황</h2>
          <Link to="/orders">전체 ›</Link>
        </div>
        <div className={s.statusGrid}>
          {ORDER_CELLS.map(([label, , tone], i) => {
            const n = counts.data?.[i]
            return (
              <Link key={label} to="/orders">
                <b className={n ? tone : ''}>{n ?? '-'}</b>
                {label}
              </Link>
            )
          })}
        </div>
      </section>

      <nav aria-label="마이페이지 메뉴" className={s.menu}>
        <Link to="/orders?tab=returns" className={s.menuItem}>
          반품 내역<span className={s.menuRight}>›</span>
        </Link>
        <Link to="/wallet" className={s.menuItem}>
          예치금 거래 내역<span className={s.menuRight}>›</span>
        </Link>
        <Link to="/wallet/topups" className={s.menuItem}>
          충전 내역 · 충전 취소<span className={s.menuRight}>›</span>
        </Link>
        <Link to="/wishlist" className={s.menuItem}>
          찜<span className={s.menuRight}>{wish.data ? `${wish.data} ` : ''}›</span>
        </Link>
        <Link to="/mypage/reviews" className={s.menuItem}>
          내 리뷰<span className={s.menuRight}>{reviews.data ? `쓴 리뷰 ${reviews.data} ` : ''}›</span>
        </Link>
        <Link to="/mypage/addresses" className={s.menuItem}>
          배송지 관리<span className={s.menuRight}>›</span>
        </Link>
        {sm && sellerView && (
          <Link to={sm.to} className={s.menuItem}>
            {sm.label}
            <span className={s.menuRight}>{SELLER_META[sellerView].tag} ›</span>
          </Link>
        )}
        {infMeta && !approvedInfluencer && (
          <Link to={inf.view === '신청 전' ? '/influencer/apply' : '/influencer/status'} className={s.menuItem}>
            {inf.view === '신청 전' ? '인플루언서 신청' : '인플루언서 신청 상태'}
            <span className={s.menuRight}>{infMeta.tag} ›</span>
          </Link>
        )}
      </nav>

      {approvedInfluencer && (
        <section aria-labelledby="inf-menu" className={s.subMenu}>
          <h2 id="inf-menu">
            인플루언서 메뉴 <span>승인된 인플루언서에게만 보여요</span>
          </h2>
          <Link to="/influencer/picks" className={s.menuItem}>
            내 pick<span className={s.menuRight}>{MOCK_PICKS.length} ›</span>
          </Link>
          <Link to="/influencer/partners" className={s.menuItem}>
            협약 · 발행받은 쿠폰
            <span className={s.menuRight}>{requested.data ? `요청 ${requested.data} ` : ''}›</span>
          </Link>
          <Link to="/influencer/status" className={s.menuItem}>
            인플루언서 상태<span className={s.menuRight}>승인됨 ›</span>
          </Link>
        </section>
      )}
    </AppFrame>
  )
}
