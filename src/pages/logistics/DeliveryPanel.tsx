import { Badge, Thumb } from '../../components/ui/Misc'
import { DELIVERY_STATUS_LABEL, changeDeliveryTracking, type LogisticsDelivery } from '../../lib/api/logistics'
import { TrackingForm, courierName, daysSince, mmddhm, needsCheck, trackingLabel } from './shared'
import s from './Logistics.module.css'

/**
 * 배송 상세 (PC 오른쪽 패널 · 모바일 상세 화면 공통)
 * 받는 분 · 상품 · 택배 이동 · 송장 수정(배송 중만)
 * 배송 완료 수동 처리는 관리자 전용 API라, 관리자 실패 거래 화면의 배송 행에서 해요
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
              <Thumb src={it.thumbnailUrl} width={40} height={40} />
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
              <span>택배사 조회가 안 되는데 실제로 배송이 끝났다면 관리자에게 배송 완료 처리를 요청해 주세요.</span>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
