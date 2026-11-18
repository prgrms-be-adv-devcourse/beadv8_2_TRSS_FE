import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Modal } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { completeDeliveryManually, type LogisticsDelivery } from '../../lib/api/logistics'

const REASON_MAX = 300

/** 지금 한국 시각 'yyyy-MM-ddTHH:mm' (브라우저 시간대와 상관없이 KST) */
function nowKst() {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16)
}

/**
 * 배송 수동 완료 모달 (관리자 전용 API).
 * 택배사 조회로 완료되지 않은 배송 중 배송을 관리자가 확인한 시각·사유로 완료해요.
 */
export default function DeliveryCompleteModal({
  deliveryId,
  label,
  shippedAt,
  onDone,
  onClose,
}: {
  deliveryId: number
  /** 안내에 쓸 이름 (주문번호 등) */
  label: string
  /** 송장 등록 시각 (KST LocalDateTime). 이보다 이른 시각은 고를 수 없어요 */
  shippedAt?: string | null
  onDone: (next: LogisticsDelivery) => void
  onClose: () => void
}) {
  const [max] = useState(nowKst)
  const [at, setAt] = useState(max)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const min = shippedAt ? shippedAt.slice(0, 16) : undefined
  const atError = !at
    ? '배송 완료 시각을 골라 주세요.'
    : at > nowKst()
      ? '지금보다 늦은 시각은 고를 수 없어요.'
      : min && at < min
        ? '송장 등록 시각보다 이른 시각은 고를 수 없어요.'
        : null
  const reasonError = reason.length > REASON_MAX ? `사유는 ${REASON_MAX}자 이내로 써 주세요.` : null
  const disabled = busy || !!atError || !!reasonError || !reason.trim()

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const next = await completeDeliveryManually(deliveryId, { deliveredAt: `${at}:00`, reason: reason.trim() })
      onDone(next)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <Modal
      title="배송 완료로 바꿀까요?"
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button onClick={submit} disabled={disabled}>
            {busy ? '처리 중…' : '완료 처리'}
          </Button>
        </>
      }
    >
      <p>{label}을 택배사 조회를 기다리지 않고 배송 완료로 바꿔요. 구매자 주문에도 배송 완료로 보여요.</p>
      <div className={f.field} style={{ marginTop: 16 }}>
        <label className={f.label} htmlFor={`complete-at-${deliveryId}`}>
          배송 완료 시각 (한국 시간)<span className={f.req}>*</span>
        </label>
        <input
          id={`complete-at-${deliveryId}`}
          type="datetime-local"
          className={f.input}
          value={at}
          min={min}
          max={max}
          onChange={(e) => setAt(e.target.value)}
          aria-invalid={!!atError}
        />
        {atError && <p className={f.error}>{atError}</p>}
      </div>
      <div className={f.field}>
        <label className={f.label} htmlFor={`complete-reason-${deliveryId}`}>
          사유<span className={f.req}>*</span>
        </label>
        <textarea
          id={`complete-reason-${deliveryId}`}
          className={f.textarea}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 택배사 조회가 멈춰 구매자에게 전화로 수령을 확인했어요"
          aria-invalid={!!reasonError}
        />
        {reasonError ? (
          <p className={f.error}>{reasonError}</p>
        ) : (
          <p className={f.help}>
            {reason.length}/{REASON_MAX}
          </p>
        )}
      </div>
      {error && (
        <p className={f.error} role="alert">
          {error}
        </p>
      )}
    </Modal>
  )
}
