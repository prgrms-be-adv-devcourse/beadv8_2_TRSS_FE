import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import f from '../../components/ui/form.module.css'
import { useApi } from '../../lib/useApi'
import { getOrderDetail } from './api'
import { NoticeModal, useProductThumbs, type Notice } from './common'
import { RETURN_REASONS, type ReturnRecord } from './returns'
import styles from './Return.module.css'

/**
 * 반품 요청 (시안 ⑪ Return) /orders/:orderId/return
 * 주문 항목은 실제 주문 상세(GET /orders/{orderId})로 보여 주고, 요청 보내기는 목업이에요.
 * TODO(API 미구현): POST /api/v1/orders/{orderId}/returns { orderItemIds, reason, detail } — 반품 요청
 */
export default function ReturnPage() {
  const navigate = useNavigate()
  const orderId = Number(useParams().orderId) || 0
  const order = useApi(() => getOrderDetail(orderId), [orderId])
  const o = order.data
  const thumbOf = useProductThumbs(o?.items ?? [])
  const [picked, setPicked] = useState<number[] | null>(null)
  const [reason, setReason] = useState<string>(RETURN_REASONS[1])
  const [detail, setDetail] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  // 처음에는 모든 항목을 골라 둬요
  const sel = picked ?? o?.items.map((r) => r.orderItemId) ?? []
  const toggle = (id: number) => setPicked(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])
  const refund = (o?.items ?? [])
    .filter((r) => sel.includes(r.orderItemId))
    .reduce((s, r) => s + r.lineAmount - (r.discountAmount ?? 0), 0)

  const submit = () => {
    if (!o || !sel.length) return
    // TODO(API 미구현): 반품 요청 API 호출. 지금은 화면에서만 반품 내역에 붙여 보여 줘요
    const first = o.items.find((r) => sel.includes(r.orderItemId))!
    const submitted: ReturnRecord = {
      returnId: Date.now(),
      orderId: o.orderId,
      status: 'REQUESTED',
      requestedAt: new Date().toISOString(),
      productName: first.productName,
      itemCount: sel.length,
      img: thumbOf(first),
      refundAmount: refund,
      reason: detail.trim() ? `${reason} · ${detail.trim()}` : reason,
    }
    setNotice({
      title: '반품을 요청했어요',
      body: `관리자가 확인한 뒤 승인되면 ${won(refund)}을 예치금으로 돌려드려요. (반품 기능은 준비 중이라 지금은 화면에서만 요청돼요)`,
      actions: [{ label: '반품 내역 보기', primary: true, onClick: () => navigate('/orders?tab=returns', { state: { submitted } }) }],
    })
  }

  const canReturn = o?.status === 'PAID'

  return (
    <AppFrame
      bottom={
        canReturn ? (
          <BottomBar>
            <Button size="lg" onClick={submit} disabled={!sel.length}>
              반품 요청하기
            </Button>
          </BottomBar>
        ) : undefined
      }
    >
      <PageHeader title="반품 요청" back={`/orders/${orderId}`} />
      {order.loading && !o && <Loading label="주문을 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {o && !canReturn && (
        <Empty
          title="반품을 요청할 수 없는 주문이에요"
          action={
            <Button to={`/orders/${orderId}`} variant="outline">
              주문 상세 보기
            </Button>
          }
        >
          결제를 마치고 구매 확정 전인 주문만 반품을 요청할 수 있어요.
        </Empty>
      )}
      {o && canReturn && (
        <>
          <section aria-labelledby="ri" className={styles.section}>
            <h2 id="ri" className={styles.h2}>
              반품할 상품
            </h2>
            {o.items.map((r) => (
              <label key={r.orderItemId} className={styles.item}>
                <input type="checkbox" checked={sel.includes(r.orderItemId)} onChange={() => toggle(r.orderItemId)} />
                <Thumb src={thumbOf(r)} width={48} height={52} radius={6} />
                <span className={styles.itemText}>
                  {r.productName}
                  {r.optionName && <small> · {r.optionName}</small>}
                  <b>{won(r.lineAmount - (r.discountAmount ?? 0))}</b>
                </span>
              </label>
            ))}
          </section>
          <fieldset className={styles.fieldset}>
            <legend className={styles.h2}>사유</legend>
            <div role="radiogroup" className={styles.reasons}>
              {RETURN_REASONS.map((label) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={reason === label}
                  className={`${styles.reason} ${reason === label ? styles.reasonOn : ''}`}
                  onClick={() => setReason(label)}
                >
                  <span className={reason === label ? styles.dotOn : styles.dot} />
                  {label}
                </button>
              ))}
            </div>
            <label htmlFor="why" className={styles.label}>
              내용
            </label>
            <textarea
              id="why"
              rows={3}
              maxLength={500}
              className={f.textarea}
              placeholder="어떤 점이 문제였는지 알려주세요"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
          </fieldset>
          <p className={styles.info}>
            반품 요청은 관리자가 확인해요. 승인되면 <b>{won(refund)}</b>을 예치금으로 돌려드려요.
          </p>
        </>
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}
