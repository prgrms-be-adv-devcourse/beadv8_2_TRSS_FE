import type { YearMonth } from './api/settlement'

/**
 * 정산서 조회 기간 (1개월 단위, 최대 12개월)
 * 판매자 정산(S5)과 관리자 월 정산(A6)이 같이 써요. 백엔드 custom.settlement.maxSearchMonths와 같은 규칙이에요.
 */

/** 한 번에 볼 수 있는 최대 개월 수 */
export const MAX_SEARCH_MONTHS = 12
/** 시작·끝 월 선택지에 보여 줄 개월 수 (지난달부터 거꾸로). 최근 12개월만 조회할 수 있어요 */
export const MONTH_OPTION_COUNT = MAX_SEARCH_MONTHS

/** Date → 'yyyy-MM' (브라우저 현지 시각 = KST 기준) */
export const toYm = (d: Date): YearMonth => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** 'yyyy-MM'에 n개월을 더해요 (n이 음수면 빼요) */
export const addMonths = (ym: YearMonth, n: number): YearMonth => {
  const [y, m] = ym.split('-').map(Number)
  return toYm(new Date(y, m - 1 + n, 1))
}

/** 두 달 사이 개월 수 (양 끝 포함). 예: 2026-05 ~ 2026-10 → 6 */
export const monthSpan = (from: YearMonth, to: YearMonth) => {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  return (ty - fy) * 12 + (tm - fm) + 1
}

/** '2026-05' → '2026.05' */
export const dotMonth = (ym: YearMonth) => ym.replace('-', '.')

/** 정산서는 끝난 달만 만들어지므로 끝 월은 지난달까지예요 */
export const lastMonth = () => addMonths(toYm(new Date()), -1)

/** 시작·끝 월 선택지 (지난달부터 MONTH_OPTION_COUNT개, 최근 달이 먼저) */
export const monthOptions = (): YearMonth[] => {
  const last = lastMonth()
  return Array.from({ length: MONTH_OPTION_COUNT }, (_, i) => addMonths(last, -i))
}

/** 최근 n개월 (지난달까지) */
export const recentRange = (n: number) => {
  const to = lastMonth()
  return { from: addMonths(to, -(n - 1)), to }
}

/**
 * 고른 기간을 규칙에 맞게 고쳐요.
 * 시작이 끝보다 늦거나 최대 개월 수를 넘으면, 방금 고르지 않은 쪽(changed의 반대)을 맞춰요. 끝 월은 지난달을 넘지 않아요.
 */
export const fixRange = (from: YearMonth, to: YearMonth, changed: 'from' | 'to') => {
  let f = from
  let t = to
  if (f > t) {
    if (changed === 'from') t = f
    else f = t
  }
  if (monthSpan(f, t) > MAX_SEARCH_MONTHS) {
    if (changed === 'from') t = addMonths(f, MAX_SEARCH_MONTHS - 1)
    else f = addMonths(t, -(MAX_SEARCH_MONTHS - 1))
  }
  const last = lastMonth()
  if (t > last) t = last
  if (f > t) f = t
  return { from: f, to: t }
}
