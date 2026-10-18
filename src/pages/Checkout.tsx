import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { makeCx, css, NOTICE } from '../lib/ui'
import styles from './Checkout.module.css'
import BuyerHeader from '../components/BuyerHeader'
import NoticeModal, { type Notice } from '../components/NoticeModal'
import { cartNotice, orderNotice } from '../lib/notices/order'
import { paymentNotice } from '../lib/notices/payment'

import { useEffect, useRef, useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'
import { cancelOrder, createOrder, getOrder, isPayable } from '../lib/api/order'
import { payOrder, type OrderPay } from '../lib/api/payment'
import { getWallet, topupPath } from '../lib/api/wallet'
import { useApi } from '../lib/useApi'
import { mmss, useRemaining } from '../lib/useRemaining'

/** 백엔드 custom.order.autoConfirmDays */
const AUTO_CONFIRM_DAYS = 7

type PayStep = '' | 'confirm' | 'processing' | 'done'
/** 장바구니에서 넘겨주는 값 (Cart.tsx의 order) */
type FromCart = { cartItemIds?: number[]; expectedTotalPrice?: number } | null

const cx = makeCx(styles)

const pad = (n: number) => String(n).padStart(2, '0')
/** "10.16" */
const md = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * - 장바구니에서 오면(state: cartItemIds·expectedTotalPrice) 주문을 만들고 /checkout?orderId=로 바꿔요
 * - /checkout?orderId=로 오면(주문 상세·예치금 충전 후) 주문과 예치금을 다시 불러와요
 */
function useCheckoutView() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const orderId = Number(params.get('orderId')) || 0
  const fromCart = (location.state as FromCart)?.cartItemIds?.length ? (location.state as FromCart) : null

  const [createFailed, setCreateFailed] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [pay, setPay] = useState<PayStep>('')
  const [paid, setPaid] = useState<(OrderPay & { left: number }) | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)

  // 장바구니에서 왔으면 결제 대기 주문을 만들어요. URL을 ?orderId=로 바꿔서 새로고침해도 주문이 다시 만들어지지 않아요
  const creating = useRef(false)
  useEffect(() => {
    if (orderId || !fromCart || creating.current) return
    creating.current = true // StrictMode에서 두 번 실행돼도 주문은 하나만 만들어요
    createOrder(fromCart.cartItemIds!, fromCart.expectedTotalPrice ?? 0)
      .then((r) => navigate(`/checkout?orderId=${r.orderId}`, { replace: true }))
      .catch((e) => {
        setCreateFailed(true)
        const n = cartNotice(e)
        // 만들어진 주문이 없으니 장바구니로 돌아가게 해요
        setNotice({
          ...n,
          actions: n.actions.some((a) => a.to) ? n.actions : [{ label: '장바구니로 가기', to: '/cart', primary: true }],
        })
      })
  }, [orderId, fromCart, navigate])

  const order = useApi(() => (orderId ? getOrder(orderId) : Promise.resolve(null)), [orderId])
  const wallet = useApi(getWallet, [])
  const o = order.data
  const remaining = useRemaining(o)

  // 결제할 수 없는 주문(결제 완료·취소 등)이면 주문 상세로 보내요. 결제 팝업이나 안내 모달이 떠 있을 때는 기다려요
  useEffect(() => {
    if (o && !isPayable(o.status) && pay === '' && !notice) navigate(`/orders/${o.orderId}`, { replace: true })
  }, [o, pay, notice, navigate])

  const total = o?.totalPrice ?? 0
  const balance = wallet.data?.balance ?? 0
  const gap = Math.max(0, total - balance)
  const expired = !!o && remaining === 0
  const short = !!wallet.data && gap > 0
  const enough = !!wallet.data && !short
  /** 결제 가능 시간 전체(초). 남은 시간 막대 길이에 써요 */
  const limit = o ? Math.max(1, (new Date(o.expiresAt).getTime() - new Date(o.orderedAt).getTime()) / 1000) : 1

  async function cancel() {
    if (!o || busy) return
    setBusy(true)
    try {
      await cancelOrder(o.orderId)
      navigate('/cart', { replace: true })
    } catch (e) {
      setNotice(orderNotice(e, { status: o.status }))
      order.reload()
    } finally {
      setBusy(false)
    }
  }

  async function startPay() {
    if (!o || busy) return
    setBusy(true)
    setPay('processing')
    try {
      const r = await payOrder(o.orderId)
      // TODO: 백엔드 OrderPayResponse에 balance(결제 후 잔액)가 추가되면 r.balance로 바꿔요.
      // 지금은 주문서를 열 때 불러온 잔액으로 계산해서, 그 사이 다른 탭 충전·반품 환불이 있으면 실제와 달라요.
      setPaid({ ...r, left: balance - r.paidAmount })
      setPay('done')
      // 잔액을 다시 불러오지 않아요. 완료 팝업 뒤 화면이 '부족'으로 바뀌지 않게 결제 전 잔액을 그대로 두고, 헤더만 결제 후 잔액으로 바꿔요
    } catch (e) {
      setPay('')
      setNotice(paymentNotice(e, { orderId: o.orderId, orderNumber: o.orderNumber, onCancel: cancel }))
      order.reload()
      wallet.reload()
    } finally {
      setBusy(false)
    }
  }

  const autoAt = paid ? new Date(new Date(paid.paidAt).getTime() + AUTO_CONFIRM_DAYS * 86400000) : null

  return {
    loading: (order.loading && !o) || (!orderId && !!fromCart && !createFailed),
    error: order.error || wallet.error,
    /** 주문 정보 없이 /checkout으로 바로 들어온 경우 */
    noOrder: !orderId && !fromCart,
    createFailed,
    ready: !!o && isPayable(o.status),
    notice,
    closeNotice: () => setNotice(null),
    orderNumber: o?.orderNumber ?? '',
    timer: mmss(remaining),
    timerPct: Math.min(100, Math.round((remaining / limit) * 100)) + '%',
    expired,
    items: (o?.items ?? []).map((r) => ({
      key: r.orderItemId,
      shop: r.sellerName,
      name: r.productName,
      option: r.optionName,
      img: productImage(r.productName),
      unit: won(r.unitPrice),
      qty: r.quantity,
      line: won(r.lineAmount),
    })),
    amount: won(total),
    headerBalance: paid ? Math.max(0, paid.left) : balance,
    bal: won(balance),
    short,
    enough,
    gap: won(gap),
    rec: won(Math.ceil(gap / 10000) * 10000),
    topupUrl: o ? topupPath(o.orderId, o.orderNumber, gap) : '/wallet',
    left: won(Math.max(0, balance - total)),
    coverPct: (total ? Math.min(100, Math.round((balance / total) * 100)) : 100) + '%',
    agree,
    toggleAgree: () => setAgree((v) => !v),
    canPay: enough && agree && !expired && !busy,
    busy,
    pop: { confirm: pay === 'confirm', processing: pay === 'processing', done: pay === 'done' },
    openPay: () => setPay('confirm'),
    closePay: () => setPay(''),
    startPay,
    askCancel: () =>
      setNotice({
        title: '주문을 취소할까요?',
        body: '예약한 재고가 풀려요. 주문한 상품은 장바구니에 남아 있어서 다시 주문할 수 있어요.',
        actions: [{ label: '돌아가기' }, { label: '주문 취소하기', primary: true, onClick: cancel }],
      }),
    paid: paid && {
      orderNumber: paid.orderNumber,
      amount: won(paid.paidAmount),
      left: won(Math.max(0, paid.left)),
      autoConfirm: autoAt ? `${md(autoAt)} (결제 후 ${AUTO_CONFIRM_DAYS}일)` : '-',
      detailUrl: `/orders/${paid.orderId}`,
    },
  }
}

/** 주문서 */
export default function CheckoutPage() {
  const view = useCheckoutView()
  const { amount, bal, closePay, coverPct, enough, gap, items, left, openPay, pop, rec, short, startPay } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="cart" balance={view.headerBalance} />
        {view.ready && (
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
              {view.expired ? (
                <>
                  <strong style={{ fontSize: '18px', fontWeight: '700', color: '#A33A1F' }}>
                    결제 시간이 지났어요
                  </strong>
                  <span style={{ flex: '1 1 300px' }}>주문이 취소되고 예약한 재고가 풀렸어요.</span>
                  <Link to="/cart" style={{ fontWeight: '700' }}>
                    다시 주문하기
                  </Link>
                </>
              ) : (
                <>
                  <strong
                    className={cx('num')}
                    style={{ fontSize: '22px', fontWeight: '700', color: '#A33A1F' }}
                    role="timer"
                  >
                    {view.timer}
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
                    <div style={{ width: view.timerPct, height: '100%', background: '#C2410C' }}></div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
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
            {view.orderNumber && <span className={cx('sub num')}>주문번호 {view.orderNumber}</span>}
            <h1 style={{ margin: '2px 0 0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문서</h1>
          </div>
          {view.loading && <p className={cx('sub')}>주문서를 불러오고 있어요.</p>}
          {view.error && (
            <p role="alert" style={NOTICE}>
              {view.error}
            </p>
          )}
          {(view.noOrder || view.createFailed) && (
            <p className={cx('sub')}>
              주문할 상품이 없어요. <Link to="/cart">장바구니</Link>에서 상품을 골라 주문해 주세요.
            </p>
          )}
          {view.ready && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
              <div
                style={{ flex: '999 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <section
                  className={cx('panel')}
                  style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}
                >
                  <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '700' }}>주문 상품 {items.length}개</h2>
                  {items.map((r) => (
                    <div
                      style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderTop: '1px solid #E8E8ED',
                      }}
                      key={r.key}
                    >
                      <div style={{ width: '64px', borderRadius: '6px', overflow: 'hidden', flex: 'none' }}>
                        <div
                          style={css(
                            'width:64px;height:64px;background:#F3F1F6;display:flex;align-items:center;justify-content:center;color:rgba(38,38,44,.38)',
                          )}
                        >
                          {r.img && (
                            <img
                              src={r.img}
                              alt=""
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          )}
                        </div>
                      </div>
                      <div style={{ flex: '1', minWidth: '0', display: 'flex', flexDirection: 'column' }}>
                        <span className={cx('sub')} style={{ fontWeight: '500' }}>
                          {r.shop}
                        </span>
                        <span>
                          {r.name}
                          {r.option && <span className={cx('sub')}> · {r.option}</span>}
                        </span>
                        <span className={cx('sub num')}>
                          {r.unit}원 × {r.qty}
                        </span>
                      </div>
                      <strong className={cx('num')} style={{ fontWeight: '700' }}>
                        {r.line}원
                      </strong>
                    </div>
                  ))}
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
                          `width:${coverPct};min-width:max-content;background:#26262C;display:flex;align-items:center;padding:0 12px;color:#fff;font-size:13px;font-weight:700;box-sizing:border-box;white-space:nowrap`,
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
                  {short && !view.expired && (
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
                          <Link className={cx('btn btn-p')} to={view.topupUrl}>
                            {rec}원 충전하기
                          </Link>
                          <Link className={cx('btn')} to={view.topupUrl}>
                            다른 금액 충전하기
                          </Link>
                        </div>
                      </div>
                    </>
                  )}
                  {enough && (
                    <>
                      <p style={{ margin: '0', color: '#1C6B47', fontWeight: '500' }}>
                        예치금으로 바로 결제할 수 있어요. 결제 후 남는 예치금은{' '}
                        <span className={cx('num')}>{left}</span>
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
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={view.agree}
                    onChange={view.toggleAgree}
                    style={{ width: '20px', height: '20px', margin: '0', accentColor: '#26262C' }}
                  />
                  주문 내용을 확인했고 결제에 동의해요
                </label>
                {view.expired ? (
                  <button className={cx('btn btn-p')} disabled style={{ minHeight: '56px', fontSize: '17px' }}>
                    결제 시간이 지났어요
                  </button>
                ) : short ? (
                  <button className={cx('btn btn-p')} disabled style={{ minHeight: '56px', fontSize: '17px' }}>
                    충전한 뒤 결제할 수 있어요
                  </button>
                ) : (
                  <button
                    className={cx('btn btn-p')}
                    onClick={openPay}
                    disabled={!view.canPay}
                    style={{ minHeight: '56px', fontSize: '17px' }}
                  >
                    {amount}원 결제하기
                  </button>
                )}
                {!view.expired && (
                  <button
                    className={cx('btn btn-q')}
                    onClick={view.askCancel}
                    disabled={view.busy}
                    style={{ alignSelf: 'center', fontSize: '14px' }}
                  >
                    주문 취소하기
                  </button>
                )}
              </aside>
            </div>
          )}
        </div>
        {pop.confirm && (
          <>
            <div className={cx('ov')}>
              <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby="pc-t">
                <h2 id="pc-t">{amount}원을 결제할까요?</h2>
                <dl className={cx('sum')}>
                  <dt>주문번호</dt>
                  <dd>{view.orderNumber}</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>{amount}원</strong>
                  </dd>
                  <dt>결제 수단</dt>
                  <dd>예치금</dd>
                  <dt>결제 후 남는 예치금</dt>
                  <dd>{left}원</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 뒤에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만 요청할 수 있어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className={cx('btn')} onClick={closePay}>
                    돌아가기
                  </button>
                  <button className={cx('btn btn-p')} onClick={startPay} disabled={!view.canPay}>
                    {amount}원 결제하기
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
                    예치금 {amount}원을 결제하는 중이에요.
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
        {pop.done && view.paid && (
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
                  <dd>{view.paid.orderNumber}</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>{view.paid.amount}원</strong>
                  </dd>
                  <dt>남은 예치금</dt>
                  <dd>{view.paid.left}원</dd>
                  <dt>자동 구매 확정</dt>
                  <dd>{view.paid.autoConfirm}</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 금액은 구매를 확정하기 전까지 팔레트가 보관해요. 장바구니에서 결제한 상품은 빠졌어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link className={cx('btn')} to="/">
                    쇼핑 계속하기
                  </Link>
                  <Link className={cx('btn btn-p')} to={view.paid.detailUrl}>
                    주문 상세 보기
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
        <NoticeModal notice={view.notice} onClose={view.closeNotice} />
      </div>
    </div>
  )
}
