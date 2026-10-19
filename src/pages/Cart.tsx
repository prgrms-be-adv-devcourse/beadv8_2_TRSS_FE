import { Link, useNavigate } from 'react-router-dom'
import { makeCx, css, NOTICE } from '../lib/ui'
import styles from './Cart.module.css'
import BuyerHeader from '../components/BuyerHeader'
import NoticeModal, { type Notice } from '../components/NoticeModal'
import { cartNotice } from '../lib/notices/order'

import { useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'
import {
  deleteCartItems,
  getCart,
  selectAllCartItems,
  updateCartItem,
  type Cart,
  type CartItem,
  type UnorderableReason,
} from '../lib/api/cart'
import { getWallet } from '../lib/api/wallet'
import { useApi } from '../lib/useApi'

const cx = makeCx(styles)

/** 백엔드 custom.order.cartMaxQuantity */
const MAX_QTY = 99

/** 주문할 수 없는 사유별 안내 문구 [칩 색, 문구] */
const REASON: Record<UnorderableReason, [string, string]> = {
  PRODUCT_DELETED: ['c-mute', '판매하지 않는 상품이에요'],
  OPTION_DELETED: ['c-mute', '판매하지 않는 옵션이에요'],
  PRODUCT_STOPPED: ['c-mute', '판매가 중지된 상품이에요'],
  CATEGORY_INACTIVE: ['c-mute', '지금은 판매하지 않는 상품이에요'],
  SOLD_OUT: ['c-mute', '품절되어 주문할 수 없어요'],
  STOCK_INSUFFICIENT: ['c-low', '남은 재고보다 많이 담았어요. 수량을 줄여 주세요'],
  IN_PENDING_ORDER: ['c-blue', '결제를 기다리는 주문에 들어 있어요'],
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

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useCartView() {
  const navigate = useNavigate()
  const { data: cart, setData: setCart, loading, error: loadError, reload } = useApi(getCart)
  const wallet = useApi(getWallet)
  const [notice, setNotice] = useState<Notice | null>(null)

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

  const rows = items.map((b) => {
    const reason = b.unorderableReason
    const locked = !b.orderable && !fixable(reason)
    const gone = !b.orderable && !fixable(reason) && reason !== 'IN_PENDING_ORDER'
    const name = b.productName ?? '판매하지 않는 상품'
    const on = b.orderable && b.selected
    return {
      key: b.itemId,
      shop: b.sellerName ?? '',
      option: b.optionName ?? '',
      name,
      productUrl: b.productId ? `/product/${b.productId}` : '',
      img: b.thumbnailUrl || productImage(name),
      bg: '#F1F1F4',
      price: won(b.price),
      showPrice: !gone,
      pending: reason === 'IN_PENDING_ORDER',
      chip: reason && reason !== 'IN_PENDING_ORDER' ? REASON[reason] : null,
      locked,
      on,
      checkable: b.orderable,
      editable: !locked,
      qty: b.quantity,
      line: gone ? '' : won(b.lineAmount) + '원',
      fade: gone ? '0.5' : '1',
      rowBg: locked ? '#FAFAFB' : '#fff',
      toggle: () =>
        run(
          () => updateCartItem(b.itemId, { selected: !b.selected }),
          (list) => list.map((i) => (i.itemId === b.itemId ? { ...i, selected: !i.selected } : i)),
          name,
        ),
      changeQty: (next: number) => {
        const q = Math.max(1, Math.min(MAX_QTY, next))
        if (q === b.quantity) return
        run(
          () => updateCartItem(b.itemId, { quantity: q }),
          (list) => list.map((i) => (i.itemId === b.itemId ? { ...i, quantity: q, lineAmount: i.price * q } : i)),
          name,
        )
      },
      remove: () =>
        run(
          () => deleteCartItems([b.itemId]),
          (list) => list.filter((i) => i.itemId !== b.itemId),
          name,
        ),
    }
  })

  const gap = sum - balance
  const allOn = orderableItems.length > 0 && targets.length === orderableItems.length
  const view = {
    loading: loading && !cart,
    empty: !!cart && items.length === 0,
    error: loadError || '',
    notice,
    closeNotice: () => setNotice(null),
    rows,
    // 불러오기 전에는 넘기지 않아서 헤더 배지가 0으로 깜빡이지 않게 해요.
    count: cart ? items.length : undefined,
    sum: won(sum),
    selCount: targets.length,
    orderable: orderableItems.length,
    allOn,
    toggleAll: () => {
      const v = !allOn
      run(
        () => selectAllCartItems(v),
        (list) => list.map((i) => ({ ...i, selected: v })),
      )
    },
    removeSelected: () => {
      const ids = targets.map((i) => i.itemId)
      if (!ids.length) return
      run(
        () => deleteCartItems(ids),
        (list) => list.filter((i) => !ids.includes(i.itemId)),
      )
    },
    walletReady: !!wallet.data,
    balance,
    balanceText: won(balance),
    cover: sum ? Math.min(100, Math.round((balance / sum) * 100)) + '%' : '100%',
    gapText: gap > 0 ? won(gap) + '원이 모자라요. 주문한 뒤 충전할 수 있어요.' : '예치금으로 바로 결제할 수 있어요.',
    gapColor: gap > 0 ? '#A33A1F' : '#1C6B47',
    /** 주문서로 선택한 항목과 예상 금액을 넘겨요. 주문 생성(POST /api/v1/orders)은 주문서에서 해요. */
    order: () => {
      if (!targets.length) return
      navigate('/checkout', {
        state: { cartItemIds: targets.map((i) => i.itemId), expectedTotalPrice: sum },
      })
    },
  }
  return view
}

/** 장바구니 */
export default function CartPage() {
  const view = useCartView()
  const { allOn, cover, gapColor, gapText, orderable, rows, selCount, sum, toggleAll } = view
  const { loading, empty, error, count, removeSelected, walletReady, balanceText, order } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="cart" cartCount={count} />
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
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>장바구니</h1>
          {error && (
            <p role="alert" style={NOTICE}>
              {error}
            </p>
          )}
          {loading && <p className={cx('sub')}>장바구니를 불러오고 있어요.</p>}
          {empty && (
            <section
              className={cx('panel')}
              style={{
                padding: '56px 24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <p style={{ margin: '0', fontSize: '16px' }}>장바구니가 비어 있어요.</p>
              <Link className={cx('btn btn-p')} to="/">
                상품 보러 가기
              </Link>
            </section>
          )}
          {!loading && !empty && rows.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
              <section className={cx('panel')} style={{ flex: '999 1 600px', minWidth: '0' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 24px',
                    borderBottom: '1px solid #E8E8ED',
                  }}
                >
                  <label
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500', cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={allOn}
                      onChange={toggleAll}
                      style={{ width: '20px', height: '20px', accentColor: '#26262C' }}
                    />
                    전체 선택{' '}
                    <span className={cx('num sub')}>
                      {selCount}/{orderable}
                    </span>
                  </label>
                  <button
                    className={cx('btn btn-q')}
                    onClick={removeSelected}
                    disabled={selCount === 0}
                    style={{ minHeight: '36px', fontSize: '14px' }}
                  >
                    선택 삭제
                  </button>
                </div>
                {rows.map((r) => (
                  <div
                    style={css(
                      `display:flex;gap:16px;padding:20px 24px;border-bottom:1px solid #E8E8ED;align-items:flex-start;flex-wrap:wrap;background:${r.rowBg}`,
                    )}
                    key={r.key}
                  >
                    <input
                      type="checkbox"
                      checked={r.on}
                      disabled={!r.checkable}
                      onChange={r.toggle}
                      aria-label={`${r.name} 선택`}
                      style={{ width: '20px', height: '20px', marginTop: '4px', accentColor: '#26262C' }}
                    />
                    <div style={css(`width:96px;border-radius:6px;overflow:hidden;flex:none;opacity:${r.fade}`)}>
                      <div
                        style={css(
                          `width:96px;height:96px;background:${r.bg};display:flex;align-items:center;justify-content:center;color:rgba(38,38,44,.38)`,
                        )}
                      >
                        <img
                          src={r.img}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    </div>
                    <div
                      style={{ flex: '1 1 220px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '0' }}
                    >
                      {r.shop && (
                        <span className={cx('sub')} style={{ fontWeight: '500' }}>
                          {r.shop}
                        </span>
                      )}
                      {r.productUrl ? (
                        <Link to={r.productUrl} style={{ color: '#26262C', fontSize: '15px' }}>
                          {r.name}
                        </Link>
                      ) : (
                        <span style={{ fontSize: '15px' }}>{r.name}</span>
                      )}
                      {r.option && <span className={cx('sub')}>{r.option}</span>}
                      {r.showPrice && (
                        <>
                          <strong className={cx('num')} style={{ fontWeight: '700' }}>
                            {r.price}원
                          </strong>
                        </>
                      )}
                      {r.pending && (
                        <>
                          <span className={cx('chip c-blue')} style={{ alignSelf: 'flex-start' }}>
                            결제를 기다리는 주문에 들어 있어요
                          </span>
                          <Link to="/orders" style={{ fontSize: '13px', fontWeight: '500' }}>
                            주문 내역에서 결제하기
                          </Link>
                        </>
                      )}
                      {r.chip && (
                        <span className={cx('chip', r.chip[0])} style={{ alignSelf: 'flex-start' }}>
                          {r.chip[1]}
                        </span>
                      )}
                    </div>
                    {r.editable && (
                      <>
                        <div className={cx('step')}>
                          <button onClick={() => r.changeQty(r.qty - 1)} disabled={r.qty <= 1} aria-label="수량 줄이기">
                            −
                          </button>
                          <span className={cx('num')}>{r.qty}</span>
                          <button
                            onClick={() => r.changeQty(r.qty + 1)}
                            disabled={r.qty >= MAX_QTY}
                            aria-label="수량 늘리기"
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                    <strong
                      className={cx('num')}
                      style={{
                        minWidth: '96px',
                        textAlign: 'right',
                        fontSize: '16px',
                        fontWeight: '700',
                        paddingTop: '8px',
                      }}
                    >
                      {r.line}
                    </strong>
                    <button
                      className={cx('btn btn-q')}
                      onClick={r.remove}
                      aria-label={`${r.name} 삭제`}
                      style={{ minHeight: '40px', padding: '0 10px' }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        aria-hidden="true"
                      >
                        <path d="M6 6l12 12M18 6 6 18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </section>
              <aside
                className={cx('panel')}
                style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>결제 예정 금액</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className={cx('sub')} style={{ fontSize: '15px' }}>
                    선택한 상품 {selCount}개
                  </span>
                  <span className={cx('num')}>{sum}원</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderTop: '1px solid #E8E8ED',
                    paddingTop: '14px',
                  }}
                >
                  <strong>예상 결제 금액</strong>
                  <strong className={cx('num')} style={{ fontSize: '26px', fontWeight: '700' }}>
                    {sum}원
                  </strong>
                </div>
                {walletReady && (
                  <div
                    style={{
                      background: '#FAFAFB',
                      borderRadius: '8px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                      <span>내 예치금</span>
                      <strong className={cx('num')}>{balanceText}원</strong>
                    </div>
                    <div
                      style={{ height: '8px', borderRadius: '4px', background: '#FFE1CF', overflow: 'hidden' }}
                      aria-hidden="true"
                    >
                      <div style={css(`height:100%;width:${cover};background:#26262C`)}></div>
                    </div>
                    <span style={css(`font-size:13px;color:${gapColor};font-weight:500`)}>{gapText}</span>
                  </div>
                )}
                <button
                  className={cx('btn btn-p')}
                  onClick={order}
                  disabled={selCount === 0}
                  style={{ minHeight: '56px', fontSize: '17px' }}
                >
                  {selCount}개 상품 주문하기
                </button>
                <p className={cx('sub')} style={{ margin: '0' }}>
                  가격과 재고는 주문할 때 한 번 더 확인해요. 주문하면 15분 동안 재고가 예약돼요.
                </p>
              </aside>
            </div>
          )}
        </div>
      </div>
      <NoticeModal notice={view.notice} onClose={view.closeNotice} />
    </div>
  )
}
