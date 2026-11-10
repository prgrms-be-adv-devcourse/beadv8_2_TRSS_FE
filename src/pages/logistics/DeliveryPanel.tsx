import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Badge, Thumb } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { DELIVERY_STATUS_LABEL, changeDeliveryTracking, type LogisticsDelivery } from '../../lib/api/logistics'
import { TrackingForm, courierName, daysSince, mmddhm, needsCheck, trackingLabel } from './shared'
import s from './Logistics.module.css'

/**
 * 배송 상세 (PC 오른쪽 패널 · 모바일 상세 화면 공통)
 * 받는 분 · 상품 · 택배 이동 · 송장 수정(배송 중만) · 배송 완료 처리(목업)
 */
export default function DeliveryPanel({
  delivery: d,
  onChanged,
  onNotice,
}: {
  delivery: LogisticsDelivery
  onChanged: (next: LogisticsDelivery) => void
  onNotice: (msg: string) => void
}) {
  const [askComplete, setAskComplete] = useState(false)
  const shipping = d.status === 'SHIPPED'
  const check = shipping && needsCheck(d)

  // TODO(API 미구현): 배송 이동 내역(택배사 이벤트 목록) API — 지금은 송장 등록 · 마지막 조회 상태만 보여요
  const events = [
    d.deliveredAt && { label: '배송 완료', at: mmddhm(d.deliveredAt) },
    shipping && { label: trackingLabel(d.lastTrackingStatus), at: '마지막 조회', warn: check },
    d.shippedAt && { label: '송장 등록', at: mmddhm(d.shippedAt) },
    { label: '결제 완료', at: mmddhm(d.paidAt) },
  ].filter(Boolean) as { label: string; at: string; warn?: boolean }[]

  return (
    <div className={s.panel}>
      <div className={s.panelHead}>
        <div>
          <h2 className={s.panelTitle}>배송 상세</h2>
          <p className={s.meta}>
            {d.orderNumber} · {d.receiverName}
          </p>
        </div>
        <Badge tone={d.status === 'DELIVERED' ? 'green' : check ? 'red' : d.status === 'SHIPPED' ? 'blue' : 'neutral'}>
          {check ? '확인 필요' : DELIVERY_STATUS_LABEL[d.status]}
        </Badge>
      </div>

      <section className={s.panelSection}>
        <h3 className={s.panelSub}>받는 분</h3>
        <p className={s.addr}>
          <b>
            {d.receiverName} · {d.receiverPhone}
          </b>
          <span>
            ({d.zipCode}) {d.address}
            {d.addressDetail ? `, ${d.addressDetail}` : ''}
          </span>
          {d.requestMessage && <span className={s.request}>요청 · {d.requestMessage}</span>}
        </p>
      </section>

      <section className={s.panelSection}>
        <h3 className={s.panelSub}>상품 {d.items.length}</h3>
        <ul className={s.items}>
          {d.items.map((it) => (
            <li key={it.orderItemId}>
              <Thumb width={40} height={40} />
              <span>
                <b>{it.productName}</b>
                <span>
                  {it.sellerName} · {it.optionName || '옵션 없음'} · {it.quantity}개
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {d.status !== 'READY' && (
        <section className={s.panelSection}>
          <h3 className={s.panelSub}>
            {courierName(d)} · {d.trackingNumber ?? '—'}
          </h3>
          <ol className={s.timeline}>
            {events.map((e, i) => (
              <li key={i} className={`${i === 0 ? s.tlNow : ''} ${e.warn ? s.tlWarn : ''}`}>
                <b>{e.label}</b>
                <span>{e.at}</span>
              </li>
            ))}
          </ol>
          {shipping && (
            <p className={s.meta}>
              출고 {daysSince(d.shippedAt)}일째. 택배사 조회로 받은 마지막 결과예요. 배송 완료가 확인되면 자동으로 배송
              완료로 바뀌어요.
            </p>
          )}
        </section>
      )}

      {shipping && (
        <section className={s.panelSection}>
          <h3 className={s.panelSub}>송장 수정</h3>
          <TrackingForm
            key={`${d.courier}-${d.trackingNumber}`}
            idPrefix={`edit-${d.deliveryId}`}
            initial={{ courier: d.courier, trackingNumber: d.trackingNumber }}
            submitLabel="수정하기"
            busyLabel="수정 중…"
            onSubmit={async (body) => {
              const next = await changeDeliveryTracking(d.deliveryId, body)
              onChanged(next)
              onNotice(`${d.orderNumber} 송장을 ${next.carrierName ?? ''} ${next.trackingNumber ?? ''}로 고쳤어요.`)
            }}
          />
          <p className={s.meta}>송장을 고쳐도 구매자에게 알림을 다시 보내지 않아요.</p>
          {check && (
            <div className={s.completeBox}>
              <span>택배사 조회가 안 되는데 실제로 배송이 끝났다면 직접 완료로 바꿀 수 있어요.</span>
              <Button variant="outline" size="sm" onClick={() => setAskComplete(true)}>
                배송 완료 처리
              </Button>
            </div>
          )}
        </section>
      )}

      {askComplete && (
        <Modal
          title="배송 완료로 바꿀까요?"
          onClose={() => setAskComplete(false)}
          actions={
            <>
              <Button variant="outline" onClick={() => setAskComplete(false)}>
                취소
              </Button>
              <Button
                onClick={() => {
                  // TODO(API 미구현): 배송 완료 수동 처리 API — 지금은 화면 안 상태만 바꿔요
                  onChanged({ ...d, status: 'DELIVERED', deliveredAt: new Date().toISOString() })
                  onNotice(`${d.orderNumber}을 배송 완료로 바꿨어요. (예시 동작)`)
                  setAskComplete(false)
                }}
              >
                완료 처리
              </Button>
            </>
          }
        >
          택배사 조회를 기다리지 않고 배송 완료로 바꿔요. 구매자 주문에도 배송 완료로 보여요.
        </Modal>
      )}
    </div>
  )
}
