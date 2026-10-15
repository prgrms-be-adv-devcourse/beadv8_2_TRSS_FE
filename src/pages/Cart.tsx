import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './Cart.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'

type CartItem = { shop: string; name: string; bg: string; p: number; old?: number; pending?: boolean; sold?: boolean }
const CART: CartItem[] = [
  { shop: '온결', name: '약산성 수분 진정 토너 300ml', bg: '#F5E1E6', p: 18900 },
  { shop: '무드랩', name: '시카 리페어 크림 50ml', bg: '#E4EAF2', p: 27000, old: 24000 },
  { shop: '하루담', name: '저자극 데일리 선크림 SPF50+', bg: '#F3D9DE', p: 21000 },
  { shop: '데일리핏', name: '순한 아미노 클렌징폼 150ml', bg: '#E8E0F2', p: 12500, pending: true },
  { shop: '온결', name: '비타민 브라이트닝 세럼 30ml', bg: '#E8E6F3', p: 32000, sold: true },
]
const BALANCE = 48000

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useCartView() {
  const [checked, setChecked] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false })
  const [qtys, setQtys] = useState<Record<number, number>>({ 0: 1, 1: 2, 2: 1 })

  let sum = 0
  let selected = 0
  const rows = CART.map((b, i) => {
    const locked = !!(b.pending || b.sold)
    const on = !locked && !!checked[i]
    const qty = qtys[i] || 1
    if (on) {
      sum += b.p * qty
      selected++
    }
    return {
      shop: b.shop,
      name: b.name,
      img: productImage(b.name),
      bg: b.bg,
      price: won(b.p),
      oldPrice: b.old ? won(b.old) : '',
      changed: !!b.old,
      plain: !b.old && !b.sold,
      pending: !!b.pending,
      soldOut: !!b.sold,
      locked,
      on,
      editable: !locked,
      qty,
      line: b.sold ? '' : won(b.p * qty) + '원',
      fade: b.sold ? '0.5' : '1',
      rowBg: locked ? '#FAFAFB' : '#fff',
      toggle: () => setChecked((s) => ({ ...s, [i]: !s[i] })),
      inc: () => setQtys((s) => ({ ...s, [i]: Math.min(99, qty + 1) })),
      dec: () => setQtys((s) => ({ ...s, [i]: Math.max(1, qty - 1) })),
    }
  })
  const gap = sum - BALANCE
  const view = {
    rows,
    sum: won(sum),
    selCount: selected,
    orderable: 3,
    allOn: selected === 3,
    toggleAll: () => {
      const v = selected !== 3
      setChecked({ 0: v, 1: v, 2: v })
    },
    cover: sum ? Math.min(100, Math.round((BALANCE / sum) * 100)) + '%' : '100%',
    gapText: gap > 0 ? won(gap) + '원이 모자라요. 주문한 뒤 충전할 수 있어요.' : '예치금으로 바로 결제할 수 있어요.',
    gapColor: gap > 0 ? '#A33A1F' : '#1C6B47',
  }
  return view
}

/** 장바구니 */
export default function CartPage() {
  const view = useCartView()
  const { allOn, cover, gapColor, gapText, orderable, rows, selCount, sum, toggleAll } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="cart" />
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
                <button className={cx('btn btn-q')} style={{ minHeight: '36px', fontSize: '14px' }}>
                  선택 삭제
                </button>
              </div>
              {rows.map((r, rIndex) => (
                <div
                  style={css(
                    `display:flex;gap:16px;padding:20px 24px;border-bottom:1px solid #E8E8ED;align-items:flex-start;flex-wrap:wrap;background:${r.rowBg}`,
                  )}
                  key={rIndex}
                >
                  <input
                    type="checkbox"
                    checked={r.on}
                    disabled={r.locked}
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
                    <span className={cx('sub')} style={{ fontWeight: '500' }}>
                      {r.shop}
                    </span>
                    <Link to="/product/1" style={{ color: '#26262C', fontSize: '15px' }}>
                      {r.name}
                    </Link>
                    {r.changed && (
                      <>
                        <span className={cx('num')}>
                          <s className={cx('sub')}>{r.oldPrice}원</s>{' '}
                          <strong style={{ fontWeight: '700' }}>{r.price}원</strong>
                        </span>
                        <span className={cx('chip c-low')} style={{ alignSelf: 'flex-start' }}>
                          담은 뒤 가격이 바뀌었어요
                        </span>
                      </>
                    )}
                    {r.plain && (
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
                        <Link to="/checkout" style={{ fontSize: '13px', fontWeight: '500' }}>
                          주문 ORD-20261009-0142에서 결제하기
                        </Link>
                      </>
                    )}
                    {r.soldOut && (
                      <>
                        <span className={cx('chip c-mute')} style={{ alignSelf: 'flex-start' }}>
                          품절되어 주문할 수 없어요
                        </span>
                      </>
                    )}
                  </div>
                  {r.editable && (
                    <>
                      <div className={cx('step')}>
                        <button onClick={r.dec} aria-label="수량 줄이기">
                          −
                        </button>
                        <span className={cx('num')}>{r.qty}</span>
                        <button onClick={r.inc} aria-label="수량 늘리기">
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
                  <strong className={cx('num')}>48,000원</strong>
                </div>
                <div
                  style={{ height: '8px', borderRadius: '4px', background: '#FFE1CF', overflow: 'hidden' }}
                  aria-hidden="true"
                >
                  <div style={css(`height:100%;width:${cover};background:#26262C`)}></div>
                </div>
                <span style={css(`font-size:13px;color:${gapColor};font-weight:500`)}>{gapText}</span>
              </div>
              <Link className={cx('btn btn-p')} to="/checkout" style={{ minHeight: '56px', fontSize: '17px' }}>
                {selCount}개 상품 주문하기
              </Link>
              <p className={cx('sub')} style={{ margin: '0' }}>
                가격과 재고는 주문할 때 한 번 더 확인해요. 주문하면 15분 동안 재고가 예약돼요.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
