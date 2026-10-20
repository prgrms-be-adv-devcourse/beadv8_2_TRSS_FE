import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import styles from './BuyerHeader.module.css'
import { useAuth } from '../lib/auth'
import { getCart } from '../lib/api/cart'
import { useApi } from '../lib/useApi'
import CategoryMenu from './CategoryMenu'

type Props = {
  /** 지금 보고 있는 메뉴 */
  active?: 'wallet' | 'cart' | 'orders' | 'mypage'
  /** 장바구니 배지 숫자. 넘기지 않으면 헤더가 장바구니를 직접 불러와요. */
  cartCount?: number
  /** 값이 바뀌면 장바구니를 다시 불러와요. (예: 장바구니에 담은 뒤) */
  cartVersion?: number
  /** 검색창과 카테고리 줄이 없는 간단한 헤더 (상품 목록에서 사용) */
  compact?: boolean
}

/** 마지막으로 본 장바구니 개수. 화면을 옮겨 헤더가 새로 불러오는 동안 배지가 사라지지 않게 해요. */
let lastCartCount: number | undefined

/** 구매자 화면 공통 헤더 */
export default function BuyerHeader({ active, cartCount, cartVersion = 0, compact = false }: Props) {
  const { ready, loggedIn, me } = useAuth()
  // 관리자는 구매를 하지 않으므로 예치금·장바구니·주문내역을 숨기고, 마이페이지 대신 관리자 페이지(판매자 심사)로 보낸다
  const isAdmin = me?.role === 'ADMIN'
  const fetchCart = loggedIn && !isAdmin && cartCount === undefined
  const cart = useApi(() => (fetchCart ? getCart() : Promise.resolve(null)), [fetchCart, cartVersion])
  // 배지는 장바구니 화면과 같은 기준인 담긴 항목 수
  const loaded = cartCount ?? cart.data?.items.length
  if (!loggedIn || isAdmin) lastCartCount = undefined
  else if (loaded !== undefined) lastCartCount = loaded
  const badge = loaded ?? lastCartCount

  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [keyword, setKeyword] = useState(() => params.get('q') ?? '')
  const search = (e: FormEvent) => {
    e.preventDefault()
    const q = keyword.trim()
    navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')
  }
  const current = (key: Props['active']) => (active === key ? ({ 'aria-current': 'page' } as const) : {})
  return (
    <header className={`${styles.header} ${compact ? styles.compact : ''}`}>
      <div className={styles.bar}>
        <Link to="/" aria-label="팔레트 홈" className={styles.logo}>
          <img src="/images/logo.png" alt="Palette" width={199} height={68} />
        </Link>
        {!compact && (
          <form role="search" onSubmit={search} className={styles.searchForm}>
            <label className={styles.search}>
              <span className={styles.searchIcon}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
              </span>
              <input
                aria-label="상품 검색"
                placeholder="상품명으로 찾기"
                maxLength={100}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
          </form>
        )}
        {ready && !loggedIn && (
          <nav aria-label="회원 메뉴" className={styles.menu}>
            <Link to="/login" className={styles.textLink}>
              로그인
            </Link>
            <span aria-hidden="true" className={styles.menuDivider} />
            <Link to="/signup" className={styles.textLink}>
              회원가입
            </Link>
          </nav>
        )}
        {loggedIn && (
          <nav aria-label="내 메뉴" className={styles.menu}>
            {!isAdmin && (
              <>
                <Link
                  to="/wallet"
                  aria-label="예치금 내역"
                  {...current('wallet')}
                  className={`${styles.iconLink} ${active === 'wallet' ? styles.iconLinkOn : ''}`}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 6.5V6a2 2 0 0 1 2-2h10" />
                    <rect x="2.5" y="6.5" width="19" height="13" rx="2.5" />
                    <path d="M21.5 10.5H18a2 2 0 0 0 0 4h3.5" />
                  </svg>
                </Link>
                <Link
                  to="/cart"
                  aria-label={badge === undefined ? '장바구니' : `장바구니 ${badge}개`}
                  {...current('cart')}
                  className={styles.cart}
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3 4h2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2" />
                    <circle cx="9.5" cy="20" r="1.3" />
                    <circle cx="17" cy="20" r="1.3" />
                  </svg>
                  {badge !== undefined && <span className={styles.badge}>{badge}</span>}
                </Link>
                <Link
                  to="/orders"
                  {...current('orders')}
                  className={`${styles.textLink} ${active === 'orders' ? styles.textLinkOn : ''}`}
                >
                  주문내역
                </Link>
              </>
            )}
            <Link
              to={isAdmin ? '/admin/sellers' : '/mypage'}
              {...current('mypage')}
              className={`${styles.textLink} ${active === 'mypage' ? styles.textLinkOn : ''}`}
            >
              {isAdmin ? '관리자 페이지' : '마이페이지'}
            </Link>
            <Link to="/" state={{ logout: true }} className={styles.textLink}>
              로그아웃
            </Link>
          </nav>
        )}
      </div>
      {!compact && (
        <nav aria-label="카테고리" className={styles.categories}>
          <div className={styles.categoryRow}>
            <CategoryMenu />
            <Link to="/?sort=LATEST" className={styles.group}>
              신상품
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
