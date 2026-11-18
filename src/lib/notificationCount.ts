import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from './auth'
import { subscribeNotificationStream } from './notificationStream'

/**
 * 헤더 종 배지와 알림 화면 "전체 N"에 쓰는 안 읽은 알림 개수
 * - SSE unread-count 이벤트로 받는다 (연결 직후·새 알림 뒤·읽음 처리 뒤, 다른 탭의 읽음 처리 포함)
 */
let count: number | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())

function setCount(n: number | undefined) {
  if (count === n) return
  count = n
  emit()
}

// 배지를 쓰는 화면이 여러 개 떠 있어도 구독은 하나만 한다
let users = 0
let unsubscribe: (() => void) | undefined

function start() {
  if (users++ > 0) return
  unsubscribe = subscribeNotificationStream({ onCount: setCount })
}

function stop() {
  if (--users > 0) return
  unsubscribe?.()
  unsubscribe = undefined
}

/** 구매자로 로그인했을 때만 개수를 돌려준다 (관리자·물류 담당자·비로그인은 undefined) */
export function useNotificationCount() {
  const { me } = useAuth()
  const buyer = me?.role === 'USER'
  useEffect(() => {
    if (!buyer) {
      setCount(undefined)
      return
    }
    start()
    return stop
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
