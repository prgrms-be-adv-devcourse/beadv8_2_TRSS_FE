import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import PageHeader from '../../components/ui/PageHeader'
import {
  deleteCartItems,
  getCart,
  selectAllCartItems,
  updateCartItem,
  type Cart,
  type CartItem,
  type UnorderableReason,
} from '../../lib/api/cart'
import { newIdempotencyKey } from '../../lib/api/order'
import { getWallet } from '../../lib/api/wallet'
import { cartNotice } from '../../lib/notices/order'
import { productImage } from '../../lib/products'
import { useApi } from '../../lib/useApi'
import { NoticeModal, type Notice } from './common'
import styles from './Cart.module.css'

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
  return {
    items,
    selectedCount: selected.length,
    expectedTotalPrice: selected.filter((i) => i.orderable).reduce((s, i) => s + i.lineAmount, 0),
    orderable: selected.length > 0 && selected.every((i) => i.orderable),
  }
}

/** 장바구니 (시안 ⑤ Cart · ⑤-1 CartOptionSheet) */
export default function CartPage() {
  const navigate = useNavigate()
  const { data: cart, setData: setCart, loading, error, reload } = useApi(getCart)
  const wallet = useApi(getWallet)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [optionFor, setOptionFor] = useState<CartItem | null>(null)
  // TODO(API 미구현): PATCH /api/v1/cart/items/{itemId} 옵션 변경 — 지금은 화면에서만 바꾼 옵션 이름을 보여 줘요
  const [optionLabel, setOptionLabel] = useState<Record<number, string>>({})

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
  const sum = cart?.expectedTotalPrice ?? 0
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
          {targets.length ? `${won(sum)} 주문하기` : '주문할 상품을 골라 주세요'}
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
              const option = optionLabel[b.itemId] ?? b.optionName ?? ''
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
                        {!locked && option && (
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
            <div className={styles.sumTotal}>
              <dt>결제 예정 금액</dt>
              <dd>{won(sum)}</dd>
            </div>
          </dl>
          {wallet.data && (
            <div className={styles.wallet}>
              <span>예치금 {won(balance)}</span>
              {sum <= balance ? (
                <span>
                  결제 후 <b>{won(balance - sum)}</b> 남아요
                </span>
              ) : (
                <span className={styles.short}>{won(sum - balance)} 모자라요 · 주문한 뒤 충전할 수 있어요</span>
              )}
            </div>
          )}
          <p className={styles.note}>가격과 재고는 주문할 때 한 번 더 확인해요. 주문하면 15분 동안 재고가 예약돼요.</p>
        </>
      )}
      {optionFor && (
        <OptionSheet
          item={optionFor}
          currentLabel={optionLabel[optionFor.itemId] ?? optionFor.optionName ?? ''}
          onClose={() => setOptionFor(null)}
          onApply={(label, qty) => {
            const target = optionFor
            setOptionFor(null)
            if (label !== (optionLabel[target.itemId] ?? target.optionName)) {
              setOptionLabel((m) => ({ ...m, [target.itemId]: label }))
              setNotice({
                title: '옵션을 바꿨어요',
                body: `${label}(으)로 바꿨어요. 옵션 변경 기능은 준비 중이라 지금은 화면에서만 바뀌어요.`,
                actions: [{ label: '확인', primary: true }],
              })
            }
            if (qty !== target.quantity) changeQty(target, qty, target.productName ?? '')
          }}
        />
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}

// TODO(API 미구현): 상품 상세 옵션 그룹 구조(색상·사이즈) — 지금은 시안의 예시 옵션으로 보여 줘요
const COLORS: Array<[string, string]> = [
  ['블랙', '#1b1b1e'],
  ['아이보리', '#ece6d8'],
  ['카키', '#6b6a4e'],
  ['네이비', '#26324a'],
]
const SIZES = ['S', 'M', 'L', 'XL']
const SOLD_OUT_SIZES = ['XL']

/** 옵션 변경 시트 (⑤-1). 수량은 실제로 바뀌고, 옵션은 목업이에요 */
function OptionSheet({
  item,
  currentLabel,
  onClose,
  onApply,
}: {
  item: CartItem
  currentLabel: string
  onClose: () => void
  onApply: (label: string, qty: number) => void
}) {
  const [color, setColor] = useState(0)
  const [size, setSize] = useState('L')
  const [qty, setQty] = useState(item.quantity)
  const name = item.productName ?? ''
  const label = `${COLORS[color][0]} / ${size}`
  return (
    <Sheet
      title="옵션 변경"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" size="lg" onClick={onClose}>
            취소
          </Button>
          <Button size="lg" onClick={() => onApply(label, qty)}>
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
          <p className={styles.opt}>지금 담긴 옵션 · {currentLabel || '옵션 없음'}</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="색상" className={styles.optGroup}>
        <p className={styles.optTitle}>
          색상 <span>{COLORS[color][0]}</span>
        </p>
        <div className={styles.swatches}>
          {COLORS.map(([c, hex], i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === i}
              aria-label={c}
              className={`${styles.swatch} ${color === i ? styles.swatchOn : ''}`}
              onClick={() => setColor(i)}
            >
              <span style={{ background: hex }} />
            </button>
          ))}
        </div>
      </div>
      <div role="radiogroup" aria-label="사이즈" className={styles.optGroup}>
        <p className={styles.optTitle}>사이즈</p>
        <div className={styles.sizes}>
          {SIZES.map((s) => {
            const out = SOLD_OUT_SIZES.includes(s)
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={size === s}
                aria-disabled={out}
                className={`${styles.size} ${out ? styles.sizeOut : size === s ? styles.sizeOn : ''}`}
                onClick={() => !out && setSize(s)}
              >
                {out ? `${s} 품절` : s}
              </button>
            )
          })}
        </div>
      </div>
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
          {label} · {qty}개
        </span>
        <b>{won(item.price * qty)}</b>
      </div>
    </Sheet>
  )
}
