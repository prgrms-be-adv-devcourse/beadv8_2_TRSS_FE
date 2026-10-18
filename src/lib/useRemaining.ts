import { useEffect, useMemo, useState } from 'react'

/**
 * 결제 남은 시간(초). 서버가 준 remainingSeconds부터 1초씩 줄여요.
 * 내 컴퓨터 시각과 서버 시각이 달라도 맞도록 expiresAt 대신 remainingSeconds를 써요.
 * 주문을 받은 첫 화면부터 남은 시간이 보여서, 0이면 바로 만료로 판단할 수 있어요.
 */
export function useRemaining(order: { remainingSeconds: number } | null) {
  const deadline = useMemo(
    () => (order && order.remainingSeconds > 0 ? Date.now() + order.remainingSeconds * 1000 : null),
    [order],
  )
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline === null) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [deadline])
  if (deadline === null) return 0
  return Math.max(0, Math.min(order?.remainingSeconds ?? 0, Math.ceil((deadline - now) / 1000)))
}

const pad = (n: number) => String(n).padStart(2, '0')
/** 초 → "14:32" */
export const mmss = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`
