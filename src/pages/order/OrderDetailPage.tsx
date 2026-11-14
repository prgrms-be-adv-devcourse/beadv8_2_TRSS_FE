import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import { cancelOrder, confirmOrder, isPayable } from '../../lib/api/order'
import { orderNotice } from '../../lib/notices/order'
import { ORDER_STATUS, PAYMENT_STATUS, autoConfirmDate, md } from '../../lib/orderStatus'
import { useApi } from '../../lib/useApi'
import { mmss, useRemaining } from '../../lib/useRemaining'
import { getOrderDetail, payAmountOf, type DeliveryStatus, type OrderDetailX } from './api'
import { NoticeModal, mdhm, useProductThumbs, ymd, type Notice } from './common'
import styles from './OrderDetail.module.css'

const SHIP_STEPS = ['결제 완료', '상품 준비', '배송 중', '배송 완료']
const DELIVERY_LABEL: Record<DeliveryStatus, string> = {
  READY: '상품 준비 중',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
}
const DELIVERY_AT: Record<DeliveryStatus, number> = { READY: 1, SHIPPED: 2, DELIVERED: 3 }

/** 배송 단계 위치 (0 결제 완료 ~ 3 배송 완료) */
function shipStep(o: OrderDetailX) {
  if (o.status === 'CONFIRMED') return 3
  if (o.delivery) return DELIVERY_AT[o.delivery.status]
  if (o.deliveredAt) return 3
  return 0
}

/** 결제 내역 줄 (결제 시도 오래된 순, 실패 포함). payments가 없는 예전 서버 응답이면 결제 완료 한 줄만 만들어요 */
function paymentRows(o: OrderDetailX) {
  if (!o.payments) {
    return o.paidAt ? [{ key: 0, time: mdhm(o.paidAt), ...PAYMENT_STATUS.PAID, amount: payAmountOf(o) }] : []
  }
  return o.payments.map((p) => {
    const st = PAYMENT_STATUS[p.status]
    return {
      key: p.paymentId,
      time: mdhm(p.attemptedAt),
      label: st.label,
      desc: p.status === 'REFUNDED' && p.refundedAt ? `${mdhm(p.refundedAt)} ${st.desc}` : st.desc,
      amount: p.amount,
    }
  })
}

/** 주문 상세 · 배송 조회 (시안 ⑧ OrderDetail) */
export default function OrderDetailPage() {
  const orderId = Number(useParams().orderId) || 0
  const order = useApi(() => getOrderDetail(orderId), [orderId])
  const o = order.data
  const remaining = useRemaining(o)
  const thumbOf = useProductThumbs(o?.items ?? [])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [copied, setCopied] = useState(false)

  /** 버튼 동작을 부르고 주문을 다시 불러와요. 실패하면 안내 모달을 띄워요. */
  const run = async (call: () => Promise<unknown>) => {
    if (busy) return
    const statusAtClick = o?.status
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
    setNotice({ title, body, actions: [{ label: '돌아가기' }, { label, primary: true, onClick: () => run(call) }] })

  const askConfirm = () =>
    ask(
      '구매를 확정할까요?',
      '확정한 뒤에는 반품을 요청할 수 없어요. 결제한 금액은 판매자에게 정산돼요.',
      '구매 확정하기',
      () => confirmOrder(orderId),
    )
  const askCancel = () =>
    ask('주문을 취소할까요?', '잡아 둔 재고가 풀리고, 상품은 장바구니에 그대로 남아요.', '주문 취소하기', () =>
      cancelOrder(orderId),
    )

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* 복사 권한이 없으면 아무것도 하지 않아요 */
    }
  }

  let bottom: ReactNode = undefined
  if (o?.status === 'PAID')
    bottom = (
      <BottomBar equal note="구매를 확정하면 반품을 요청할 수 없어요">
        <Button size="lg" variant="outline" to={`/orders/${orderId}/return`}>
          반품 요청
        </Button>
        <Button size="lg" onClick={askConfirm} disabled={busy}>
          구매 확정하기
        </Button>
      </BottomBar>
    )
  else if (o && isPayable(o.status) && remaining > 0)
    bottom = (
      <BottomBar equal>
        <Button size="lg" variant="outline" onClick={askCancel} disabled={busy}>
          주문 취소하기
        </Button>
        <Button size="lg" to={`/checkout?orderId=${orderId}`}>
          결제하기
        </Button>
      </BottomBar>
    )

  return (
    <AppFrame bottom={bottom}>
      <PageHeader title="주문 상세" back="/orders" />
      {order.loading && !o && <Loading label="주문을 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {o && (
        <>
          <StatusSection o={o} remaining={remaining} copied={copied} onCopy={copy} />
          <section aria-labelledby="oi" className={styles.section}>
            <div className={styles.headRow}>
              <h2 id="oi" className={styles.h2}>
                주문 상품
              </h2>
              <button type="button" className={styles.fold} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? '접기 ⌃' : '펼치기 ⌄'}
              </button>
            </div>
            {open ? (
              <ul className={styles.items}>
                {o.items.map((r) => (
                  <li key={r.orderItemId}>
                    <Thumb src={thumbOf(r)} width={56} height={60} radius={6} />
                    <div className={styles.itemInfo}>
                      <p className={styles.seller}>{r.sellerName}</p>
                      <Link to={`/product/${r.productId}`} className={styles.itemName}>
                        {r.productName}
                      </Link>
                      <p className={styles.muted}>
                        {r.optionName ? `${r.optionName} · ` : ''}
                        {won(r.unitPrice)} × {r.quantity}
                      </p>
                      {o.status === 'CONFIRMED' && (
                        <Link
                          to={`/reviews/write?orderItemId=${r.orderItemId}`}
                          // 리뷰 쓰기 화면은 상품 정보를 state(ReviewWriteState)에서만 읽어요
                          state={{
                            productName: r.productName,
                            optionName: r.optionName,
                            thumbnailUrl: thumbOf(r),
                            quantity: r.quantity,
                          }}
                          className={styles.review}
                        >
                          리뷰 쓰기
                        </Link>
                      )}
                    </div>
                    <div className={styles.itemPrice}>
                      <b>{won(r.lineAmount)}</b>
                      {!!r.discountAmount && <span>쿠폰 −{won(r.discountAmount)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.summary}>
                <Thumb src={o.items[0] ? thumbOf(o.items[0]) : null} width={56} height={60} radius={6} />
                <div>
                  <p className={styles.itemName}>
                    {o.items[0]?.productName}
                    {o.items.length > 1 ? ` 외 ${o.items.length - 1}개` : ''}
                  </p>
                  <p className={styles.muted}>{[...new Set(o.items.map((r) => r.sellerName))].join(' · ')}</p>
                </div>
              </div>
            )}
            <dl className={styles.pay}>
              <div>
                <dt>결제 수단</dt>
                <dd>예치금</dd>
              </div>
              <div>
                <dt>상품 금액</dt>
                <dd>{won(o.totalPrice)}</dd>
              </div>
              {!!o.productDiscountAmount && (
                <div>
                  <dt>상품 쿠폰 할인</dt>
                  <dd>−{won(o.productDiscountAmount)}</dd>
                </div>
              )}
              {!!o.cartCouponDiscountAmount && (
                <div>
                  <dt>장바구니 쿠폰 할인</dt>
                  <dd>−{won(o.cartCouponDiscountAmount)}</dd>
                </div>
              )}
              <div>
                <dt>배송비</dt>
                <dd>{o.shippingFee ? won(o.shippingFee) : '무료'}</dd>
              </div>
              <div className={styles.payTotal}>
                <dt>결제 금액</dt>
                <dd>{won(payAmountOf(o))}</dd>
              </div>
            </dl>
            {ORDER_STATUS[o.status].hold && o.status !== 'PAID' && (
              <p className={styles.hold}>{ORDER_STATUS[o.status].hold}</p>
            )}
          </section>
          {o.shippingAddress && (
            <section aria-labelledby="sa" className={styles.section}>
              <h2 id="sa" className={styles.h2}>
                배송지
              </h2>
              <div className={styles.addr}>
                <b>{o.shippingAddress.receiverName}</b>
                <span>
                  ({o.shippingAddress.zipCode}) {o.shippingAddress.address}
                  {o.shippingAddress.addressDetail ? ` ${o.shippingAddress.addressDetail}` : ''}
                </span>
                {o.shippingAddress.requestMessage && (
                  <span className={styles.muted}>{o.shippingAddress.requestMessage}</span>
                )}
              </div>
            </section>
          )}
          <section aria-labelledby="ph" className={`${styles.section} ${styles.last}`}>
            <h2 id="ph" className={styles.h2}>
              결제 내역
            </h2>
            {paymentRows(o).length ? (
              <ul className={styles.payments}>
                {paymentRows(o).map((p) => (
                  <li key={p.key}>
                    <div>
                      <b>{p.label}</b>
                      <span className={styles.muted}>
                        {p.time} · {p.desc}
                      </span>
                    </div>
                    <span>{won(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>아직 결제하지 않았어요.</p>
            )}
          </section>
        </>
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}

function StatusSection({
  o,
  remaining,
  copied,
  onCopy,
}: {
  o: OrderDetailX
  remaining: number
  copied: boolean
  onCopy: (text: string) => void
}) {
  const st = ORDER_STATUS[o.status]
  const shipping = !!o.shippingAddress && (o.status === 'PAID' || o.status === 'CONFIRMED')
  const step = shipStep(o)
  const d = o.delivery
  let title = st.label
  if (o.status === 'PAID' && o.shippingAddress)
    title = d ? DELIVERY_LABEL[d.status] : o.deliveredAt ? '배송 완료' : '결제 완료'
  const autoAt = o.paidAt ? autoConfirmDate(o.paidAt) : null

  // TODO(API 미구현): 배송 추적 이력(지점·시각 목록) — 지금은 주문 상세의 시각(결제·출고·배송 완료)으로만 이동 내역을 만들어요
  const events: Array<{ label: string; at: string }> = []
  const deliveredAt = d?.deliveredAt ?? o.deliveredAt
  if (deliveredAt) events.push({ label: '배송 완료', at: deliveredAt })
  if (d?.shippedAt) events.push({ label: `배송 출발${d.carrierName ? ` · ${d.carrierName}` : ''}`, at: d.shippedAt })
  if (o.paidAt) events.push({ label: '결제 완료', at: o.paidAt })

  return (
    <section aria-label="주문 상태" className={styles.status}>
      <p className={styles.meta}>
        {ymd(o.orderedAt)} 주문 · {o.orderNumber}
      </p>
      <p className={styles.bigTitle}>{title}</p>

      {shipping && (
        <ol aria-label="진행 단계" className={styles.steps}>
          {SHIP_STEPS.map((label, i) => (
            <li
              key={label}
              aria-current={i === step ? 'step' : undefined}
              className={i < step ? styles.done : i === step ? styles.now : styles.next}
            >
              {i < SHIP_STEPS.length - 1 && <span className={i < step ? styles.lineOn : styles.line} />}
              <span className={styles.dot}>{i === step && <span />}</span>
              {label}
            </li>
          ))}
        </ol>
      )}

      {shipping && o.status === 'PAID' && (
        <>
          {o.deliveryUnavailable ? (
            <p className={styles.box}>배송 정보를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
          ) : d?.trackingNumber ? (
            <div className={styles.tracking}>
              <Icon name="truck" size={22} />
              <div>
                <b>{d.carrierName ?? '택배사'}</b>
                <span>{d.trackingNumber}</span>
              </div>
              <button type="button" onClick={() => onCopy(d.trackingNumber!)}>
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          ) : (
            <p className={styles.box}>판매자가 상품을 준비하고 있어요. 출고되면 송장번호를 알려 드려요.</p>
          )}
          {events.length > 0 && (
            <ol aria-label="이동 내역" className={styles.events}>
              {events.map((e, i) => (
                <li key={e.label} className={i === 0 ? styles.eventNow : ''}>
                  <b>{e.label}</b>
                  <span>{mdhm(e.at)}</span>
                </li>
              ))}
            </ol>
          )}
          {autoAt && <p className={styles.hint}>{md(autoAt)}에 자동으로 구매 확정돼요</p>}
        </>
      )}

      {!shipping && o.status === 'PAID' && autoAt && (
        <p className={styles.box}>구매를 확정하기 전까지 팔레트가 보관해요 {md(autoAt)}에 자동으로 확정돼요</p>
      )}
      {o.status === 'CONFIRMED' && o.confirmedAt && (
        <p className={styles.box}>{mdhm(o.confirmedAt)}에 구매를 확정했어요 주문 상품을 펼쳐 리뷰를 쓸 수 있어요</p>
      )}
      {isPayable(o.status) &&
        (remaining > 0 ? (
          <p className={styles.warnBox}>
            <b>{mmss(remaining)}</b> 안에 결제하지 않으면 주문이 취소돼요
          </p>
        ) : (
          <p className={styles.box}>결제 가능 시간이 지났어요. 이 주문은 곧 자동으로 취소돼요</p>
        ))}
      {o.status === 'CANCELED' && o.canceledAt && (
        <p className={styles.box}>{mdhm(o.canceledAt)}에 취소된 주문이에요</p>
      )}
      {(o.status === 'RETURN_REQUESTED' || o.status === 'RETURNED') && (
        <p className={styles.box}>
          {o.status === 'RETURN_REQUESTED'
            ? '반품 요청을 관리자가 확인하고 있어요. 승인되면 예치금으로 돌려드려요.'
            : st.hold}{' '}
          <Link to="/orders?tab=returns">반품 내역 보기</Link>
        </p>
      )}
    </section>
  )
}
