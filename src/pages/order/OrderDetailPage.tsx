import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import type { NoticeRow } from '../../components/NoticeModal'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import { useBackTo } from '../../lib/useBackTo'
import { cancelOrder, confirmOrder, isPayable } from '../../lib/api/order'
import { getRefund, payRefundPickupFee, type Refund } from '../../lib/api/payment'
import { RETURN_REASON_LABEL, type RefundStatus } from '../../lib/api/returns'
import { getWallet } from '../../lib/api/wallet'
import { orderNotice } from '../../lib/notices/order'
import { pickupFeeNotice, pickupFeeShortageNotice } from '../../lib/notices/payment'
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

const REFUND_LABEL: Record<RefundStatus, string> = {
  NONE: '',
  PENDING: '예치금으로 환불하고 있어요',
  COMPLETED: '예치금으로 환불했어요',
  UNKNOWN: '환불 상태를 불러오지 못했어요. 잠시 후 다시 확인해 주세요',
}

/** 결제 서비스의 환불 내역 한 줄 (반품 승인 뒤). 환불 내역을 못 불러오면 주문 상세의 refundStatus로 대신 보여 줘요 */
function RefundRow({ refund }: { refund: Refund }) {
  const fee = refund.pickupFee > 0 ? `회수 택배비 ${won(refund.pickupFee)}` : null
  let head: string
  let desc: string
  switch (refund.status) {
    case 'COMPLETED':
      head = `${refund.refundedAt ? `${mdhm(refund.refundedAt)} · ` : ''}${won(refund.refundAmount)}`
      desc = fee ? `${fee}를 결제하고 상품값을 예치금으로 돌려드렸어요` : '예치금으로 돌려드렸어요'
      break
    case 'PICKUP_FEE_REQUIRED':
      head = `${won(refund.refundAmount)} 예정`
      desc = `${fee ?? '회수 택배비'}를 예치금으로 결제하면 상품값을 돌려드려요`
      break
    case 'REQUESTED':
      head = `${won(refund.refundAmount)} 예정`
      desc = '예치금으로 환불하고 있어요'
      break
    default: // FAILED_*
      head = `${won(refund.refundAmount)} 예정`
      desc = '환불을 마치지 못해 관리자가 확인하고 있어요. 확인되면 예치금으로 돌려드려요'
  }
  return (
    <div>
      <dt>환불</dt>
      <dd>
        {head}
        <span>{desc}</span>
      </dd>
    </div>
  )
}

/** 반품 진행 (요청·승인·거절). 거절되면 주문은 결제 완료·구매 확정으로 돌아가지만 거절 사유는 계속 보여 줘요 */
function ReturnInfo({ o, refund }: { o: OrderDetailX; refund: Refund | null }) {
  const rejected = !!o.returnRejectedAt
  const changeOfMind = o.returnReasonCode === 'CHANGE_OF_MIND'
  const title =
    o.status === 'RETURNED' ? '반품을 승인했어요' : rejected ? '반품 요청이 거절됐어요' : '반품 요청을 확인하고 있어요'
  return (
    <div className={`${styles.box} ${styles.returnBox}`}>
      <b>{title}</b>
      <dl className={styles.returnDl}>
        <div>
          <dt>요청</dt>
          <dd>
            {mdhm(o.returnRequestedAt!)} · {o.returnReasonCode ? RETURN_REASON_LABEL[o.returnReasonCode] : '사유 없음'}
            {o.returnReason && <span>{o.returnReason}</span>}
          </dd>
        </div>
        {rejected && (
          <div>
            <dt>거절</dt>
            <dd>
              {mdhm(o.returnRejectedAt!)}
              {o.returnRejectReason && <span>{o.returnRejectReason}</span>}
            </dd>
          </div>
        )}
        {o.status === 'RETURNED' && o.returnedAt && (
          <div>
            <dt>승인</dt>
            <dd>
              {mdhm(o.returnedAt)} · 결제 금액 {won(payAmountOf(o))}
              {!refund && o.refundStatus && o.refundStatus !== 'NONE' && <span>{REFUND_LABEL[o.refundStatus]}</span>}
            </dd>
          </div>
        )}
        {o.status === 'RETURNED' && refund && <RefundRow refund={refund} />}
      </dl>
      {!rejected && o.status === 'RETURN_REQUESTED' && (
        <p>
          {changeOfMind
            ? '단순 변심 반품은 승인된 뒤 회수 택배비를 예치금으로 결제하면 상품값(배송비 제외)을 예치금으로 돌려드려요.'
            : '승인되면 배송비를 포함한 결제 금액을 예치금으로 돌려드려요.'}
        </p>
      )}
    </div>
  )
}

/** 주문 상품 아래 안내. 반품 승인 주문은 환불 내역이 있으면 그 상태에 맞춰요 (환불 전이면 반품 영역이 안내해요) */
function holdOf(o: OrderDetailX, refund: Refund | null) {
  if (o.status === 'PAID') return null
  if (o.status === 'RETURNED' && refund) {
    if (refund.status !== 'COMPLETED') return null
    if (refund.pickupFee > 0) return '회수 택배비를 결제해 상품값을 예치금으로 돌려드렸어요.'
  }
  return ORDER_STATUS[o.status].hold ?? null
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
  const backToList = useBackTo('/orders')
  const order = useApi(() => getOrderDetail(orderId), [orderId])
  const o = order.data
  const remaining = useRemaining(o)
  const thumbOf = useProductThumbs(o?.items ?? [])
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [copied, setCopied] = useState(false)
  // 반품 승인(RETURNED) 주문만 환불 내역을 불러와요. 없으면(404) null
  const returned = o?.status === 'RETURNED'
  const refundApi = useApi(() => (returned ? getRefund(orderId) : Promise.resolve(null)), [orderId, returned])
  const refund = returned ? refundApi.data : null

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

  /** 회수 택배비 결제: 예치금에서 빠질 금액과 돌려받을 금액을 보여 주고 확인받아요 */
  const askPickupFee = async (r: Refund) => {
    if (busy) return
    // 결제 뒤 예치금을 미리 보여 주려고 잔액을 불러와요. 실패해도 확인 모달은 띄워요
    const balance = await getWallet()
      .then((w) => w.balance)
      .catch(() => null)
    // 회수 택배비만큼 없으면 결제해도 402라 바로 충전을 안내해요 (환불금과 상관없이 택배비가 먼저 빠져요)
    if (balance != null && balance < r.pickupFee) {
      setNotice(pickupFeeShortageNotice(r.pickupFee, r.pickupFee - balance))
      return
    }
    const rows: NoticeRow[] = [
      { label: '회수 택배비 (예치금에서 결제)', value: `−${won(r.pickupFee)}` },
      { label: '돌려받을 상품값', value: `+${won(r.refundAmount)}` },
    ]
    if (balance != null) {
      rows.unshift({ label: '내 예치금', value: won(balance) })
      rows.push({ label: '결제 후 예치금', value: won(balance - r.pickupFee + r.refundAmount), strong: true })
    }
    setNotice({
      title: `회수 택배비 ${won(r.pickupFee)}을 결제할까요?`,
      rows,
      body: '예치금에서 회수 택배비가 먼저 빠지고, 이어서 상품값을 예치금으로 돌려드려요.',
      actions: [{ label: '돌아가기' }, { label: '결제하기', primary: true, onClick: () => payPickupFee(r) }],
    })
  }
  const payPickupFee = async (r: Refund) => {
    if (busy) return
    setBusy(true)
    try {
      await payRefundPickupFee(orderId)
    } catch (e) {
      setNotice(pickupFeeNotice(e, { pickupFee: r.pickupFee }))
    } finally {
      setBusy(false)
      refundApi.reload()
      order.reload()
    }
  }

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
  // 구매 확정·반품은 배송 완료(배송지 없는 주문은 결제 완료) 뒤에만 할 수 있어요 (백엔드 409-ORDER_NOT_DELIVERED)
  const delivered = !!o && (!o.shippingAddress || !!o.deliveredAt || o.delivery?.status === 'DELIVERED')
  // 반품은 주문당 한 번만 요청할 수 있어요
  const returnable = !!o && o.status === 'PAID' && !o.returnRequestedAt && delivered
  if (o?.status === 'PAID' && !delivered) bottom = <BottomBar note="상품을 받은 뒤 구매 확정할 수 있어요" />
  else if (o?.status === 'PAID')
    bottom = returnable ? (
      <BottomBar equal note="구매를 확정하면 반품을 요청할 수 없어요">
        <Button size="lg" variant="outline" to={`/orders/${orderId}/return`}>
          반품 요청
        </Button>
        <Button size="lg" onClick={askConfirm} disabled={busy}>
          구매 확정하기
        </Button>
      </BottomBar>
    ) : (
      <BottomBar>
        <Button size="lg" onClick={askConfirm} disabled={busy}>
          구매 확정하기
        </Button>
      </BottomBar>
    )
  else if (refund?.status === 'PICKUP_FEE_REQUIRED')
    bottom = (
      <BottomBar note={`결제하면 ${won(refund.refundAmount)}을 예치금으로 돌려드려요`}>
        <Button size="lg" onClick={() => askPickupFee(refund)} disabled={busy}>
          회수 택배비 {won(refund.pickupFee)} 결제
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
      <PageHeader title="주문 상세" back={backToList} />
      {order.loading && !o && <Loading label="주문을 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {o && (
        <>
          <StatusSection o={o} refund={refund} remaining={remaining} copied={copied} onCopy={copy} />
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
            {holdOf(o, refund) && <p className={styles.hold}>{holdOf(o, refund)}</p>}
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
  refund,
  remaining,
  copied,
  onCopy,
}: {
  o: OrderDetailX
  refund: Refund | null
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
      {o.returnRequestedAt && <ReturnInfo o={o} refund={refund} />}
    </section>
  )
}
