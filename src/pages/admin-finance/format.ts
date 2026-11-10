import type { YearMonth } from '../../lib/api/settlement'

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** '2026-11-09T14:20:00' → '11.09' */
export const mmdd = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '—'
}
/** '2026-11-09T14:20:00' → '11.09 14:20' */
export const mmddhm = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${mmdd(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '—'
}
/** '2026-11-09T14:20:00' → '2026.11.09 14:20' */
export const ymdhm = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${d.getFullYear()}.${mmddhm(iso)}` : '—'
}

/** Date → 'yyyy-MM' (브라우저 현지 시각 = KST 기준) */
export const ym = (d: Date): YearMonth => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`

/** 끝난 달 n개 (이번 달 제외). 오늘이 11월이면 10월, 9월, … */
export const finishedMonths = (n = 6) => {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - 1 - i, 1)))
}

/** 다음 재시도 일시 → '10분 뒤 다시 시도' (지났으면 '곧 다시 시도') */
export const retryHint = (iso: string | null) => {
  if (!iso) return '자동 재시도 대기'
  const minutes = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000)
  if (Number.isNaN(minutes)) return '자동 재시도 대기'
  if (minutes <= 0) return '곧 다시 시도'
  if (minutes < 60) return `${minutes}분 뒤 다시 시도`
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 뒤 다시 시도`
}

/** 판매자 이름. BE가 businessName을 못 주면 판매자 ID로 대신 */
export const sellerName = (s: { businessName: string | null; sellerId: number }) =>
  s.businessName?.trim() ? s.businessName : `판매자 #${s.sellerId}`

/** '2026-12-31' (date input) → '2026-12-31T00:00:00' */
export const dayStart = (date: string) => `${date}T00:00:00`
/** 종료일(그날까지 사용) → 다음 날 0시 (validUntil은 포함하지 않아요) */
export const dayAfter = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + 1)
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T00:00:00`
}
/** 오늘 'yyyy-MM-dd' */
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
/** validUntil(다음 날 0시) → 실제 마지막 사용일 'MM.dd' */
export const lastDay = (validUntil: string) => {
  const d = toDate(validUntil)
  if (!d) return '—'
  const prev = new Date(d.getTime() - 1)
  return `${pad(prev.getMonth() + 1)}.${pad(prev.getDate())}`
}
