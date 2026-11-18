import { useEffect, useRef } from 'react'
import { EventStreamContentType, fetchEventSource } from '@microsoft/fetch-event-source'
import { buildUrl, getAccessToken, refreshAccessToken } from './api'
import type { NotificationItem } from './api/notification'
import { useAuth } from './auth'

/**
 * 알림 실시간 구독 (SSE, GET /api/v1/notifications/subscribe)
 *
 * - unread-count: 안 읽은 개수. 연결 직후, 새 알림 뒤, 읽음 처리 뒤에 온다
 * - notification: 새 알림 한 줄 (목록 items와 같은 모양)
 * - 기본 EventSource는 Authorization 헤더를 못 붙여 fetch 기반 SSE로 연결한다
 * - 구독하는 곳이 여러 개여도 연결은 하나만 열고, 모두 해제되면 닫는다
 * - 서버는 30분 뒤 연결을 끝내고 끊긴 동안의 알림은 다시 보내지 않는다. 다시 연결하면 onReconnect로 알린다
 */
export type NotificationStreamHandlers = {
  onCount?: (count: number) => void
  onNotification?: (item: NotificationItem) => void
  /** 끊겼다가 다시 연결됨. 그 사이 알림은 목록을 다시 조회해야 보인다 */
  onReconnect?: () => void
}

const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 30_000
/** 서버 heartbeat(30초)를 두 번 넘게 못 받으면 끊긴 것으로 보고 다시 연결한다 */
const IDLE_MS = 75_000

const subs = new Set<NotificationStreamHandlers>()
let ctrl: AbortController | null = null

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t)
        resolve()
      },
      { once: true },
    )
  })

/**
 * 연결 한 번이 끝날 때마다(서버 종료·오류·무응답) 직접 다시 연결한다.
 * 라이브러리 재시도는 처음 헤더를 그대로 쓰므로 재발급한 토큰을 넣을 수 없어 쓰지 않는다.
 */
async function run(signal: AbortSignal) {
  let connected = false
  let retry = RETRY_MIN_MS
  while (!signal.aborted) {
    let status = 0
    const token = getAccessToken()
    // 절전·네트워크 변경·프록시 등으로 응답이 끊긴 줄 모르고 멈춰 있는 연결을 끊기 위한 감시
    const attempt = new AbortController()
    const stopAttempt = () => attempt.abort()
    signal.addEventListener('abort', stopAttempt, { once: true })
    let idle: number | undefined
    const kick = () => {
      window.clearTimeout(idle)
      idle = window.setTimeout(stopAttempt, IDLE_MS)
    }
    await fetchEventSource(buildUrl('/api/v1/notifications/subscribe'), {
      signal: attempt.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      // 숨은 탭에서도 연결을 유지해 다른 탭에서 읽음 처리한 개수를 받는다
      openWhenHidden: true,
      async onopen(res) {
        status = res.status
        if (!res.ok || !res.headers.get('content-type')?.startsWith(EventStreamContentType)) {
          throw new Error(`SSE ${res.status}`)
        }
        retry = RETRY_MIN_MS
        kick()
        if (connected) subs.forEach((h) => h.onReconnect?.())
        connected = true
      },
      // heartbeat(SSE 주석)도 빈 메시지로 들어온다
      onmessage(ev) {
        kick()
        if (ev.event === 'unread-count') {
          const n = Number(ev.data)
          if (Number.isFinite(n)) subs.forEach((h) => h.onCount?.(n))
        } else if (ev.event === 'notification') {
          const item = JSON.parse(ev.data) as NotificationItem
          subs.forEach((h) => h.onNotification?.(item))
        }
      },
      onerror(e) {
        // 라이브러리 재시도를 막고 아래 반복문에서 다시 연결한다
        throw e
      },
    })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(idle)
        signal.removeEventListener('abort', stopAttempt)
      })
    if (signal.aborted) return

    if (status === 401) {
      // 재발급이 실패하면 로그아웃 상태가 되어 구독이 해제된다
      if (await refreshAccessToken()) continue
      return
    }
    // 401 외의 4xx(권한 없음 등)는 다시 연결해도 같으므로 멈춘다
    if (status >= 400 && status < 500 && status !== 429) return

    await wait(retry, signal)
    retry = Math.min(retry * 2, RETRY_MAX_MS)
  }
}

export function subscribeNotificationStream(handlers: NotificationStreamHandlers) {
  subs.add(handlers)
  if (!ctrl) {
    const c = new AbortController()
    ctrl = c
    // 다시 연결하지 않고 끝났으면(재발급 실패·4xx) 다음 구독 때 새로 연결한다
    run(c.signal).finally(() => {
      if (ctrl === c) ctrl = null
    })
  }
  return () => {
    subs.delete(handlers)
    if (subs.size > 0) return
    ctrl?.abort()
    ctrl = null
  }
}

/** 구매자로 로그인했을 때만 구독한다. handlers는 매 렌더 바뀌어도 다시 연결하지 않는다 */
export function useNotificationStream(handlers: NotificationStreamHandlers) {
  const { me } = useAuth()
  const buyer = me?.role === 'USER'
  const ref = useRef(handlers)
  useEffect(() => {
    ref.current = handlers
  })
  useEffect(() => {
    if (!buyer) return
    return subscribeNotificationStream({
      onCount: (n) => ref.current.onCount?.(n),
      onNotification: (item) => ref.current.onNotification?.(item),
      onReconnect: () => ref.current.onReconnect?.(),
    })
  }, [buyer])
}
