import { useState } from 'react'
import Button from '../../components/ui/Button'
import c from '../../components/ui/console.module.css'
import { errorMessage } from '../../lib/api'
import {
  COURIER_LABEL,
  getLogisticsDeliveries,
  type Courier,
  type DeliveryStatus,
  type LogisticsDelivery,
  type TrackingRequest,
} from '../../lib/api/logistics'
import { useApi } from '../../lib/useApi'
import s from './Logistics.module.css'

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}
/** '11.09' */
export const mmdd = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '—'
}
/** '11.09 14:22' */
export const mmddhm = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${mmdd(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '—'
}
/** 출고 뒤 지난 날 수 */
export const daysSince = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000)) : 0
}
export const isToday = (iso: string | null | undefined) => {
  const d = toDate(iso)
  const n = new Date()
  return !!d && d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate()
}

/** Delivery Tracker 상태 코드 → 화면 글자 */
const TRACKING_LABEL: Record<string, string> = {
  UNKNOWN: '알 수 없음',
  INFORMATION_RECEIVED: '송장 접수',
  AT_PICKUP: '집화 처리',
  IN_TRANSIT: '이동 중',
  OUT_FOR_DELIVERY: '배송 출발',
  ATTEMPT_FAIL: '배송 실패',
  DELIVERED: '배송 완료',
  AVAILABLE_FOR_PICKUP: '픽업 대기',
  EXCEPTION: '배송 이상',
}
export const trackingLabel = (code: string | null) => (code ? (TRACKING_LABEL[code] ?? code) : '조회 결과 없음')

/**
 * 택배사 조회가 안 되거나 오래 걸리는 배송인지
 * BE는 발송 2일 뒤부터 하루 한 번 안전망 확인을 해요(custom.delivery.safetyCheckAfterDays)
 */
export const needsCheck = (d: LogisticsDelivery) => {
  const days = daysSince(d.shippedAt)
  const code = d.lastTrackingStatus
  return code === 'EXCEPTION' || code === 'ATTEMPT_FAIL' || (!code && days >= 2) || days >= 7
}

export const COURIERS = Object.keys(COURIER_LABEL) as Courier[]
export const courierName = (d: LogisticsDelivery) => d.carrierName ?? (d.courier ? COURIER_LABEL[d.courier] : '—')

/** 상품 요약: '라이트 윈드브레이커 외 1' */
export const itemsSummary = (d: LogisticsDelivery) =>
  d.items.length === 0
    ? '—'
    : d.items.length === 1
      ? d.items[0].productName
      : `${d.items[0].productName} 외 ${d.items.length - 1}`

/** 송장번호 검사: 하이픈·공백 포함 40자 이내, 지운 뒤 영문·숫자 8~30자 */
export function trackingError(raw: string): string | null {
  const v = raw.trim()
  if (!v) return '송장번호를 입력해 주세요.'
  if (v.length > 40) return '송장번호가 너무 길어요.'
  const core = v.replace(/[-\s]/g, '')
  if (!/^[A-Za-z0-9]{8,30}$/.test(core)) return '송장번호는 숫자·영문 8~30자로 입력해 주세요.'
  return null
}

/** 메뉴·탭 옆 건수. 건수 API가 없어서 상태별 목록의 totalElements로 세요 */
export function useLogisticsCounts(deps: unknown[] = []) {
  return useApi(async () => {
    const count = (status: DeliveryStatus) => getLogisticsDeliveries({ status, size: 1 }).then((r) => r.totalElements)
    const [ready, shipping] = await Promise.all([count('READY'), count('SHIPPED')])
    return { ready, shipping }
  }, deps)
}

/** 택배사 + 송장번호 입력 (출고 · 송장 수정 공통) */
export function TrackingForm({
  initial,
  submitLabel,
  busyLabel,
  onSubmit,
  compact,
  idPrefix,
}: {
  initial?: { courier: Courier | null; trackingNumber: string | null }
  submitLabel: string
  busyLabel: string
  /** 실패하면 throw. 성공하면 입력을 비우지 않아요(목록에서 사라지거나 값이 바뀌어요) */
  onSubmit: (body: TrackingRequest) => Promise<void>
  compact?: boolean
  idPrefix: string
}) {
  const [courier, setCourier] = useState<Courier>(initial?.courier ?? 'CJ')
  const [trackingNumber, setTrackingNumber] = useState(initial?.trackingNumber ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (busy) return
    const msg = trackingError(trackingNumber)
    if (msg) {
      setError(msg)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit({ courier, trackingNumber: trackingNumber.trim() })
    } catch (e) {
      // 409-DELIVERY_STATE_INVALID(이미 출고됨) 등 백엔드 문구
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className={`${s.trackForm} ${compact ? s.trackCompact : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={s.trackInputs}>
        <select
          className={c.select}
          aria-label="택배사"
          id={`${idPrefix}-courier`}
          value={courier}
          onChange={(e) => setCourier(e.target.value as Courier)}
        >
          {COURIERS.map((k) => (
            <option key={k} value={k}>
              {COURIER_LABEL[k]}
            </option>
          ))}
        </select>
        <input
          className={s.trackInput}
          aria-label="송장번호"
          placeholder="송장번호"
          inputMode="text"
          autoComplete="off"
          value={trackingNumber}
          aria-invalid={!!error}
          onChange={(e) => {
            setTrackingNumber(e.target.value)
            if (error) setError('')
          }}
        />
        {compact && (
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? busyLabel : submitLabel}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className={s.trackError}>
          {error}
        </p>
      )}
      {!compact && (
        <div className={s.trackActions}>
          <Button type="submit" disabled={busy}>
            {busy ? busyLabel : submitLabel}
          </Button>
        </div>
      )}
    </form>
  )
}
