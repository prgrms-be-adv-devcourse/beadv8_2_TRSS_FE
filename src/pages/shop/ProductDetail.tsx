import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { errorMessage } from '../../lib/api'
import { addCartItem, getCart, updateCartItem } from '../../lib/api/cart'
import { newIdempotencyKey } from '../../lib/api/order'
import { getProductReviews, getReviewSummary } from '../../lib/api/review'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import {
  AiTag,
  ExampleNotice,
  HeartButton,
  MiniCard,
  Stars,
  imageOf,
  loadProduct,
  loadProducts,
  useRequireLogin,
  useWishes,
} from './common'
import styles from './ProductDetail.module.css'

/** 백엔드 장바구니 최대 수량 (custom.order.cartMaxQuantity) */
const CART_MAX_QTY = 99

const fmtDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '.')

/** ④ 상품 상세 */
export default function ProductDetailPage() {
  const { productId: idParam } = useParams()
  const productId = Number(idParam)
  const navigate = useNavigate()
  const { me } = useAuth()
  /** 관리자는 구매할 수 없어 담기·구매 버튼을 꺼 둬요. (TRSS-54) */
  const isAdmin = me?.role === 'ADMIN'
  const requireLogin = useRequireLogin()
  const wishes = useWishes()

  const loaded = useApi(() => loadProduct(productId), [productId])
  const product = loaded.data
  const summary = useApi(
    () => (product && !product.example ? getReviewSummary(productId) : Promise.resolve(null)),
    [product],
  )
  const reviews = useApi(
    () => (product && !product.example ? getProductReviews(productId, { size: 2 }) : Promise.resolve(null)),
    [product],
  )
  // TODO(API 미구현): AI 비슷한 상품 추천 — 지금은 같은 소분류 상품으로 채워요
  const similar = useApi(
    () => (product ? loadProducts({ categoryId: product.categoryId, size: 6 }) : Promise.resolve(null)),
    [product],
  )

  const [imgIndex, setImgIndex] = useState(0)
  const [optionId, setOptionId] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState<'' | 'cart' | 'buy'>('')
  const [added, setAdded] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  // 상품이 바뀌면 살 수 있는 첫 옵션을 고르고 담기 결과를 지워요.
  useEffect(() => {
    setOptionId(product?.options.find((o) => !o.soldOut)?.optionId ?? product?.options[0]?.optionId ?? null)
    setQty(1)
    setAdded(null)
    setActionError('')
    setImgIndex(0)
  }, [product])

  if (loaded.loading && !product)
    return (
      <AppFrame>
        <PageHeader back title="상품 상세" />
        <Loading />
      </AppFrame>
    )
  if (loaded.error || !product)
    return (
      <AppFrame>
        <PageHeader back title="상품 상세" />
        {loaded.error ? (
          <ErrorView message={loaded.error} onRetry={loaded.reload} />
        ) : (
          <Empty title="판매하지 않는 상품이에요" action={<Button to="/products" variant="outline" size="sm">다른 상품 보기</Button>}>
            판매가 끝났거나 없는 상품이에요.
          </Empty>
        )}
      </AppFrame>
    )

  const images = Array.from(new Set([imageOf(product), ...product.imageUrls].filter((x): x is string => !!x)))
  const option = product.options.find((o) => o.optionId === optionId)
  /** 남은 수량은 5개 이하일 때만 와요. 그 외에는 장바구니 최대 수량까지 고를 수 있고, 재고 초과는 담을 때 서버가 막아요. */
  const maxQty = Math.min(option?.remainingStock ?? CART_MAX_QTY, CART_MAX_QTY)
  const soldOut = product.soldOut || !option || option.soldOut
  const disabled = soldOut || !!busy || isAdmin || product.example
  const showOptions = product.options.length > 1 || product.options[0]?.name !== '기본'
  const reviewCount = summary.data?.reviewCount ?? 0
  const wished = wishes.has(product.productId)
  const similarItems = (similar.data?.items ?? []).filter((p) => p.productId !== product.productId).slice(0, 5)

  const addToCart = async () => {
    if (!option || disabled || !requireLogin()) return
    setBusy('cart')
    setAdded(null)
    setActionError('')
    try {
      const res = await addCartItem(option.optionId, qty)
      setAdded(res.quantity)
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setBusy('')
    }
  }

  /**
   * 바로 구매: 이 옵션을 장바구니에 지금 고른 수량으로 넣고, 그 항목만 주문서로 넘겨요.
   * 이미 장바구니에 있던 옵션이면 수량을 지금 고른 수량으로 바꿔요(담기처럼 더하지 않아요).
   */
  const buyNow = async () => {
    if (!option || disabled || !requireLogin()) return
    setBusy('buy')
    setAdded(null)
    setActionError('')
    try {
      const before = await getCart()
      const existing = before.items.find((i) => i.optionId === option.optionId)
      if (existing) await updateCartItem(existing.itemId, { quantity: qty, selected: true })
      else await addCartItem(option.optionId, qty)
      const cart = existing ? before : await getCart()
      const item = cart.items.find((i) => i.optionId === option.optionId)
      if (!item) throw new Error('cart item not found')
      navigate('/checkout', {
        state: {
          cartItemIds: [item.itemId],
          expectedTotalPrice: item.price * qty,
          idempotencyKey: newIdempotencyKey(),
        },
      })
    } catch (e) {
      setActionError(errorMessage(e))
      setBusy('')
    }
  }

  return (
    <AppFrame
      bottom={
        <BottomBar
          note={
            isAdmin
              ? '관리자 계정으로는 구매할 수 없어요'
              : product.example
                ? '예시 상품은 담을 수 없어요'
                : soldOut
                  ? '품절된 상품이에요'
                  : undefined
          }
        >
          <HeartButton on={wished} onClick={() => wishes.toggle(product.productId)} className={styles.wish} />
          <Button variant="outline" disabled={disabled} onClick={addToCart}>
            {busy === 'cart' ? '담는 중이에요' : '장바구니 담기'}
          </Button>
          <Button disabled={disabled} onClick={buyNow}>
            {busy === 'buy' ? '준비 중이에요' : '바로 구매'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader back title="상품 상세" right={<HeaderIcon to="/cart" icon="bag" label="장바구니" />} />

      <div className={styles.hero}>
        <Thumb src={images[imgIndex]} alt={product.name} width="100%" height="100%" radius={0} />
        {images.length > 1 && (
          <span className={styles.counter}>
            {imgIndex + 1} / {images.length}
          </span>
        )}
      </div>
      {images.length > 1 && (
        <div className={styles.thumbs}>
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`${i + 1}번째 사진`}
              aria-pressed={i === imgIndex}
              className={`${styles.thumbBtn} ${i === imgIndex ? styles.thumbOn : ''}`}
              onClick={() => setImgIndex(i)}
            >
              <Thumb src={src} width={56} height={56} radius={6} />
            </button>
          ))}
        </div>
      )}

      {product.example && <ExampleNotice />}

      <section aria-labelledby="pname" className={styles.summary}>
        <Link to={`/products?categoryId=${product.categoryId}`} className={styles.seller}>
          <span aria-hidden="true" className={styles.sellerAvatar}>
            {product.businessName.charAt(0)}
          </span>
          <span className={styles.sellerName}>{product.businessName}</span>
          <span className={styles.sellerCat}>
            {product.parentCategoryName} › {product.categoryName}
          </span>
        </Link>
        <h2 id="pname" className={styles.name}>
          {product.name}
        </h2>
        <Link to={`/product/${product.productId}/reviews`} className={styles.rating}>
          <Stars value={summary.data?.averageRating ?? 0} />
          <b>{(summary.data?.averageRating ?? 0).toFixed(1)}</b>
          <span>리뷰 {reviewCount.toLocaleString('ko-KR')}</span>
        </Link>
        <div className={styles.priceRow}>
          <span className={styles.price}>{won(product.price)}</span>
          {option?.remainingStock != null && !option.soldOut && (
            <span className={styles.lowTag}>{option.remainingStock}개 남음</span>
          )}
          {product.soldOut && <span className={styles.lowTag}>품절</span>}
        </div>
      </section>

      <dl className={styles.ship}>
        {/* TODO(API 미구현): 배송비 정책 — 시안의 "2,500원 · 30,000원 이상 무료" 값이 API에 없어 배송 안내만 보여요 */}
        <div>
          <dt>배송</dt>
          <dd>
            팔레트 통합 배송 · 결제 후 1~3일 안에 출발
            <span>여러 판매자 상품도 한 상자로 함께 보내요</span>
          </dd>
        </div>
      </dl>

      <Link to={`/product/${product.productId}/match`} className={styles.matchLink}>
        {/* TODO(API 미구현): AI 피부 맞춤도 — 상세 안 요약은 목업이에요 */}
        <span className={styles.matchRate}>92%</span>
        <span className={styles.matchText}>
          <b>
            내 피부와 잘 맞아요 <AiTag />
          </b>
          <span>성분 · 맞춤 이유 보기</span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>

      <section aria-label="옵션 선택" className={styles.options}>
        {/* TODO(API 미구현): 상품 상세 옵션 그룹 구조 — 그룹(색상 → 사이즈)이 API에 없어 조합 목록을 한 줄로 보여줘요 */}
        {showOptions && (
          <div role="radiogroup" aria-label="옵션">
            <p className={styles.optLabel}>
              옵션 <span>{option?.name}</span>
            </p>
            <div className={styles.optList}>
              {product.options.map((o) => (
                <button
                  key={o.optionId}
                  type="button"
                  role="radio"
                  aria-checked={o.optionId === optionId}
                  disabled={o.soldOut}
                  className={`${styles.opt} ${o.optionId === optionId ? styles.optOn : ''}`}
                  onClick={() => {
                    setOptionId(o.optionId)
                    setQty(1)
                  }}
                >
                  {o.name}
                  {o.soldOut ? ' · 품절' : o.remainingStock != null ? ` · ${o.remainingStock}개 남음` : ''}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={`${styles.qtyRow} ${showOptions ? styles.qtyDivided : ''}`}>
          <div className={styles.stepper}>
            <button type="button" aria-label="수량 빼기" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <span aria-live="polite">{qty}</span>
            <button
              type="button"
              aria-label="수량 더하기"
              disabled={soldOut || qty >= maxQty}
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
            >
              +
            </button>
          </div>
          <p className={styles.total}>
            총 상품 금액<b>{won(product.price * qty)}</b>
          </p>
        </div>
        {added != null && (
          <p role="status" className={styles.added}>
            장바구니에 담았어요 · 이 옵션 {added}개 <Link to="/cart">장바구니 보기 ›</Link>
          </p>
        )}
        {(actionError || wishes.error) && (
          <p role="alert" className={styles.error}>
            {actionError || wishes.error}
          </p>
        )}
      </section>

      <nav aria-label="상세 메뉴" className={styles.anchors}>
        <a href="#info" aria-current="true">
          상품 정보
        </a>
        <a href="#reviews">리뷰 {reviewCount.toLocaleString('ko-KR')}</a>
      </nav>

      <section id="info" aria-labelledby="pi" className={styles.info}>
        <h2 id="pi">상품 설명</h2>
        <p className={styles.desc}>{product.description}</p>
        {product.imageUrls.map((src) => (
          <img key={src} src={src} alt="" className={styles.descImg} loading="lazy" />
        ))}
      </section>

      <section id="reviews" aria-labelledby="rv" className={styles.reviews}>
        <div className={styles.rvHead}>
          <h2 id="rv">
            리뷰 <span className={styles.star}>★</span> {(summary.data?.averageRating ?? 0).toFixed(1)}{' '}
            <span className={styles.rvCount}>({reviewCount})</span>
          </h2>
          <Link to={`/product/${product.productId}/reviews`}>전체 보기 ›</Link>
        </div>
        {reviewCount > 0 && (
          <div className={styles.aiSummary}>
            {/* TODO(API 미구현): AI 리뷰 요약 */}
            <p className={styles.aiTitle}>
              <AiTag /> 리뷰 요약
            </p>
            <p>리뷰를 모아 요약해 드릴 예정이에요. 지금은 예시 문구예요.</p>
          </div>
        )}
        {reviews.data?.items.map((r) => (
          <article key={r.reviewId} className={styles.review}>
            <div className={styles.rvMeta}>
              <Stars value={r.rating} size={12} />
              <span>
                {r.reviewerName} · {r.optionName} · {fmtDate(r.createdAt)}
              </span>
            </div>
            <p>{r.content}</p>
          </article>
        ))}
        {reviews.data && reviews.data.items.length === 0 && <p className={styles.noReview}>아직 리뷰가 없어요.</p>}
      </section>

      {similarItems.length > 0 && (
        <section aria-labelledby="sim" className={styles.similar}>
          <h2 id="sim">
            비슷한 상품 <AiTag />
          </h2>
          <div className={styles.simRow}>
            {similarItems.map((p) => (
              <MiniCard key={p.productId} p={p} />
            ))}
          </div>
        </section>
      )}
    </AppFrame>
  )
}
