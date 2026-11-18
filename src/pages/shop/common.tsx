/**
 * 구매자·쇼핑 화면 공통 헬퍼 (pages/shop 안에서만 써요)
 * - 상품·카테고리·인기 검색어 불러오기 (백엔드에 닿지 못하면 lib/exampleProducts 예시 데이터)
 * - 찜 상태·토글, 로그인 필요 동작
 * - 상품 카드, AI 표시, 별점
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../../lib/api'
import {
  getCategories,
  getPopularKeywords,
  getProduct,
  searchProducts,
  type CategoryNode,
  type PopularKeyword,
  type ProductDetail,
  type ProductSearchQuery,
} from '../../lib/api/product'
import { addWishlist, getWishlist, removeWishlist } from '../../lib/api/wishlist'
import { getProductRecommendations, type ProductRecommendations } from '../../lib/api/ai'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import {
  EXAMPLE_CATEGORIES,
  EXAMPLE_POPULAR_KEYWORDS,
  getExampleProduct,
  isServerUnreachable,
  searchExampleProducts,
} from '../../lib/exampleProducts'
import { productImage } from '../../lib/products'
import Icon from '../../components/ui/Icon'
import { Thumb, won } from '../../components/ui/Misc'
import styles from './common.module.css'

// ── 데이터 ───────────────────────────────────────────────

/** 상품 사진. 이미지 기능 전까지 thumbnailUrl이 없어서 상품 이름으로 예시 사진을 찾고, 없으면 회색 자리표시예요. */
export function imageOf(p: { thumbnailUrl: string | null; name: string }) {
  return p.thumbnailUrl || productImage(p.name) || null
}

/** 카테고리 트리. 서버에 닿지 못하면 예시 카테고리 */
export const loadCategories = () =>
  getCategories().catch((e) => (isServerUnreachable(e) ? EXAMPLE_CATEGORIES : Promise.reject(e)))

/** 인기 검색어를 다시 받기까지의 시간. 서버도 1분 캐시해서 더 자주 받아도 같아요. */
const POPULAR_KEYWORDS_TTL_MS = 60_000
let popularKeywordsCache: { at: number; promise: Promise<PopularKeyword[]> } | null = null

/**
 * 인기 검색어 (순위순). 홈 검색창 안내·검색 패널·상품 목록이 같이 쓰므로 1분 동안 한 번만 받아요.
 * 서버에 닿지 못하면 예시 검색어, 그 밖의 실패면 빈 목록(화면에서 숨김)이에요.
 */
export function loadPopularKeywords(): Promise<PopularKeyword[]> {
  const now = Date.now()
  if (popularKeywordsCache && now - popularKeywordsCache.at < POPULAR_KEYWORDS_TTL_MS) {
    return popularKeywordsCache.promise
  }
  const promise = getPopularKeywords().catch((e: unknown) => {
    popularKeywordsCache = null // 실패는 캐시하지 않고 다음에 다시 받아요
    return isServerUnreachable(e) ? EXAMPLE_POPULAR_KEYWORDS : []
  })
  popularKeywordsCache = { at: now, promise }
  return promise
}

/** 인기 검색어. 받기 전·실패면 빈 목록이에요. */
export function usePopularKeywords(): PopularKeyword[] {
  return useApi(loadPopularKeywords, []).data ?? []
}

/** 상품 검색. 서버에 닿지 못하면 예시 상품 (example: true) */
export const loadProducts = (query: ProductSearchQuery) =>
  searchProducts(query).then(
    (r) => ({ ...r, example: false }),
    (e) => (isServerUnreachable(e) ? { ...searchExampleProducts(query), example: true } : Promise.reject(e)),
  )

/**
 * AI 맞춤 상품 추천 (비회원·설문 전이면 personalized=false, 뷰티 최신순).
 * 서버에 닿지 못하면 예시 뷰티 상품 (example: true)
 */
export const loadRecommendations = (size: number): Promise<ProductRecommendations & { example: boolean }> =>
  getProductRecommendations(size).then(
    (r) => ({ ...r, example: false }),
    (e) => {
      if (!isServerUnreachable(e)) return Promise.reject(e)
      const beauty = EXAMPLE_CATEGORIES.find((g) => g.name === '뷰티')
      const items = searchExampleProducts({ categoryId: beauty?.categoryId, size }).items.map((p) => ({
        productId: p.productId,
        name: p.name,
        price: p.price,
        thumbnailUrl: p.thumbnailUrl,
        categoryName: '',
        reason: null,
        matchedIngredients: [],
      }))
      return { personalized: false, basis: null, items, example: true }
    },
  )

/**
 * 상품 상세.
 * - 없음·판매 중지·삭제(404-PRODUCT_NOT_FOUND)면 null
 * - 서버에 닿지 못하면 예시 상품 (example: true)
 */
export const loadProduct = (productId: number): Promise<(ProductDetail & { example: boolean }) | null> =>
  productId > 0
    ? getProduct(productId).then(
        (p) => ({ ...p, example: false }),
        (e) => {
          if (e instanceof ApiError && e.status === 404) return null
          if (isServerUnreachable(e)) {
            const p = getExampleProduct(productId)
            return p && { ...p, example: true }
          }
          throw e
        },
      )
    : Promise.resolve(null)

/** 카테고리 ID → 이름·대분류 */
export function indexCategories(tree: CategoryNode[]) {
  const byId = new Map<number, { name: string; parentId: number; parentName: string }>()
  for (const g of tree) {
    byId.set(g.categoryId, { name: g.name, parentId: g.categoryId, parentName: g.name })
    for (const c of g.children) byId.set(c.categoryId, { name: c.name, parentId: g.categoryId, parentName: g.name })
  }
  return byId
}

/** 로그인이 필요한 동작 앞에서 불러요. 비로그인이면 /login으로 보내고 false */
export function useRequireLogin() {
  const { loggedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  return useCallback(() => {
    if (loggedIn) return true
    navigate('/login', { state: { from: location.pathname + location.search } })
    return false
  }, [loggedIn, navigate, location.pathname, location.search])
}

/**
 * 찜 상태. 로그인했으면 내 찜 목록(최근 100개)을 불러와 하트를 칠하고, 토글은 바로 반영한 뒤 실패하면 되돌려요.
 * 비로그인이면 토글할 때 /login으로 보내요.
 */
export function useWishes() {
  const { loggedIn } = useAuth()
  const requireLogin = useRequireLogin()
  const [ids, setIds] = useState<Set<number>>(() => new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loggedIn) {
      setIds(new Set())
      return
    }
    let alive = true
    getWishlist({ size: 100 })
      .then((r) => alive && setIds(new Set(r.items.map((i) => i.productId))))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [loggedIn])

  const set = useCallback(
    (productId: number, on: boolean) =>
      setIds((s) => {
        if (s.has(productId) === on) return s
        const n = new Set(s)
        if (on) n.add(productId)
        else n.delete(productId)
        return n
      }),
    [],
  )

  const toggle = async (productId: number) => {
    if (!requireLogin()) return
    const on = !ids.has(productId)
    set(productId, on)
    setError('')
    try {
      await (on ? addWishlist(productId) : removeWishlist(productId))
    } catch (e) {
      set(productId, !on)
      setError(errorMessage(e))
    }
  }

  /** 상품 상세 응답의 wished처럼 서버가 알려 준 찜 여부를 반영해요. 비로그인이면 무시해요. */
  const seed = useCallback((productId: number, on: boolean) => loggedIn && set(productId, on), [loggedIn, set])

  return { has: (productId: number) => ids.has(productId), toggle, seed, error }
}

// ── 화면 조각 ─────────────────────────────────────────────

/** 제목 옆 검은 AI 표시 */
export function AiTag() {
  return <span className={styles.ai}>AI</span>
}

/** ★★★★☆ */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const n = Math.round(value)
  return (
    <span className={styles.stars} style={{ fontSize: size }} role="img" aria-label={`5점 만점에 ${value}점`}>
      {'★★★★★'.slice(0, n)}
      <span className={styles.starsOff}>{'★★★★★'.slice(0, 5 - n)}</span>
    </span>
  )
}

/** 하트 버튼 (카드 위·상세 하단) */
export function HeartButton({
  on,
  onClick,
  className,
  children,
}: {
  on: boolean
  onClick: () => void
  className?: string
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={on ? '찜 해제' : '찜하기'}
      aria-pressed={on}
      className={`${styles.heart} ${on ? styles.heartOn : ''} ${className ?? ''}`}
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
    >
      <Icon name="heart" size={20} fill={on ? 'currentColor' : 'none'} />
      {children}
    </button>
  )
}

/**
 * 가격 표시. 할인 중이면 [할인율] 할인가 + 취소선 정가, 아니면 정가만.
 * layout="stack"은 카드(정가를 아랫줄), "inline"은 상세(한 줄)
 */
export function PriceTag({
  price,
  salePrice,
  discountRate,
  layout = 'stack',
  className,
}: {
  price: number
  salePrice?: number | null
  discountRate?: number | null
  layout?: 'stack' | 'inline'
  className?: string
}) {
  if (salePrice == null) return <span className={`${styles.price} ${className ?? ''}`}>{won(price)}</span>
  return (
    <span className={`${styles.priceSale} ${layout === 'inline' ? styles.priceInline : ''}`}>
      <span className={`${styles.price} ${className ?? ''}`}>
        {discountRate != null && <span className={styles.rate}>{discountRate}%</span>}
        {won(salePrice)}
      </span>
      <s className={styles.listPrice}>
        <span className={styles.srOnly}>정가 </span>
        {won(price)}
      </s>
    </span>
  )
}

export type CardProduct = {
  productId: number
  name: string
  /** 정가 */
  price: number
  /** 할인 중이면 할인가 */
  salePrice?: number | null
  discountRate?: number | null
  thumbnailUrl: string | null
  businessName?: string
  soldOut?: boolean
  remainingStock?: number | null
  /** 상품 목록 응답에만 있어요. 없으면 카드에 별점 줄을 그리지 않아요 */
  reviewCount?: number
  averageRating?: number
}

/** 목록 2열 카드 */
export function ProductCard({
  p,
  wished,
  onWish,
  badge,
}: {
  p: CardProduct
  wished?: boolean
  onWish?: () => void
  badge?: ReactNode
}) {
  return (
    <div className={styles.card}>
      <Link to={`/product/${p.productId}`} className={styles.cardLink}>
        <span className={styles.cardImg}>
          <Thumb src={imageOf(p)} width="100%" height="100%" radius={6} />
          {badge}
          {p.remainingStock != null && !p.soldOut && <span className={styles.low}>{p.remainingStock}개 남음</span>}
          {p.soldOut && <span className={styles.soldOut}>품절</span>}
        </span>
        {p.businessName && <span className={styles.brand}>{p.businessName}</span>}
        <span className={styles.name}>{p.name}</span>
        <PriceTag price={p.price} salePrice={p.salePrice} discountRate={p.discountRate} />
        {p.reviewCount != null && <CardRating reviewCount={p.reviewCount} averageRating={p.averageRating ?? 0} />}
      </Link>
      {onWish && <HeartButton on={!!wished} onClick={onWish} className={styles.cardHeart} />}
    </div>
  )
}

/** 카드 아래 별점 줄: "★ 4.9 (312)". 리뷰가 없으면 회색 별과 "(0)"만 보여 줘요 */
function CardRating({ reviewCount, averageRating }: { reviewCount: number; averageRating: number }) {
  const none = reviewCount === 0
  const rating = averageRating.toFixed(1)
  const count = reviewCount.toLocaleString('ko-KR')
  return (
    <span className={styles.cardRating}>
      <span className={styles.srOnly}>{none ? '리뷰 없음' : `별점 ${rating}, 리뷰 ${count}개`}</span>
      <span aria-hidden="true">
        <b className={none ? styles.cardStarOff : styles.cardStar}>★</b> {none ? '(0)' : `${rating} (${count})`}
      </span>
    </span>
  )
}

/** 홈·상세의 가로 스크롤 작은 카드 */
export function MiniCard({ p, why }: { p: CardProduct; why?: string }) {
  return (
    <Link to={`/product/${p.productId}`} className={styles.mini}>
      <Thumb src={imageOf(p)} width="100%" height={148} radius={8} />
      {p.businessName && <span className={styles.brand}>{p.businessName}</span>}
      <span className={styles.name}>{p.name}</span>
      <PriceTag price={p.price} salePrice={p.salePrice} discountRate={p.discountRate} />
      {why && <span className={styles.why}>{why}</span>}
    </Link>
  )
}

/** 섹션 제목 줄 (제목 · 설명 · 오른쪽 링크) */
export function SectionHead({
  title,
  ai,
  desc,
  more,
}: {
  title: ReactNode
  ai?: boolean
  desc?: ReactNode
  more?: { to: string; label?: string }
}) {
  return (
    <div className={styles.secHead}>
      <div>
        <h2 className={styles.secTitle}>
          {title} {ai && <AiTag />}
        </h2>
        {desc && <p className={styles.secDesc}>{desc}</p>}
      </div>
      {more && (
        <Link to={more.to} className={styles.more}>
          {more.label ?? '전체보기'}
        </Link>
      )}
    </div>
  )
}

/** 예시 데이터로 보여줄 때 안내 */
export function ExampleNotice() {
  return (
    <p className={styles.example} role="status">
      서버에 연결되지 않아 예시 상품을 보여주고 있어요.
    </p>
  )
}

/** 크리에이터 동그라미 아바타 (목업) */
export function Avatar({ initial, size = 48 }: { initial: string; size?: number }) {
  return (
    <span aria-hidden="true" className={styles.avatar} style={{ width: size, height: size }}>
      {initial}
    </span>
  )
}
