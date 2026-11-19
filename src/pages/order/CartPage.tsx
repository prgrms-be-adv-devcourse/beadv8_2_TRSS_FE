import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import PageHeader from '../../components/ui/PageHeader'
import {
  addCartItem,
  deleteCartItems,
  getCart,
  selectAllCartItems,
  updateCartItem,
  type Cart,
  type CartItem,
  type UnorderableReason,
} from '../../lib/api/cart'
import { newIdempotencyKey } from '../../lib/api/order'
import { getProduct, matchOption, type ProductOption } from '../../lib/api/product'
import { getWallet } from '../../lib/api/wallet'
import { cartNotice } from '../../lib/notices/order'
import { productImage } from '../../lib/products'
import { useApi } from '../../lib/useApi'
import { NoticeModal, type Notice } from './common'
import styles from './Cart.module.css'
import { remainingForFreeShipping, shippingFeeFor } from '../../lib/shipping'

/** 백엔드 custom.order.cartMaxQuantity */
const MAX_QTY = 99

/** 주문할 수 없는 사유별 안내 문구 */
const REASON: Record<UnorderableReason, string> = {
  PRODUCT_DELETED: '판매하지 않는 상품이에요',
  OPTION_DELETED: '판매하지 않는 옵션이에요',
  PRODUCT_STOPPED: '판매가 중지된 상품이에요',
  CATEGORY_INACTIVE: '지금은 판매하지 않는 상품이에요',
  SOLD_OUT: '품절되어 주문할 수 없어요',
  STOCK_INSUFFICIENT: '남은 재고보다 많이 담았어요. 수량을 줄여 주세요',
  IN_PENDING_ORDER: '결제를 기다리는 주문에 들어 있어요',
}

/** 수량을 줄이면 다시 주문할 수 있는 사유 */
const fixable = (r: UnorderableReason | null) => r === 'STOCK_INSUFFICIENT'

/** 선택한 항목 기준으로 개수·합계를 다시 계산해요. (서버 응답을 기다리는 동안 화면에 먼저 반영) */
function recalc(items: CartItem[]): Cart {
  const selected = items.filter((i) => i.selected)
  const expectedTotalPrice = selected.filter((i) => i.orderable).reduce((s, i) => s + i.lineAmount, 0)
  const shippingFee = shippingFeeFor(expectedTotalPrice)
  return {
    items,
    selectedCount: selected.length,
    expectedTotalPrice,
    orderable: selected.length > 0 && selected.every((i) => i.orderable),
    shippingFee,
    expectedPayAmount: expectedTotalPrice + shippingFee,
    remainingForFreeShipping: remainingForFreeShipping(expectedTotalPrice),
  }
}

/** 장바구니 (시안 ⑤ Cart · ⑤-1 CartOptionSheet) */
export default function CartPage() {
  const navigate = useNavigate()
  const { data: cart, setData: setCart, loading, error, reload } = useApi(getCart)
  const wallet = useApi(getWallet)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [optionFor, setOptionFor] = useState<CartItem | null>(null)

  /**
   * 화면을 먼저 바꾸고 API를 부른 뒤, 서버 기준 값으로 다시 불러와요.
   * 실패하면 안내 모달을 띄워요. name은 모달 문구에 넣을 상품 이름이에요.
   */
  async function run(call: () => Promise<unknown>, optimistic?: (items: CartItem[]) => CartItem[], name?: string) {
    if (optimistic && cart) setCart(recalc(optimistic(cart.items)))
    try {
      await call()
    } catch (e) {
      setNotice(cartNotice(e, { name }))
    }
    reload()
  }

  const items = cart?.items ?? []
  // 주문할 수 없는 항목은 선택돼 있어도 체크를 꺼서 보여주고 주문·합계에서 빼요.
  const orderableItems = items.filter((i) => i.orderable)
  const targets = orderableItems.filter((i) => i.selected)
  /** 상품 금액 합계 (배송비 제외) — 주문 생성 때 expectedTotalPrice로 보내요 */
  const sum = cart?.expectedTotalPrice ?? 0
  const shipping = cart?.shippingFee ?? 0
  /** 결제 예정 금액 (배송비 포함, 쿠폰 할인 전) */
  const payTotal = cart?.expectedPayAmount ?? sum + shipping
  const toFree = cart?.remainingForFreeShipping ?? 0
  const balance = wallet.data?.balance ?? 0
  const allOn = orderableItems.length > 0 && targets.length === orderableItems.length

  const changeQty = (b: CartItem, next: number, name: string) => {
    const q = Math.max(1, Math.min(MAX_QTY, next))
    if (q === b.quantity) return
    run(
      () => updateCartItem(b.itemId, { quantity: q }),
      (list) => list.map((i) => (i.itemId === b.itemId ? { ...i, quantity: q, lineAmount: i.price * q } : i)),
      name,
    )
  }

  /**
   * 옵션 변경 시트의 "변경하기". 옵션을 바꾸는 API가 없어서 새 옵션을 담고(같은 옵션이 있으면 수량이 합쳐져요)
   * 성공하면 기존 항목을 지워요. 옵션이 그대로면 수량만 바꿔요.
   */
  const applyOption = async (target: CartItem, next: ProductOption | null, qty: number) => {
    const name = target.productName ?? ''
    if (!next || next.optionId === target.optionId) {
      changeQty(target, qty, name)
      return
    }
    try {
      await addCartItem(next.optionId, qty)
    } catch (e) {
      setNotice(cartNotice(e, { name }))
      reload()
      return
    }
    try {
      await deleteCartItems([target.itemId])
    } catch {
      setNotice({
        title: '옵션을 다 바꾸지 못했어요',
        body: `${next.name} 옵션은 담았지만 원래 담긴 ${target.optionName ?? '옵션'}을 지우지 못했어요. 장바구니에서 직접 지워 주세요.`,
        actions: [{ label: '확인', primary: true }],
      })
    }
    reload()
  }

  const toggleAll = () => {
    const v = !allOn
    run(
      () => selectAllCartItems(v),
      (list) => list.map((i) => ({ ...i, selected: v })),
    )
  }

  const removeSelected = () => {
    const ids = targets.map((i) => i.itemId)
    if (!ids.length) return
    run(
      () => deleteCartItems(ids),
      (list) => list.filter((i) => !ids.includes(i.itemId)),
    )
  }

  /**
   * 주문서로 선택한 항목과 예상 금액을 넘겨요. 주문 생성(POST /api/v1/orders)은 주문서에서 해요.
   * 멱등 키는 여기서 한 번 만들어 넘겨서, 주문서를 새로고침하거나 다시 시도해도 같은 키로 보내요.
   */
  const order = () => {
    if (!targets.length) return
    navigate('/checkout', {
      state: {
        cartItemIds: targets.map((i) => i.itemId),
        expectedTotalPrice: sum,
        idempotencyKey: newIdempotencyKey(),
      },
    })
  }

  const bottom =
    items.length > 0 ? (
      <BottomBar>
        <Button size="lg" onClick={order} disabled={targets.length === 0}>
          {targets.length ? `${won(payTotal)} 주문하기` : '주문할 상품을 골라 주세요'}
        </Button>
      </BottomBar>
    ) : undefined

  return (
    <AppFrame tab="cart" bottom={bottom}>
      <PageHeader title="장바구니" />
      {loading && !cart && <Loading label="장바구니를 불러오고 있어요" />}
      {error && !cart && <ErrorView message={error} onRetry={reload} />}
      {cart && items.length === 0 && (
        <Empty
          title="장바구니가 비어 있어요"
          action={
            <Button to="/" variant="outline">
              상품 보러 가기
            </Button>
          }
        >
          마음에 드는 상품을 담아 한 번에 주문해 보세요.
        </Empty>
      )}
      {items.length > 0 && (
        <>
          <div className={styles.selectBar}>
            <label className={styles.allCheck}>
              <input type="checkbox" checked={allOn} onChange={toggleAll} disabled={!orderableItems.length} />
              전체 선택 ({targets.length}/{orderableItems.length})
            </label>
            <button type="button" className={styles.textBtn} onClick={removeSelected} disabled={!targets.length}>
              선택 삭제
            </button>
          </div>
          <ul className={styles.list}>
            {items.map((b) => {
              const reason = b.unorderableReason
              const locked = !b.orderable && !fixable(reason)
              const gone = locked && reason !== 'IN_PENDING_ORDER'
              const name = b.productName ?? '판매하지 않는 상품'
              const option = b.optionName ?? ''
              return (
                <li key={b.itemId} className={`${styles.item} ${gone ? styles.gone : ''}`}>
                  <input
                    type="checkbox"
                    className={styles.check}
                    checked={b.orderable && b.selected}
                    disabled={!b.orderable}
                    aria-label={`${name} 선택`}
                    onChange={() =>
                      run(
                        () => updateCartItem(b.itemId, { selected: !b.selected }),
                        (list) => list.map((i) => (i.itemId === b.itemId ? { ...i, selected: !i.selected } : i)),
                        name,
                      )
                    }
                  />
                  <Thumb src={b.thumbnailUrl || productImage(name)} width={76} height={88} className={styles.thumb} />
                  <div className={styles.info}>
                    <div className={styles.head}>
                      <div className={styles.names}>
                        {b.sellerName && <p className={styles.brand}>{b.sellerName}</p>}
                        {b.productId ? (
                          <Link to={`/product/${b.productId}`} className={styles.name}>
                            {name}
                          </Link>
                        ) : (
                          <p className={styles.name}>{name}</p>
                        )}
                        <p className={styles.opt}>{option || '옵션 없음'}</p>
                        {/* 삭제된 상품(productId 없음)은 옵션을 불러올 수 없어 버튼을 숨겨요. 이유는 아래 사유 문구로 보여요 */}
                        {!locked && option && b.productId != null && (
                          <button type="button" className={styles.optBtn} onClick={() => setOptionFor(b)}>
                            옵션 변경
                          </button>
                        )}
                        {reason === 'IN_PENDING_ORDER' && (
                          <p className={styles.reasonBlue}>
                            {REASON[reason]} · <Link to="/orders">주문 내역에서 결제하기</Link>
                          </p>
                        )}
                        {reason && reason !== 'IN_PENDING_ORDER' && (
                          <p className={fixable(reason) ? styles.reasonRed : styles.reasonMute}>{REASON[reason]}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={`${name} 삭제`}
                        onClick={() =>
                          run(
                            () => deleteCartItems([b.itemId]),
                            (list) => list.filter((i) => i.itemId !== b.itemId),
                            name,
                          )
                        }
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </div>
                    <div className={styles.foot}>
                      {!locked ? (
                        <div className={styles.stepper}>
                          <button
                            type="button"
                            aria-label="수량 빼기"
                            onClick={() => changeQty(b, b.quantity - 1, name)}
                            disabled={b.quantity <= 1}
                          >
                            −
                          </button>
                          <span>{b.quantity}</span>
                          <button
                            type="button"
                            aria-label="수량 더하기"
                            onClick={() => changeQty(b, b.quantity + 1, name)}
                            disabled={b.quantity >= MAX_QTY}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className={styles.qtyText}>수량 {b.quantity}</span>
                      )}
                      {!gone && <span className={styles.price}>{won(b.lineAmount)}</span>}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <dl className={styles.sum}>
            <div>
              <dt>상품 금액</dt>
              <dd>{won(sum)}</dd>
            </div>
            <div>
              <dt>배송비</dt>
              <dd>{shipping ? won(shipping) : '무료'}</dd>
            </div>
            <div className={styles.sumTotal}>
              <dt>결제 예정 금액</dt>
              <dd>{won(payTotal)}</dd>
            </div>
          </dl>
          {toFree > 0 && (
            <p className={styles.freeShip}>
              <b>{won(toFree)}</b> 더 담으면 무료 배송이에요
            </p>
          )}
          {wallet.data && (
            <div className={styles.wallet}>
              <span>예치금 {won(balance)}</span>
              {payTotal <= balance ? (
                <span>
                  결제 후 <b>{won(balance - payTotal)}</b> 남아요
                </span>
              ) : (
                <span className={styles.short}>{won(payTotal - balance)} 모자라요</span>
              )}
            </div>
          )}
          <p className={styles.note}>주문하면 15분 동안 재고가 예약돼요</p>
        </>
      )}
      {optionFor && (
        <OptionSheet
          item={optionFor}
          cartItems={items}
          onClose={() => setOptionFor(null)}
          onApply={(next, qty) => {
            const target = optionFor
            setOptionFor(null)
            applyOption(target, next, qty)
          }}
        />
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}

/**
 * 옵션 변경 시트 (⑤-1). 열 때 상품 상세를 불러와 실제 옵션을 보여 줘요.
 * 옵션 그룹(optionNames)이 있으면 그룹별로 값을 고르고, 옵션이 하나뿐이면 수량만 보여 줘요.
 * 상품 상세를 못 불러오면 옵션은 못 바꾸고 수량만 바꿀 수 있어요.
 */
function OptionSheet({
  item,
  cartItems,
  onClose,
  onApply,
}: {
  item: CartItem
  cartItems: CartItem[]
  onClose: () => void
  /** next가 null이면 옵션은 그대로 */
  onApply: (next: ProductOption | null, qty: number) => void
}) {
  const product = useApi(() => getProduct(item.productId!), [item.productId])
  const options = product.data?.options ?? []
  const optionNames = product.data?.optionNames ?? []
  const [picked, setPicked] = useState<string[]>([])
  const [pickedId, setPickedId] = useState(item.optionId)
  const [qty, setQty] = useState(item.quantity)

  // 상품을 불러오면 지금 담긴 옵션의 값으로 시작해요
  useEffect(() => {
    const list = product.data?.options ?? []
    // 담긴 옵션이 상품에서 빠졌으면 살 수 있는 첫 옵션으로 시작해요
    const cur = list.find((o) => o.optionId === item.optionId) ?? list.find((o) => !o.soldOut)
    if (cur) setPicked(cur.values)
  }, [product.data, item.optionId])

  const grouped = optionNames.length > 0
  /** 지금 고른 옵션. 그룹이 있으면 값 조합으로, 없으면 목록에서 고른 옵션 */
  const selected = grouped ? matchOption(options, picked) : options.find((o) => o.optionId === pickedId)
  const showPicker = options.length > 1
  const changed = !!selected && selected.optionId !== item.optionId
  /** 새 옵션이 이미 장바구니에 있으면 담을 때 수량이 합쳐져요 */
  const merged = changed ? cartItems.find((c) => c.optionId === selected.optionId) : undefined
  // 지금 담긴 옵션은 품절이어도 그대로 둘 수 있게 막지 않아요
  const blocked = (o?: ProductOption) => !o || (o.soldOut && o.optionId !== item.optionId)
  const canApply = !showPicker || !product.data || (!!selected && !blocked(selected))
  const name = item.productName ?? ''
  const unitPrice = changed ? selected.price : item.price
  const extra = (o: ProductOption) => (o.additionalPrice > 0 ? ` +${o.additionalPrice.toLocaleString('ko-KR')}` : '')

  return (
    <Sheet
      title="옵션 변경"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            취소
          </Button>
          <Button size="lg" disabled={!canApply} onClick={() => onApply(changed ? selected : null, qty)}>
            변경하기
          </Button>
        </>
      }
    >
      <div className={styles.sheetProduct}>
        <Thumb src={item.thumbnailUrl || productImage(name)} width={52} height={58} />
        <div>
          {item.sellerName && <p className={styles.brand}>{item.sellerName}</p>}
          <p className={styles.sheetName}>{name}</p>
          <p className={styles.opt}>지금 담긴 옵션 · {item.optionName || '옵션 없음'}</p>
        </div>
      </div>
      {product.loading && !product.data && <Loading label="옵션을 불러오고 있어요" />}
      {product.error && !product.data && (
        <p className={styles.sheetError}>
          옵션을 불러오지 못해 지금은 수량만 바꿀 수 있어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
      {showPicker &&
        grouped &&
        optionNames.map((optName, i) => {
          const last = i === optionNames.length - 1
          const values = Array.from(new Set(options.map((o) => o.values[i])))
          return (
            <div key={optName} role="radiogroup" aria-label={optName} className={styles.optGroup}>
              <p className={styles.optTitle}>
                {optName} <span>{picked[i]}</span>
              </p>
              <div className={styles.values}>
                {values.map((v) => {
                  // 마지막 옵션에서만 품절·추가금을 붙여요 (앞 옵션은 뒤 옵션에 따라 달라져서)
                  const o = matchOption(
                    options,
                    picked.map((x, j) => (j === i ? v : x)),
                  )
                  const on = picked[i] === v
                  return (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={last && blocked(o)}
                      className={`${styles.value} ${on ? styles.valueOn : ''}`}
                      onClick={() => setPicked((p) => p.map((x, j) => (j === i ? v : x)))}
                    >
                      {v}
                      {last && o ? extra(o) : ''}
                      {last && o?.soldOut ? ' 품절' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      {showPicker && !grouped && (
        <div role="radiogroup" aria-label="옵션" className={styles.optGroup}>
          <p className={styles.optTitle}>옵션</p>
          <div className={styles.values}>
            {options.map((o) => (
              <button
                key={o.optionId}
                type="button"
                role="radio"
                aria-checked={pickedId === o.optionId}
                disabled={blocked(o)}
                className={`${styles.value} ${pickedId === o.optionId ? styles.valueOn : ''}`}
                onClick={() => setPickedId(o.optionId)}
              >
                {o.name}
                {extra(o)}
                {o.soldOut ? ' 품절' : ''}
              </button>
            ))}
          </div>
        </div>
      )}
      {showPicker && grouped && product.data && !selected && (
        <p className={styles.sheetError}>이 조합은 판매하지 않아요. 다른 값을 골라 주세요.</p>
      )}
      {merged && (
        <p className={styles.sheetNote}>
          이 옵션은 이미 {merged.quantity}개 담겨 있어요. 바꾸면 수량이 합쳐져 {merged.quantity + qty}개가 돼요.
        </p>
      )}
      <div className={styles.qtyRow}>
        <span className={styles.optTitle}>수량</span>
        <div className={styles.roundStepper}>
          <button type="button" aria-label="수량 빼기" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span aria-live="polite">{qty}</span>
          <button type="button" aria-label="수량 더하기" onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}>
            +
          </button>
        </div>
      </div>
      <div className={styles.optSummary}>
        <span>
          {(changed ? selected.name : item.optionName) || '옵션 없음'} · {qty}개
        </span>
        <b>{won(unitPrice * qty)}</b>
      </div>
    </Sheet>
  )
}
