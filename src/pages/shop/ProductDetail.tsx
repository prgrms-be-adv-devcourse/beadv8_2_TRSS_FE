import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import CartHeaderIcon from '../../components/ui/CartHeaderIcon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { errorMessage } from '../../lib/api'
import { addCartItem, getCart } from '../../lib/api/cart'
import { getProductReviews } from '../../lib/api/review'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import { recordRecentView } from '../../lib/recentViewed'
import Icon from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Overlay'
import { newIdempotencyKey } from '../../lib/api/order'
import { getSimilarProducts, matchOption } from '../../lib/api/product'
import {
  ExampleNotice,
  HeartButton,
  MiniCard,
  PriceTag,
  Stars,
  imageOf,
  loadProduct,
  useRequireLogin,
  useWishes,
} from './common'
import styles from './ProductDetail.module.css'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../../lib/shipping'

/** 비슷한 상품 개수 (GET /products/{id}/similar size 1~20) */
const SIMILAR_SIZE = 10

/** 백엔드 장바구니 최대 수량 (custom.order.cartMaxQuantity) */
const CART_MAX_QTY = 99

const fmtDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '.')
/** "2026-11-20T23:59:00" → "11.20 23:59" */
const fmtUntil = (iso: string) => `${iso.slice(5, 10).replace('-', '.')} ${iso.slice(11, 16)}`

/**
 * 상세 메뉴(상품 정보 · 리뷰)에서 그 섹션으로 스크롤만 해요.
 * 그냥 #info·#reviews 링크로 두면 누를 때마다 방문 기록이 쌓여서, 뒤로 버튼이 이전 화면 대신 앞서 누른 섹션으로 돌아가요.
 */
const scrollToSection = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
  e.preventDefault()
  // 예전 # 링크처럼 바로 그 자리로 옮겨요
  document.getElementById(id)?.scrollIntoView({ block: 'start' })
}

/** ④ 상품 상세 */
/** 상품 정보를 이 높이(px)까지만 보여 주고 접어요. 상세 이미지가 길어서 줄 수가 아니라 높이로 정해요. */
const INFO_COLLAPSED_HEIGHT = 800
/** 접힌 높이보다 이만큼은 더 길어야 접어요. 조금만 넘는데 더보기를 누르게 하지 않으려고요. */
const INFO_COLLAPSE_SLACK = 200
/** 상세 이미지 중 처음 몇 장은 바로 불러와요. 늦게 불러와지면 접을지 말지가 나중에 바뀌어서 화면이 튀어요. */
const INFO_EAGER_IMAGES = 2

/**
 * 상품 정보 (설명 · 상세 이미지 · 전성분)
 * - 전성분은 뷰티 상품에 판매자가 넣었을 때만 와요 (그 밖에는 null).
 * - 내용이 길면 INFO_COLLAPSED_HEIGHT까지만 보여 주고 "상품 정보 더보기"로 펼쳐요.
 *   이미지가 불러와지며 높이가 바뀌므로 ResizeObserver로 다시 재요.
 * - 접혀 있어도 내용은 DOM에 그대로 있어서 스크린 리더는 전부 읽을 수 있어요.
 */
function ProductInfo({
  description,
  imageUrls,
  ingredientsText,
}: {
  description: string
  imageUrls: string[]
  ingredientsText: string | null
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tall, setTall] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () => setTall(body.scrollHeight > INFO_COLLAPSED_HEIGHT + INFO_COLLAPSE_SLACK)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  const collapsed = tall && !open
  const toggle = () => {
    // 접을 때는 상품 정보 맨 위로 돌아가요. 그대로 두면 리뷰 한가운데에 남아 길을 잃어요.
    if (open) sectionRef.current?.scrollIntoView({ block: 'start' })
    setOpen((v) => !v)
  }

  return (
    <section ref={sectionRef} id="info" aria-labelledby="pi" className={styles.info}>
      <div
        id="info-body"
        className={`${styles.infoClip} ${collapsed ? styles.infoCollapsed : ''}`}
        style={collapsed ? { maxHeight: INFO_COLLAPSED_HEIGHT } : undefined}
      >
        <div ref={bodyRef}>
          <h2 id="pi">상품 설명</h2>
          <p className={styles.desc}>{description}</p>
          {imageUrls.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={styles.descImg}
              loading={i < INFO_EAGER_IMAGES ? 'eager' : 'lazy'}
            />
          ))}
          {ingredientsText && (
            <div className={styles.ingredients}>
              <h3>전성분</h3>
              <p>{ingredientsText}</p>
            </div>
          )}
        </div>
      </div>
      {tall && (
        <button
          type="button"
          className={styles.infoMore}
          aria-expanded={open}
          aria-controls="info-body"
          onClick={toggle}
        >
          {open ? '상품 정보 접기' : '상품 정보 더보기'}
          <Icon name="chevronDown" size={16} className={open ? styles.infoMoreUp : undefined} />
        </button>
      )}
    </section>
  )
}

export default function ProductDetailPage() {
  const { productId: idParam } = useParams()
  const productId = Number(idParam)
  const { me } = useAuth()
  /** 관리자는 구매할 수 없어 담기·구매 버튼을 꺼 둬요. (TRSS-54) */
  const isAdmin = me?.role === 'ADMIN'
  const requireLogin = useRequireLogin()
  const navigate = useNavigate()
  const wishes = useWishes()

  const loaded = useApi(() => loadProduct(productId), [productId])
  const product = loaded.data
  // 비슷한 상품은 보조 정보라 실패해도 상세는 그대로 보여 주고 섹션만 숨겨요.
  const similar = useApi(
    () =>
      product && !product.example ? getSimilarProducts(productId, SIMILAR_SIZE).catch(() => []) : Promise.resolve([]),
    [product],
  )
  const reviews = useApi(
    () => (product && !product.example ? getProductReviews(productId, { size: 2 }) : Promise.resolve(null)),
    [product],
  )

  const [imgIndex, setImgIndex] = useState(0)
  /** 옵션 이름마다 고른 값 (옵션 없는 상품이면 빈 목록) */
  const [picked, setPicked] = useState<string[]>([])
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState<'' | 'cart' | 'buy'>('')
  /** 바로 구매할 옵션이 장바구니에 이미 있을 때 확인창에 쓸 값 (그 항목의 지금 수량) */
  const [merge, setMerge] = useState<{ optionId: number; quantity: number; inCart: number } | null>(null)
  const [added, setAdded] = useState<number | null>(null)
  const [actionError, setActionError] = useState('')

  // 상품이 바뀌면 살 수 있는 첫 옵션을 고르고 담기 결과를 지워요.
  const seedWish = wishes.seed
  useEffect(() => {
    const first = product?.options.find((o) => !o.soldOut) ?? product?.options[0]
    setPicked(first?.values ?? [])
    if (product && !product.example) seedWish(product.productId, product.wished)
    setQty(1)
    setAdded(null)
    setActionError('')
    setImgIndex(0)
  }, [product, seedWish])

  // 최근 본 상품에 넣어요. 예시 상품은 넣지 않아요.
  const memberId = me?.memberId ?? null
  useEffect(() => {
    if (!product || product.example) return
    recordRecentView(memberId, {
      productId: product.productId,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      discountRate: product.discountRate,
      thumbnailUrl: product.thumbnailUrl,
      businessName: product.businessName,
      categoryId: product.categoryId,
    })
  }, [product, memberId])

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
          <Empty
            title="판매하지 않는 상품이에요"
            action={
              <Button to="/products" variant="outline" size="sm">
                다른 상품 보기
              </Button>
            }
          >
            판매가 끝났거나 없는 상품이에요.
          </Empty>
        )}
      </AppFrame>
    )

  const images = Array.from(new Set([imageOf(product), ...product.imageUrls].filter((x): x is string => !!x)))
  const option = matchOption(product.options, picked)
  /** 지금 고른 옵션의 단가(할인가·추가금 반영). 조합이 없으면 상품 판매가 */
  const unitPrice = option?.price ?? product.salePrice ?? product.price
  /** 남은 수량은 5개 이하일 때만 와요. 그 외에는 장바구니 최대 수량까지 고를 수 있고, 재고 초과는 담을 때 서버가 막아요. */
  const maxQty = Math.min(option?.remainingStock ?? CART_MAX_QTY, CART_MAX_QTY)
  const soldOut = product.soldOut || !option || option.soldOut
  const disabled = soldOut || !!busy || isAdmin || product.example
  const showOptions = product.optionNames.length > 0
  /** i번째 옵션에서 값 v를 고르면 될 조합 (다른 옵션은 지금 고른 값 그대로) */
  const optionWith = (i: number, v: string) =>
    matchOption(
      product.options,
      picked.map((x, j) => (j === i ? v : x)),
    )
  const valuesOf = (i: number) => Array.from(new Set(product.options.map((o) => o.values[i])))
  const reviewCount = product.reviewCount
  const averageRating = product.averageRating
  const wished = wishes.has(product.productId)
  /** 찜 수는 상세를 받은 때 값이라, 그 뒤에 이 화면에서 찜·해제한 만큼 바로 더하고 빼요 (실패해서 되돌리면 숫자도 돌아가요). */
  const wishCount = Math.max(0, product.wishCount + Number(wished) - Number(product.wished))

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
   * 바로 구매 (TRSS-332). 주문 생성 API가 장바구니 항목 id만 받아서, 장바구니에 담은 뒤 그 항목 하나만 주문서로 넘겨요.
   * 같은 옵션을 담으면 백엔드가 수량을 합치니, 이미 있으면 먼저 확인창을 띄워요. 결제가 끝나면 백엔드가 그 항목을 장바구니에서 지워요.
   */
  const buyNow = async () => {
    if (!option || disabled || !requireLogin()) return
    setBusy('buy')
    setAdded(null)
    setActionError('')
    try {
      const inCart = (await getCart()).items.find((i) => i.optionId === option.optionId)
      if (inCart) {
        setMerge({ optionId: option.optionId, quantity: qty, inCart: inCart.quantity })
        setBusy('')
        return
      }
      await goCheckout(option.optionId, qty)
    } catch (e) {
      setActionError(errorMessage(e))
      setBusy('')
    }
  }

  /** 담고 장바구니를 다시 불러 그 옵션의 항목 id를 찾아 주문서로 가요. (담기 응답에는 항목 id가 없어요) */
  const goCheckout = async (optionId: number, quantity: number) => {
    await addCartItem(optionId, quantity)
    const item = (await getCart()).items.find((i) => i.optionId === optionId)
    if (!item) {
      setActionError('장바구니에 담았는데 주문서로 넘기지 못했어요. 장바구니에서 주문해 주세요.')
      setBusy('')
      return
    }
    navigate('/checkout', { state: { cartItemIds: [item.itemId], idempotencyKey: newIdempotencyKey() } })
  }

  const confirmMerge = async () => {
    if (!merge) return
    setBusy('buy')
    setActionError('')
    try {
      await goCheckout(merge.optionId, merge.quantity)
    } catch (e) {
      setActionError(errorMessage(e))
      setBusy('')
    } finally {
      setMerge(null)
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
          <HeartButton on={wished} onClick={() => wishes.toggle(product.productId)} className={styles.wish}>
            <span className={styles.wishCount}>{wishCount.toLocaleString('ko-KR')}</span>
          </HeartButton>
          <Button variant="outline" disabled={disabled} onClick={addToCart} className={styles.buyBtn}>
            {busy === 'cart' ? '담는 중이에요' : '장바구니'}
          </Button>
          <Button disabled={disabled} onClick={buyNow} className={styles.buyBtn}>
            {busy === 'buy' ? '준비 중이에요' : '바로 구매'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader back title="상품 상세" right={<CartHeaderIcon />} />

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
        <div className={styles.ratingRow}>
          <Link to={`/product/${product.productId}/reviews`} state={{ fromProduct: true }} className={styles.rating}>
            <Stars value={averageRating} />
            <b>{averageRating.toFixed(1)}</b>
            <span className={styles.ratingCount}>리뷰 {reviewCount.toLocaleString('ko-KR')}</span>
          </Link>
          <span aria-hidden="true" className={styles.ratingSep}>
            |
          </span>
          <span>찜 {wishCount.toLocaleString('ko-KR')}</span>
        </div>
        <div className={styles.priceRow}>
          <PriceTag
            layout="inline"
            className={styles.price}
            price={product.price}
            salePrice={product.salePrice}
            discountRate={product.discountRate}
          />
          {option?.remainingStock != null && !option.soldOut && (
            <span className={styles.lowTag}>{option.remainingStock}개 남음</span>
          )}
          {product.soldOut && <span className={styles.lowTag}>품절</span>}
        </div>
        {product.salePrice != null && product.discountEndsAt && (
          <p className={styles.saleUntil}>
            <Icon name="clock" size={14} />
            {fmtUntil(product.discountEndsAt)}까지 할인
          </p>
        )}
      </section>

      <dl className={styles.ship}>
        {/* 배송비 정책은 상품 API에 없어 lib/shipping.ts 상수(백엔드 설정과 같은 값)로 안내해요 */}
        <div>
          <dt>배송비</dt>
          <dd>
            <b>{won(SHIPPING_FEE)}</b>
            <span>한 주문 {won(FREE_SHIPPING_THRESHOLD)} 이상이면 무료 · 판매자가 여럿이어도 한 번만 받아요</span>
          </dd>
        </div>
        <div>
          <dt>배송</dt>
          <dd>
            팔레트 통합 배송 · 결제 후 1~3일 안에 출발
            <span>여러 판매자 상품도 한 상자로 함께 보내요</span>
          </dd>
        </div>
      </dl>

      <section aria-label="옵션 선택" className={styles.options}>
        {showOptions &&
          product.optionNames.map((optName, i) => (
            <div key={optName} role="radiogroup" aria-label={optName} className={i > 0 ? styles.optGroup : undefined}>
              <p className={styles.optLabel}>
                {optName} <span>{picked[i]}</span>
              </p>
              <div className={styles.optList}>
                {valuesOf(i).map((v) => {
                  const o = optionWith(i, v)
                  const on = picked[i] === v
                  // 마지막 옵션에서만 품절·남은 수량·추가금을 붙여요 (앞 옵션은 뒤 옵션에 따라 달라져서)
                  const last = i === product.optionNames.length - 1
                  const note =
                    !last || !o
                      ? ''
                      : o.soldOut
                        ? ' · 품절'
                        : o.remainingStock != null
                          ? ` · ${o.remainingStock}개 남음`
                          : ''
                  const extra =
                    last && o && o.additionalPrice > 0 ? ` +${o.additionalPrice.toLocaleString('ko-KR')}` : ''
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={last && (!o || o.soldOut)}
                      className={`${styles.opt} ${on ? styles.optOn : ''}`}
                      onClick={() => {
                        setPicked((p) => p.map((x, j) => (j === i ? v : x)))
                        setQty(1)
                      }}
                    >
                      {v}
                      {extra}
                      {note}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        {showOptions && !option && <p className={styles.error}>이 조합은 판매하지 않아요. 다른 값을 골라 주세요.</p>}
        <div className={`${styles.qtyRow} ${showOptions ? styles.qtyDivided : ''}`}>
          <div className={styles.stepper}>
            <button
              type="button"
              aria-label="수량 빼기"
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
            >
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
            총 상품 금액<b>{won(unitPrice * qty)}</b>
          </p>
        </div>
        {added != null && (
          <p role="status" className={styles.added}>
            <span>장바구니에 담았어요</span>
            <Link to="/cart">장바구니 보기 ›</Link>
          </p>
        )}
        {(actionError || wishes.error) && (
          <p role="alert" className={styles.error}>
            {actionError || wishes.error}
          </p>
        )}
      </section>

      <nav aria-label="상세 메뉴" className={styles.anchors}>
        <a href="#info" aria-current="true" onClick={scrollToSection('info')}>
          상품 정보
        </a>
        <a href="#reviews" onClick={scrollToSection('reviews')}>
          리뷰 {reviewCount.toLocaleString('ko-KR')}
        </a>
      </nav>

      <ProductInfo
        description={product.description}
        imageUrls={product.imageUrls}
        ingredientsText={product.ingredientsText}
      />

      <section id="reviews" aria-labelledby="rv" className={styles.reviews}>
        <div className={styles.rvHead}>
          <h2 id="rv">
            리뷰 <span className={styles.star}>★</span> {averageRating.toFixed(1)}{' '}
            <span className={styles.rvCount}>({reviewCount})</span>
          </h2>
          <Link to={`/product/${product.productId}/reviews`} state={{ fromProduct: true }}>전체 보기 ›</Link>
        </div>
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

      {!!similar.data?.length && (
        <section aria-labelledby="sim" className={styles.similar}>
          <h2 id="sim">비슷한 상품</h2>
          <div className={styles.simRow}>
            {similar.data.map((p) => (
              <MiniCard key={p.productId} p={p} />
            ))}
          </div>
        </section>
      )}

      {merge && (
        <Modal
          title={`장바구니에 같은 상품이 ${merge.inCart}개 있어요, 함께 주문할까요?`}
          onClose={() => busy !== 'buy' && setMerge(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setMerge(null)} disabled={busy === 'buy'}>
                취소
              </Button>
              <Button onClick={confirmMerge} disabled={busy === 'buy'}>
                {busy === 'buy' ? '준비 중이에요' : '함께 주문'}
              </Button>
            </>
          }
        >
          같은 옵션은 한 줄로 합쳐져서, 함께 주문하면 {merge.inCart + merge.quantity}개를 주문해요.
        </Modal>
      )}
    </AppFrame>
  )
}
