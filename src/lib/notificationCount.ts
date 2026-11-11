import { useEffect, useSyncExternalStore } from 'react'
import { NOTIFICATIONS_CHANGED, getUnreadNotificationCount } from './api/notification'
import { useAuth } from './auth'

/**
 * 헤더 종 배지와 알림 화면 "전체 N"에 쓰는 안 읽은 알림 개수
 * - 실시간 전달(SSE) 전까지 탭이 보일 때만 주기적으로 조회한다
 * - SSE로 바꿀 때는 startPolling·stopPolling 안쪽만 구독으로 바꾸면 된다
 * - 읽음 처리 뒤 NOTIFICATIONS_CHANGED가 오면 바로 다시 조회한다
 */
const POLL_MS = 30_000

let count: number | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
let seq = 0

export function refreshNotificationCount() {
  const id = ++seq
  getUnreadNotificationCount()
    .then((n) => {
      if (id !== seq) return
      count = n
      emit()
    })
    .catch(() => {
      // 로그인이 풀렸거나 일시 오류면 배지만 숨김
    })
}

function clearNotificationCount() {
  seq++
  if (count === undefined) return
  count = undefined
  emit()
}

// 배지를 쓰는 화면이 여러 개 떠 있어도 폴링은 하나만 돌린다
let users = 0
let timer: number | undefined
const onVisible = () => {
  if (document.visibilityState === 'visible') refreshNotificationCount()
}

function startPolling() {
  if (users++ > 0) return
  refreshNotificationCount()
  timer = window.setInterval(() => {
    if (document.visibilityState === 'visible') refreshNotificationCount()
  }, POLL_MS)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener(NOTIFICATIONS_CHANGED, refreshNotificationCount)
}

function stopPolling() {
  if (--users > 0) return
  window.clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener(NOTIFICATIONS_CHANGED, refreshNotificationCount)
}

/** 구매자로 로그인했을 때만 개수를 돌려준다 (관리자·물류 담당자·비로그인은 undefined) */
export function useNotificationCount() {
  const { me } = useAuth()
  const buyer = me?.role === 'USER'
  useEffect(() => {
    if (!buyer) {
      clearNotificationCount()
      return
    }
    startPolling()
    return stopPolling
  }, [buyer])
  const value = useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => count,
  )
  return buyer ? value : undefined
}
