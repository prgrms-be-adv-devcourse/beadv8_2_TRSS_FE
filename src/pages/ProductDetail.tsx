import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { makeCx, won } from '../lib/ui'
import styles from './ProductDetail.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useEffect, useState } from 'react'
import { ApiError, errorMessage } from '../lib/api'
import { getProduct, type ProductDetail } from '../lib/api/product'
import { addCartItem } from '../lib/api/cart'
import { useApi } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import { categoryIcon } from '../lib/products'
import { getExampleProduct, isServerUnreachable } from '../lib/exampleProducts'

/** 백엔드 장바구니 최대 수량 (custom.order.cartMaxQuantity) */
const CART_MAX_QTY = 99

const cx = makeCx(styles)

type Loaded = (ProductDetail & { example: boolean }) | null

/**
 * 상품을 불러와요.
 * - 없음·판매 중지·삭제(404-PRODUCT_NOT_FOUND)면 null
 * - 백엔드에 닿지 못하면 프론트 예시 상품 (lib/exampleProducts.ts)
 */
function loadProduct(productId: number): Promise<Loaded> {
  return getProduct(productId).then(
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
}

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useProductDetailView() {
  const { productId: idParam } = useParams()
  const productId = Number(idParam)
  const navigate = useNavigate()
  const location = useLocation()
  const { loggedIn } = useAuth()

  const loaded = useApi(() => (productId > 0 ? loadProduct(productId) : Promise.resolve(null)), [productId])
  const product = loaded.data

  const [optionId, setOptionId] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState<number | null>(null)
  const [addError, setAddError] = useState('')

  // 상품이 바뀌면 살 수 있는 첫 옵션을 고르고 담기 결과를 지워요.
  useEffect(() => {
    setOptionId(product?.options.find((o) => !o.soldOut)?.optionId ?? product?.options[0]?.optionId ?? null)
    setQty(1)
    setAdded(null)
    setAddError('')
  }, [product])

  const option = product?.options.find((o) => o.optionId === optionId)
  /** 남은 수량은 5개 이하일 때만 와요. 그 외에는 장바구니 최대 수량까지 고를 수 있고, 재고 초과는 담을 때 서버가 막아요. */
  const maxQty = Math.min(option?.remainingStock ?? CART_MAX_QTY, CART_MAX_QTY)
  const soldOut = !product || product.soldOut || !option || option.soldOut

  const addToCart = async () => {
    if (!product || !option || soldOut || adding) return
    if (!loggedIn) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    setAdding(true)
    setAdded(null)
    setAddError('')
    try {
      const res = await addCartItem(option.optionId, qty)
      setAdded(res.quantity)
    } catch (e) {
      setAddError(errorMessage(e))
    } finally {
      setAdding(false)
    }
  }

  const view = {
    loading: loaded.loading && !product,
    error: loaded.error,
    retry: loaded.reload,
    notFound: !loaded.loading && !loaded.error && !product,
    product,
    example: !!product?.example,
    /** 이미지 기능 전까지 thumbnailUrl이 없어서 카테고리 대표 아이콘을 보여줘요. */
    mainImg: product ? (product.thumbnailUrl ?? categoryIcon(product.categoryName, product.parentCategoryName)) : '',
    mainIsIcon: !product?.thumbnailUrl,
    gallery: product?.imageUrls ?? [],
    price: product ? won(product.price) : '',
    soldOut,
    remaining: option?.remainingStock ?? null,
    options: (product?.options ?? []).map((o) => ({
      id: o.optionId,
      name: o.name,
      on: o.optionId === optionId,
      soldOut: o.soldOut,
      note: o.soldOut ? '품절' : o.remainingStock != null ? `${o.remainingStock}개 남음` : '',
      pick: () => {
        if (o.soldOut) return
        setOptionId(o.optionId)
        setQty(1)
      },
    })),
    qty,
    canDec: qty > 1,
    canInc: !soldOut && qty < maxQty,
    dec: () => setQty((q) => Math.max(1, q - 1)),
    inc: () => setQty((q) => Math.min(maxQty, q + 1)),
    total: product ? won(product.price * qty) : '',
    addToCart,
    adding,
    added,
    addError,
    addLabel: soldOut ? '품절된 상품이에요' : adding ? '담는 중이에요' : '장바구니에 담기',
    addDisabled: soldOut || adding || !!product?.example,
  }
  return view
}

/** 상품 상세 */
export default function ProductDetailPage() {
  const view = useProductDetailView()
  const { error, loading, notFound, product, retry } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '20px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {loading && (
            <div className={cx('panel notice')} aria-live="polite">
              <span className={cx('sub')}>상품을 불러오고 있어요</span>
            </div>
          )}
          {error && (
            <div className={cx('panel notice')} role="alert">
              <strong style={{ fontSize: '17px' }}>상품을 불러오지 못했어요</strong>
              <span className={cx('sub')}>{error}</span>
              <button className={cx('btn btn-p')} onClick={retry}>
                다시 시도
              </button>
            </div>
          )}
          {notFound && (
            <div className={cx('panel notice')}>
              <strong style={{ fontSize: '17px' }}>상품을 찾을 수 없어요</strong>
              <span className={cx('sub')}>판매가 끝났거나 삭제된 상품이에요. 다른 상품을 둘러보세요.</span>
              <Link className={cx('btn btn-p')} to="/">
                상품 목록으로
              </Link>
            </div>
          )}
          {product && <ProductBody view={view} product={product} />}
        </div>
      </div>
    </div>
  )
}

type View = ReturnType<typeof useProductDetailView>

function ProductBody({ view, product }: { view: View; product: NonNullable<View['product']> }) {
  const {
    addDisabled,
    addError,
    addLabel,
    addToCart,
    added,
    canDec,
    canInc,
    dec,
    example,
    gallery,
    inc,
    mainImg,
    mainIsIcon,
    options,
    price,
    qty,
    remaining,
    soldOut,
    total,
  } = view
  return (
    <>
      <nav className={cx('sub')} aria-label="위치">
        <Link to="/" style={{ color: '#5F5F6A' }}>
          홈
        </Link>{' '}
        ›{' '}
        <Link to={`/?category=${product.parentCategoryId}`} style={{ color: '#5F5F6A' }}>
          {product.parentCategoryName}
        </Link>{' '}
        ›{' '}
        <Link to={`/?category=${product.categoryId}`} style={{ color: '#5F5F6A' }}>
          {product.categoryName}
        </Link>
      </nav>
      {example && (
        <p className={cx('example')} role="status">
          백엔드 서버에 연결되지 않아 <strong>프론트 예시 상품</strong>을 보여주고 있어요. 예시 상품은 장바구니에 담을
          수 없어요.
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 440px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
          <div className={cx('hero')}>
            <img src={mainImg} alt={product.name} className={cx(mainIsIcon ? 'hero-icon' : 'hero-img')} />
          </div>
          {gallery.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '10px' }}>
              {gallery.slice(0, 4).map((url) => (
                <div className={cx('thumb')} key={url}>
                  <img src={url} alt="" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '0' }}>
          <span style={{ fontWeight: '700', fontSize: '14px', color: '#45454F' }}>{product.businessName}</span>
          <h1
            style={{
              margin: '-8px 0 0',
              fontSize: '28px',
              lineHeight: '1.3',
              fontWeight: '700',
              letterSpacing: '-0.5px',
            }}
          >
            {product.name}
          </h1>
          <strong className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
            {price}원
          </strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {soldOut ? (
              <span className={cx('chip c-mute')}>품절</span>
            ) : (
              <span className={cx('chip c-ok')}>판매중</span>
            )}
            {!soldOut && remaining != null && <span className={cx('chip c-low')}>{remaining}개 남았어요</span>}
          </div>
          <div
            style={{
              borderTop: '1px solid #E8E8ED',
              borderBottom: '1px solid #E8E8ED',
              padding: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '500' }} id="opt-label">
                옵션
              </span>
              <div role="radiogroup" aria-labelledby="opt-label" className={cx('opts')}>
                {options.map((o) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={o.on}
                    disabled={o.soldOut}
                    className={cx('opt', o.on && 'opt-on')}
                    onClick={o.pick}
                    key={o.id}
                  >
                    {o.on && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    )}
                    {o.name}
                    {o.note && <span className={cx('sub num')}>{o.note}</span>}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <span style={{ fontWeight: '500' }}>수량</span>
              <div className={cx('step')}>
                <button onClick={dec} disabled={!canDec} aria-label="수량 줄이기">
                  −
                </button>
                <span className={cx('num')} aria-live="polite">
                  {qty}
                </span>
                <button onClick={inc} disabled={!canInc} aria-label="수량 늘리기">
                  +
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span className={cx('sub')}>총 상품 금액</span>
              <strong className={cx('num')} style={{ fontSize: '22px', fontWeight: '700' }}>
                {total}원
              </strong>
            </div>
          </div>
          <button
            className={cx('btn btn-p')}
            onClick={addToCart}
            disabled={addDisabled}
            style={{ minHeight: '56px', fontSize: '17px' }}
          >
            {addLabel}
          </button>
          {added != null && (
            <div className={cx('done')} role="status">
              <span>
                장바구니에 담았어요. 이 상품은 지금 장바구니에 <strong className={cx('num')}>{added}개</strong> 있어요.
              </span>
              <Link to="/cart" className={cx('btn')} style={{ minHeight: '36px', fontSize: '14px' }}>
                장바구니 보기
              </Link>
            </div>
          )}
          {addError && (
            <p className={cx('fail')} role="alert">
              {addError}
            </p>
          )}
          <p className={cx('sub')} style={{ margin: '0' }}>
            주문은 장바구니에서 해요. 같은 상품을 다시 담으면 수량이 합쳐져요.
          </p>
          <dl
            style={{
              margin: '0',
              display: 'grid',
              gridTemplateColumns: '96px 1fr',
              gap: '10px 16px',
              fontSize: '14px',
              background: '#fff',
              borderRadius: '6px',
              padding: '18px',
            }}
          >
            <dt className={cx('sub')} style={{ fontSize: '14px' }}>
              판매자
            </dt>
            <dd style={{ margin: '0' }}>{product.businessName}</dd>
            <dt className={cx('sub')} style={{ fontSize: '14px' }}>
              카테고리
            </dt>
            <dd style={{ margin: '0' }}>
              {product.parentCategoryName} › {product.categoryName}
            </dd>
            <dt className={cx('sub')} style={{ fontSize: '14px' }}>
              구매 확정
            </dt>
            <dd style={{ margin: '0' }}>결제 후 7일이 지나면 자동으로 확정돼요</dd>
          </dl>
        </div>
      </div>
      <section
        className={cx('panel')}
        style={{
          padding: '32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
          maxWidth: '860px',
          alignSelf: 'center',
          boxSizing: 'border-box',
        }}
      >
        <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>상품 설명</h2>
        <p style={{ margin: '0', maxWidth: '640px', whiteSpace: 'pre-line' }}>{product.description}</p>
        {gallery.map((url) => (
          <img src={url} alt="" key={url} style={{ width: '100%', borderRadius: '8px', display: 'block' }} />
        ))}
      </section>
    </>
  )
}
