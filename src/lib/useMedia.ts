import { useSyncExternalStore } from 'react'

/** PC 레이아웃 기준 폭. 이 폭 이상이면 사이드바 + 표, 미만이면 모바일 화면 */
export const DESKTOP_MIN = 1024

const subscribers = new Map<string, (fn: () => void) => () => void>()
function subscribeTo(query: string) {
  let sub = subscribers.get(query)
  if (!sub) {
    sub = (fn) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', fn)
      return () => mq.removeEventListener('change', fn)
    }
    subscribers.set(query, sub)
  }
  return sub
}

/** CSS 미디어 쿼리가 맞는지 */
export function useMedia(query: string) {
  return useSyncExternalStore(
    subscribeTo(query),
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** 1024px 이상이면 true */
export function useIsDesktop() {
  return useMedia(`(min-width: ${DESKTOP_MIN}px)`)
}
