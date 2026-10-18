import { Link, useParams } from 'react-router-dom'
import { makeCx, css, NOTICE } from '../lib/ui'
import styles from './OrderDetail.module.css'
import BuyerHeader from '../components/BuyerHeader'
import NoticeModal, { type Notice } from '../components/NoticeModal'
import { orderNotice } from '../lib/notices/order'

import { useEffect, useState } from 'react'
import { won } from '../lib/ui'
import { cancelOrder, confirmOrder, getOrder, type OrderDetail } from '../lib/api/order'
import { useApi } from '../lib/useApi'
import { ORDER_STATUS as STATUS, autoConfirmDate, md, mdhm, mmss } from '../lib/orderStatus'

/** 반품 요청 API가 준비되면 true로 바꿔요. 그 전까지 '반품 요청하기' 버튼과 입력 화면을 숨겨요. */
const RETURN_ENABLED = false

const cx = makeCx(styles)

/** 결제 남은 시간(초). 서버가 준 remainingSeconds부터 1초씩 줄여요. */
function useRemaining(order: OrderDetail | null) {
  const [deadline, setDeadline] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setDeadline(order && order.remainingSeconds > 0 ? Date.now() + order.remainingSeconds * 1000 : null)
  }, [order])
  useEffect(() => {
    if (deadline === null) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [deadline])
  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000))
}

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useOrderDetailView() {
  const { orderId: idParam } = useParams()
  const orderId = Number(idParam) || 0
  const order = useApi(() => getOrder(orderId), [orderId])
  const o = order.data
  const remaining = useRemaining(o)

  const [ret, setRet] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  /** 버튼 동작을 부르고 주문을 다시 불러와요. 실패하면 안내 모달을 띄워요. */
  const run = async (call: () => Promise<unknown>) => {
    if (busy) return
    const statusAtClick = order.data?.status
    setBusy(true)
    try {
      await call()
    } catch (e) {
      setNotice(orderNotice(e, { status: statusAtClick }))
    } finally {
      setBusy(false)
      order.reload()
    }
  }

  /** 되돌릴 수 없는 동작은 먼저 확인 모달을 띄워요. */
  const ask = (title: string, body: string, label: string, call: () => Promise<unknown>) =>
    setNotice({
      title,
      body,
      actions: [{ label: '돌아가기' }, { label, primary: true, onClick: () => run(call) }],
    })

  const status = o?.status ?? 'CREATED'
  const m = STATUS[status]
  const pending = status === 'CREATED' || status === 'PAYMENT_FAILED'
  const autoAt = o?.paidAt ? autoConfirmDate(o.paidAt) : null
  const labels: Array<[string, string]> = o
    ? [
        ['주문 생성', mdhm(new Date(o.orderedAt))],
        ['결제 완료', o.paidAt ? mdhm(new Date(o.paidAt)) : '결제 전'],
        [
          '구매 확정',
          o.confirmedAt
            ? mdhm(new Date(o.confirmedAt))
            : autoAt && status === 'PAID'
              ? `${mdhm(autoAt).slice(0, 5)} 자동 확정 예정`
              : '-',
        ],
      ]
    : []
  const view = {
    loading: order.loading && !o,
    error: order.error,
    ready: !!o,
    orderId,
    orderNumber: o?.orderNumber ?? '',
    orderedText: o
      ? (() => {
          const d = new Date(o.orderedAt)
          return `${d.getFullYear()}년 ${md(d)} 주문`
        })()
      : '',
    steps: labels.map(([label, when], i) => ({
      n: i + 1,
      label,
      when,
      dot:
        i <= m.at
          ? 'background:#26262C;color:#fff'
          : 'background:#fff;color:#5F5F6A;box-shadow:inset 0 0 0 1.5px #D5D5DD',
      line: i < m.at ? '#26262C' : i === 2 ? 'transparent' : '#E8E8ED',
      color: i <= m.at ? '#26262C' : '#5F5F6A',
    })),
    st: {
      label: m.label,
      chip: m.chip,
      hold:
        status === 'PAID'
          ? `구매를 확정하기 전까지 팔레트가 보관해요.${autoAt ? ` ${md(autoAt)}에 자동으로 확정돼요.` : ''}`
          : m.hold,
      created: pending && remaining > 0,
      expired: pending && remaining <= 0,
      paid: status === 'PAID',
      returning: status === 'RETURN_REQUESTED',
      canceled: status === 'CANCELED',
    },
    canceledText: o?.canceledAt ? mdhm(new Date(o.canceledAt)) : '',
    timer: mmss(remaining),
    items: (o?.items ?? []).map((r) => ({
      key: r.orderItemId,
      name: r.productName,
      option: r.optionName,
      productUrl: `/product/${r.productId}`,
      shop: r.sellerName,
      unit: won(r.unitPrice),
      qty: r.quantity,
      line: won(r.lineAmount),
    })),
    amount: won(o?.totalPrice ?? 0),
    paidText: o?.paidAt ? mdhm(new Date(o.paidAt)) : '',
    busy,
    notice,
    closeNotice: () => setNotice(null),
    cancel: () =>
      ask('주문을 취소할까요?', '잡아 둔 재고가 풀리고, 상품은 장바구니에 그대로 남아요.', '주문 취소하기', () =>
        cancelOrder(orderId),
      ),
    confirm: () =>
      ask(
        '구매를 확정할까요?',
        '확정한 뒤에는 반품을 요청할 수 없어요. 결제한 금액은 판매자에게 정산돼요.',
        '구매 확정하기',
        () => confirmOrder(orderId),
      ),
    canReturn: RETURN_ENABLED,
    showReturn: RETURN_ENABLED && ret && status === 'PAID',
    openReturn: () => setRet(true),
    closeReturn: () => setRet(false),
  }
  return view
}

/** 주문 상세 */
export default function OrderDetailPage() {
  const view = useOrderDetailView()
  const { closeReturn, openReturn, showReturn, st, steps, items, busy } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="orders" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '24px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Link to="/orders" className={cx('sub')} style={{ fontWeight: '500' }}>
            ‹ 주문 내역
          </Link>
          {view.loading && <p className={cx('sub')}>주문을 불러오고 있어요.</p>}
          {view.error && (
            <p role="alert" style={NOTICE}>
              {view.error}
            </p>
          )}
          {view.ready && (
            <>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span className={cx('sub num')}>{view.orderedText}</span>
                  <h1
                    className={cx('num')}
                    style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}
                  >
                    {view.orderNumber}
                  </h1>
                  <span
                    className={cx(`chip ${st.chip}`)}
                    style={{ alignSelf: 'flex-start', fontSize: '13px', minHeight: '28px', padding: '0 10px' }}
                  >
                    {st.label}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {st.created && (
                    <>
                      <Link className={cx('btn btn-p')} to={`/checkout?orderId=${view.orderId}`}>
                        결제하기
                      </Link>
                      <button className={cx('btn')} onClick={view.cancel} disabled={busy}>
                        주문 취소하기
                      </button>
                    </>
                  )}
                  {st.paid && (
                    <>
                      <button className={cx('btn btn-p')} onClick={view.confirm} disabled={busy}>
                        구매 확정하기
                      </button>
                      {view.canReturn && (
                        <button className={cx('btn')} onClick={openReturn} disabled={busy}>
                          반품 요청하기
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {st.created && (
                <>
                  <div style={{ background: '#FFF1E8', borderRadius: '6px', padding: '14px 18px', color: '#9A3209' }}>
                    <strong className={cx('num')}>{view.timer}</strong> 안에 결제하지 않으면 주문이 취소돼요.
                  </div>
                </>
              )}
              {st.expired && (
                <div style={{ background: '#F3F1F6', borderRadius: '6px', padding: '14px 18px', color: '#45454F' }}>
                  결제 가능 시간이 지났어요. 이 주문은 곧 자동으로 취소돼요.
                </div>
              )}
              {st.canceled && (
                <div style={{ background: '#F3F1F6', borderRadius: '6px', padding: '14px 18px', color: '#45454F' }}>
                  <span className={cx('num')}>{view.canceledText}</span>에 취소된 주문이에요.
                </div>
              )}
              {st.returning && (
                <>
                  <div style={{ background: '#F3F1F6', borderRadius: '6px', padding: '14px 18px', color: '#45454F' }}>
                    반품 요청을 관리자가 확인하고 있어요. 승인되면 예치금으로 돌려드려요.
                  </div>
                </>
              )}
              <section className={cx('panel')} style={{ padding: '24px 28px' }}>
                <ol
                  style={{
                    listStyle: 'none',
                    margin: '0',
                    padding: '0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
                    gap: '12px',
                  }}
                >
                  {steps.map((s, sIndex) => (
                    <li style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} key={sIndex}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          className={cx('num')}
                          style={css(
                            `width:28px;height:28px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;${s.dot}`,
                          )}
                        >
                          {s.n}
                        </span>
                        <span style={css(`flex:1;height:2px;background:${s.line}`)}></span>
                      </div>
                      <strong style={css(`font-size:15px;color:${s.color}`)}>{s.label}</strong>
                      <span className={cx('sub num')}>{s.when}</span>
                    </li>
                  ))}
                </ol>
              </section>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
                <div
                  style={{ flex: '999 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}
                >
                  <section className={cx('panel')} style={{ padding: '24px' }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700' }}>주문 상품</h2>
                    <div style={{ overflowX: 'auto' }}>
                      <table className={cx('num')}>
                        <thead>
                          <tr>
                            <th>상품</th>
                            <th>판매자</th>
                            <th>단가</th>
                            <th>수량</th>
                            <th style={{ textAlign: 'right' }}>금액</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((r) => (
                            <tr key={r.key}>
                              <td>
                                <Link to={r.productUrl}>{r.name}</Link>
                                {r.option && (
                                  <span className={cx('sub')} style={{ display: 'block' }}>
                                    {r.option}
                                  </span>
                                )}
                              </td>
                              <td>{r.shop}</td>
                              <td>{r.unit}원</td>
                              <td>{r.qty}</td>
                              <td style={{ textAlign: 'right', fontWeight: '700' }}>{r.line}원</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section className={cx('panel')} style={{ padding: '24px' }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700' }}>결제 내역</h2>
                    {view.paidText ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table className={cx('num')}>
                          <thead>
                            <tr>
                              <th>시각</th>
                              <th>결과</th>
                              <th>내용</th>
                              <th style={{ textAlign: 'right' }}>금액</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td>{view.paidText}</td>
                              <td>
                                <span className={cx('chip c-ok')}>결제 완료</span>
                              </td>
                              <td>예치금에서 결제, 구매 확정까지 보관</td>
                              <td style={{ textAlign: 'right' }}>{view.amount}원</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className={cx('sub')} style={{ margin: '8px 0 0' }}>
                        아직 결제하지 않았어요.
                      </p>
                    )}
                  </section>
                  {showReturn && (
                    <>
                      <section
                        id="return"
                        className={cx('panel')}
                        style={{
                          padding: '24px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '14px',
                          outline: '2px solid #26262C',
                        }}
                      >
                        <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>반품 요청</h2>
                        <p className={cx('sub')} style={{ margin: '0' }}>
                          주문 전체를 반품해요. 한 주문에 한 번만 요청할 수 있어요.
                        </p>
                        <div>
                          <label
                            htmlFor="rs"
                            style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}
                          >
                            사유
                          </label>
                          <select id="rs" className={cx('in')} style={{ width: '100%', maxWidth: '320px' }}>
                            <option>단순 변심</option>
                            <option>상품 불량</option>
                            <option>오배송</option>
                            <option>기타</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="rd"
                            style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}
                          >
                            자세한 내용
                          </label>
                          <textarea
                            id="rd"
                            className={cx('in')}
                            style={{ width: '100%', minHeight: '96px', padding: '12px 14px' }}
                          ></textarea>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className={cx('btn')} onClick={closeReturn}>
                            닫기
                          </button>
                          <button className={cx('btn btn-p')} disabled title="반품 API가 준비되면 연결해요">
                            반품 요청하기
                          </button>
                        </div>
                      </section>
                    </>
                  )}
                </div>
                <aside
                  className={cx('panel')}
                  style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                >
                  <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>결제 정보</h2>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className={cx('sub')} style={{ fontSize: '15px' }}>
                      결제 수단
                    </span>
                    <span>예치금</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className={cx('sub')} style={{ fontSize: '15px' }}>
                      결제 금액
                    </span>
                    <strong className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
                      {view.amount}원
                    </strong>
                  </div>
                  <div style={{ background: '#FAFAFB', borderRadius: '8px', padding: '14px', fontSize: '14px' }}>
                    {st.hold}
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
      </div>
      <NoticeModal notice={view.notice} onClose={view.closeNotice} />
    </div>
  )
}
