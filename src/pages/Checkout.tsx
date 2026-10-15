import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './Checkout.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useEffect, useRef, useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'

export type CheckoutProps = {
  /** 예치금이 결제 금액보다 부족한지 */
  balance?: '부족' | '충분'
  /** 처음 열 때 보여줄 결제 팝업 */
  popup?: '없음' | '결제 요청' | '결제 진행 중' | '결제 완료'
}
type PayStep = '' | 'confirm' | 'processing' | 'done'
const POPUP_STEP: Record<string, PayStep> = {
  '결제 요청': 'confirm',
  '결제 진행 중': 'processing',
  '결제 완료': 'done',
}
const ORDER_ITEMS = [
  { shop: '온결', name: '약산성 수분 진정 토너 300ml', bg: '#F5E1E6', p: 18900, q: 1 },
  { shop: '무드랩', name: '시카 리페어 크림 50ml', bg: '#E4EAF2', p: 27000, q: 2 },
]
const AMOUNT = 72900

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useCheckoutView({ balance = '부족', popup = '없음' }: CheckoutProps) {
  const [pay, setPay] = useState<PayStep>(POPUP_STEP[popup] ?? '')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const short = balance === '부족'
  const bal = short ? 48000 : 100000
  const gap = AMOUNT - bal
  const view = {
    items: ORDER_ITEMS.map((r) => ({
      shop: r.shop,
      name: r.name,
      img: productImage(r.name),
      bg: r.bg,
      unit: won(r.p),
      qty: r.q,
      line: won(r.p * r.q),
    })),
    amount: won(AMOUNT),
    bal: won(bal),
    short,
    enough: !short,
    gap: won(Math.max(0, gap)),
    rec: won(Math.ceil(Math.max(0, gap) / 10000) * 10000),
    left: won(Math.max(0, bal - AMOUNT)),
    coverPct: Math.min(100, Math.round((bal / AMOUNT) * 100)) + '%',
    pop: { confirm: pay === 'confirm', processing: pay === 'processing', done: pay === 'done' },
    openPay: () => setPay('confirm'),
    closePay: () => setPay(''),
    startPay: () => {
      setPay('processing')
      // 실제 연동 시 결제 API 응답에 맞춰 바꿔요
      timer.current = window.setTimeout(() => setPay('done'), 1800)
    },
  }
  return view
}

/** 주문서 */
export default function CheckoutPage(props: CheckoutProps) {
  const view = useCheckoutView(props)
  const { amount, bal, closePay, coverPct, enough, gap, items, left, openPay, pop, rec, short, startPay } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="cart" cartCount={4} />
        <div style={{ background: '#FFF1E8', borderBottom: '1px solid #F6D3BE' }}>
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              padding: '14px 24px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '8px 20px',
            }}
          >
            <strong className={cx('num')} style={{ fontSize: '22px', fontWeight: '700', color: '#A33A1F' }}>
              14:32
            </strong>
            <span style={{ flex: '1 1 300px' }}>안에 결제하지 않으면 주문이 취소되고 예약한 재고가 풀려요.</span>
            <div
              style={{
                flex: '1 1 200px',
                maxWidth: '280px',
                height: '6px',
                borderRadius: '3px',
                background: '#F6D3BE',
                overflow: 'hidden',
              }}
              aria-hidden="true"
            >
              <div style={{ width: '97%', height: '100%', background: '#C2410C' }}></div>
            </div>
          </div>
        </div>
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
          <div>
            <span className={cx('sub num')}>주문번호 ORD-20261009-0142</span>
            <h1 style={{ margin: '2px 0 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문서</h1>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: '999 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section
                className={cx('panel')}
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}
              >
                <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>주문 상품 2개</h2>
                {items.map((r, rIndex) => (
                  <div
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderTop: '1px solid #E8E8ED',
                    }}
                    key={rIndex}
                  >
                    <div style={{ width: '64px', borderRadius: '6px', overflow: 'hidden', flex: 'none' }}>
                      <div
                        style={css(
                          `width:64px;height:64px;background:${r.bg};display:flex;align-items:center;justify-content:center;color:rgba(38,38,44,.38)`,
                        )}
                      >
                        <img
                          src={r.img}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    </div>
                    <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
                      <span className={cx('sub')} style={{ fontWeight: '500' }}>
                        {r.shop}
                      </span>
                      <span>{r.name}</span>
                      <span className={cx('sub num')}>
                        {r.unit}원 × {r.qty}
                      </span>
                    </div>
                    <strong className={cx('num')} style={{ fontWeight: '700' }}>
                      {r.line}원
                    </strong>
                  </div>
                ))}
                <p className={cx('sub')} style={{ margin: '8px 0 0' }}>
                  주문할 때의 가격과 판매자 정보로 고정돼요.
                </p>
              </section>
              <section
                className={cx('panel')}
                style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>예치금으로 결제</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div
                    style={{
                      display: 'flex',
                      height: '40px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#FAFAFB',
                    }}
                    aria-hidden="true"
                  >
                    <div
                      style={css(
                        `width:${coverPct};background:#26262C;display:flex;align-items:center;padding:0 12px;color:#fff;font-size:13px;font-weight:700;box-sizing:border-box;white-space:nowrap`,
                      )}
                    >
                      보유 {bal}원
                    </div>
                    {short && (
                      <>
                        <div
                          style={{
                            flex: '1',
                            background: 'repeating-linear-gradient(135deg,#FFE1CF 0 8px,#FFD2B8 8px 16px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            padding: '0 12px',
                            color: '#9A3209',
                            fontSize: '13px',
                            fontWeight: '700',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          부족 {gap}원
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }} className={cx('sub')}>
                    <span>0원</span>
                    <span className={cx('num')}>결제할 금액 {amount}원</span>
                  </div>
                </div>
                {short && (
                  <>
                    <div
                      style={{
                        border: '1px solid #F6D3BE',
                        background: '#FFF8F3',
                        borderRadius: '6px',
                        padding: '18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <strong style={{ fontSize: '16px' }}>
                        예치금이 <span className={cx('num')}>{gap}</span>원 모자라요
                      </strong>
                      <span style={{ fontSize: '14px' }}>
                        1만 원 단위로 맞춘 <strong className={cx('num')}>{rec}원</strong>을 충전하면 바로 결제할 수
                        있어요. 충전을 마치면 이 주문서로 돌아와요.
                      </span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <Link className={cx('btn btn-p')} to="/wallet">
                          {rec}원 충전하기
                        </Link>
                        <Link className={cx('btn')} to="/wallet">
                          다른 금액 충전하기
                        </Link>
                      </div>
                    </div>
                  </>
                )}
                {enough && (
                  <>
                    <p style={{ margin: '0', color: '#1C6B47', fontWeight: '500' }}>
                      예치금으로 바로 결제할 수 있어요. 결제 후 남는 예치금은 <span className={cx('num')}>{left}</span>
                      원이에요.
                    </p>
                  </>
                )}
                <p className={cx('sub')} style={{ margin: '0' }}>
                  결제한 금액은 구매를 확정하기 전까지 팔레트가 보관해요. 반품이 승인되면 예치금으로 돌려드려요.
                </p>
              </section>
            </div>
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>최종 결제 금액</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={cx('sub')} style={{ fontSize: '15px' }}>
                  상품 금액
                </span>
                <span className={cx('num')}>{amount}원</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={cx('sub')} style={{ fontSize: '15px' }}>
                  결제 수단
                </span>
                <span>예치금</span>
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
                <strong>합계</strong>
                <strong className={cx('num')} style={{ fontSize: '28px', fontWeight: '700' }}>
                  {amount}원
                </strong>
              </div>
              <label
                style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '14px', cursor: 'pointer' }}
              >
                <input type="checkbox" style={{ width: '20px', height: '20px', margin: '0', accentColor: '#26262C' }} />
                주문 내용을 확인했고 결제에 동의해요
              </label>
              {enough && (
                <>
                  <button className={cx('btn btn-p')} onClick={openPay} style={{ minHeight: '56px', fontSize: '17px' }}>
                    {amount}원 결제하기
                  </button>
                </>
              )}
              {short && (
                <>
                  <button className={cx('btn btn-p')} disabled style={{ minHeight: '56px', fontSize: '17px' }}>
                    충전한 뒤 결제할 수 있어요
                  </button>
                </>
              )}
              <button className={cx('btn btn-q')} style={{ alignSelf: 'center', fontSize: '14px' }}>
                주문 취소하기
              </button>
            </aside>
          </div>
        </div>
        {pop.confirm && (
          <>
            <div className={cx('ov')}>
              <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby="pc-t">
                <h2 id="pc-t">72,900원을 결제할까요?</h2>
                <dl className={cx('sum')}>
                  <dt>주문번호</dt>
                  <dd>ORD-20261009-0142</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>72,900원</strong>
                  </dd>
                  <dt>결제 수단</dt>
                  <dd>예치금</dd>
                  <dt>결제 후 남는 예치금</dt>
                  <dd>27,100원</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 뒤에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만 요청할 수 있어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className={cx('btn')} onClick={closePay}>
                    돌아가기
                  </button>
                  <button className={cx('btn btn-p')} onClick={startPay}>
                    72,900원 결제하기
                  </button>
                </div>
              </section>
            </div>
          </>
        )}
        {pop.processing && (
          <>
            <div className={cx('ov')}>
              <section
                className={cx('dlg')}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="pp-t"
                aria-busy="true"
              >
                <div className={cx('spin')} aria-hidden="true"></div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 id="pp-t">결제하고 있어요</h2>
                  <p style={{ color: '#45454F' }}>
                    예치금 72,900원을 결제하는 중이에요.
                    <br />
                    창을 닫거나 새로고침하지 말고 잠시만 기다려 주세요.
                  </p>
                </div>
                <ol className={cx('steps')}>
                  <li className={cx('ok')}>주문 확인</li>
                  <li className={cx('now')} aria-current="step">
                    예치금 결제
                  </li>
                  <li>결제 완료</li>
                </ol>
              </section>
            </div>
          </>
        )}
        {pop.done && (
          <>
            <div className={cx('ov')}>
              <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby="pd-t">
                <div className={cx('okmark')} aria-hidden="true">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 id="pd-t">결제를 완료했어요</h2>
                  <p style={{ color: '#45454F' }}>주문한 상품을 판매자에게 전달했어요.</p>
                </div>
                <dl className={cx('sum')}>
                  <dt>주문번호</dt>
                  <dd>ORD-20261009-0142</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>72,900원</strong>
                  </dd>
                  <dt>남은 예치금</dt>
                  <dd>27,100원</dd>
                  <dt>자동 구매 확정</dt>
                  <dd>10.16 (결제 후 7일)</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 금액은 구매를 확정하기 전까지 팔레트가 보관해요. 장바구니에서 결제한 상품은 빠졌어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link className={cx('btn')} to="/">
                    쇼핑 계속하기
                  </Link>
                  <Link className={cx('btn btn-p')} to="/orders/1">
                    주문 상세 보기
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
