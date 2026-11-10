import { useEffect, useSyncExternalStore } from 'react'
import { CART_CHANGED, getCart } from './api/cart'
import { useAuth } from './auth'

/**
 * 헤더 장바구니 배지에 보일 개수 (담긴 항목 수, 장바구니 화면과 같은 기준)
 * - 화면을 옮겨도 마지막 값을 들고 있어 배지가 깜빡이지 않아요
 * - lib/api/cart.ts가 담기·삭제 뒤 CART_CHANGED 이벤트를 보내면 다시 불러와요
 */
let count: number | undefined
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((fn) => fn())
let seq = 0

export function refreshCartCount() {
  const id = ++seq
  getCart()
    .then((c) => {
      if (id !== seq) return
      count = c.items.length
      emit()
    })
    .catch(() => {
      // 로그인이 풀렸거나 일시 오류면 배지만 안 보여요
    })
}

function clearCartCount() {
  seq++
  if (count === undefined) return
  count = undefined
  emit()
}

if (typeof window !== 'undefined') window.addEventListener(CART_CHANGED, refreshCartCount)

/** 구매자로 로그인했을 때만 개수를 돌려줘요 (관리자·물류 담당자·비로그인은 undefined) */
export function useCartCount() {
  const { me } = useAuth()
  const buyer = me?.role === 'USER'
  useEffect(() => {
    if (buyer) refreshCartCount()
    else clearCartCount()
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
