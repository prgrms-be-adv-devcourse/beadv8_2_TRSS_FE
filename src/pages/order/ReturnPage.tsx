import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import f from '../../components/ui/form.module.css'
import { RETURN_REASON_LABEL, RETURN_REASON_MAX, requestReturn, type ReturnReasonCode } from '../../lib/api/returns'
import { returnNotice } from '../../lib/notices/order'
import { useApi } from '../../lib/useApi'
import { getOrderDetail, payAmountOf, type OrderDetailX } from './api'
import { NoticeModal, useProductThumbs, type Notice } from './common'
import styles from './Return.module.css'

const REASONS = Object.keys(RETURN_REASON_LABEL) as ReturnReasonCode[]

/** 배송지가 있는 주문은 배송이 끝난 뒤에만 반품할 수 있어요 */
const delivered = (o: OrderDetailX) => !o.shippingAddress || !!o.deliveredAt || o.delivery?.status === 'DELIVERED'

/**
 * 반품 요청 (시안 ⑪ Return) /orders/:orderId/return
 * POST /api/v1/orders/{orderId}/returns { reasonCode, reason } — 주문 전체 단위, 주문당 한 번
 * 환불 금액은 배송비를 포함한 결제 금액 전액이에요.
 */
export default function ReturnPage() {
  const navigate = useNavigate()
  const orderId = Number(useParams().orderId) || 0
  const order = useApi(() => getOrderDetail(orderId), [orderId])
  const o = order.data
  const thumbOf = useProductThumbs(o?.items ?? [])
  const [reason, setReason] = useState<ReturnReasonCode>('DEFECTIVE')
  const [detail, setDetail] = useState('')
  const [showError, setShowError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const refund = o ? payAmountOf(o) : 0
  const needDetail = reason === 'OTHER' && !detail.trim()

  const submit = async () => {
    if (!o || busy) return
    if (needDetail) {
      setShowError(true)
      return
    }
    setBusy(true)
    try {
      await requestReturn(o.orderId, reason, detail)
      setNotice({
        title: '반품을 요청했어요',
        body: `관리자가 확인한 뒤 승인되면 ${won(refund)}을 예치금으로 돌려드려요.`,
        actions: [
          { label: '주문 상세 보기', onClick: () => navigate(`/orders/${o.orderId}`, { replace: true }) },
          { label: '반품 내역 보기', primary: true, onClick: () => navigate('/orders?tab=returns', { replace: true }) },
        ],
      })
    } catch (e) {
      setNotice(returnNotice(e))
      order.reload()
    } finally {
      setBusy(false)
    }
  }

  const blockReason = !o
    ? null
    : o.returnRequestedAt
      ? '이미 반품을 요청한 주문이에요. 반품은 주문당 한 번만 요청할 수 있어요.'
      : o.status !== 'PAID'
        ? '결제를 마치고 구매 확정 전인 주문만 반품을 요청할 수 있어요.'
        : !delivered(o)
          ? '배송이 끝난 뒤부터 구매 확정 전까지 반품을 요청할 수 있어요.'
          : null
  const canReturn = !!o && !blockReason

  return (
    <AppFrame
      bottom={
        canReturn ? (
          <BottomBar>
            <Button size="lg" onClick={submit} disabled={busy}>
              {busy ? '요청하는 중…' : '반품 요청하기'}
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      <PageHeader title="반품 요청" back={`/orders/${orderId}`} />
      {order.loading && !o && <Loading label="주문을 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {o && blockReason && (
        <Empty
          title="반품을 요청할 수 없는 주문이에요"
          action={
            <Button to={`/orders/${orderId}`} variant="outline">
              주문 상세 보기
            </Button>
          }
        >
          {blockReason}
        </Empty>
      )}
      {o && canReturn && (
        <>
          <section aria-labelledby="ri" className={styles.section}>
            <h2 id="ri" className={styles.h2}>
              반품할 상품 <small className={styles.h2Sub}>주문 전체를 반품해요</small>
            </h2>
            {o.items.map((r) => (
              <div key={r.orderItemId} className={styles.item}>
                <Thumb src={thumbOf(r)} width={48} height={52} radius={6} />
                <span className={styles.itemText}>
                  {r.productName}
                  {r.optionName && <small> · {r.optionName}</small>}
                  <small> · {r.quantity}개</small>
                  <b>{won(r.lineAmount - (r.discountAmount ?? 0))}</b>
                </span>
              </div>
            ))}
          </section>
          <fieldset className={styles.fieldset}>
            <legend className={styles.h2}>사유</legend>
            <div role="radiogroup" className={styles.reasons}>
              {REASONS.map((code) => (
                <button
                  key={code}
                  type="button"
                  role="radio"
                  aria-checked={reason === code}
                  className={`${styles.reason} ${reason === code ? styles.reasonOn : ''}`}
                  onClick={() => {
                    setReason(code)
                    setShowError(false)
                  }}
                >
                  <span className={reason === code ? styles.dotOn : styles.dot} />
                  {RETURN_REASON_LABEL[code]}
                </button>
              ))}
            </div>
            <label htmlFor="why" className={styles.label}>
              내용{reason === 'OTHER' ? ' (필수)' : ' (선택)'}
            </label>
            <textarea
              id="why"
              rows={3}
              maxLength={RETURN_REASON_MAX}
              className={f.textarea}
              placeholder="어떤 점이 문제였는지 알려주세요"
              value={detail}
              aria-invalid={showError && needDetail}
              onChange={(e) => {
                setDetail(e.target.value)
                setShowError(false)
              }}
            />
            {showError && needDetail && (
              <p role="alert" className={styles.error}>
                기타를 골랐다면 어떤 점이 문제였는지 적어 주세요
              </p>
            )}
          </fieldset>
          <p className={styles.info}>
            반품 요청은 관리자가 확인해요. 승인되면 배송비를 포함한 결제 금액 <b>{won(refund)}</b>을 예치금으로
            돌려드려요. 사용한 쿠폰은 돌려드리지 않아요.
          </p>
        </>
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}
