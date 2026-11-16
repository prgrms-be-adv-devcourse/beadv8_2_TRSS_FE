/**
 * 최근 본 상품 (이 브라우저에만 저장)
 *
 * - 상품 상세를 열면 recordRecentView로 맨 앞에 넣어요. 같은 상품은 앞으로 옮기고, 최대 RECENT_MAX개만 둬요.
 * - 로그인한 회원은 회원 ID별로 따로 저장해서, 한 기기를 여러 명이 써도 섞이지 않아요. 비로그인은 공용 키예요.
 * - 로그인하면 비로그인 때 본 기록을 그 회원 기록에 합치고 비로그인 기록은 지워요. 같은 상품은 더 최근에 본 쪽을 남겨요.
 * - 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서는 기록 없이 동작해요.
 *
 * TODO(API 미구현): 최근 본 상품 서버 저장 — 기기 사이 동기화가 필요하면 이 파일의 읽기·쓰기만 서버 API로 바꿔요.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { useAuth } from './auth'

export type RecentViewedItem = {
  productId: number
  name: string
  /** 정가 */
  price: number
  salePrice: number | null
  discountRate: number | null
  thumbnailUrl: string | null
  businessName: string
  categoryId: number
  /** 본 시각 (ISO) */
  viewedAt: string
}

const RECENT_MAX = 20
const KEY_PREFIX = 'palette.recentViewed'
/** 같은 탭 안에서 바뀐 걸 알리는 이벤트 (다른 탭은 storage 이벤트로 알아요) */
const CHANGE_EVENT = 'palette:recent-viewed'

const keyOf = (memberId: number | null) => (memberId == null ? `${KEY_PREFIX}.guest` : `${KEY_PREFIX}.${memberId}`)

function read(key: string): RecentViewedItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(v)
      ? v.filter((x): x is RecentViewedItem => !!x && typeof x.productId === 'number').slice(0, RECENT_MAX)
      : []
  } catch {
    return []
  }
}

function write(key: string, list: RecentViewedItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // 저장소를 못 쓰면 기록하지 않아요
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** 상품 하나를 최근 본 상품 맨 앞에 넣어요. */
export function recordRecentView(memberId: number | null, item: Omit<RecentViewedItem, 'viewedAt'>) {
  const key = keyOf(memberId)
  const rest = read(key).filter((x) => x.productId !== item.productId)
  write(key, [{ ...item, viewedAt: new Date().toISOString() }, ...rest].slice(0, RECENT_MAX))
}

/** 판매가 끝난 상품 등을 목록에서 빼요. */
export function removeRecentView(memberId: number | null, productId: number) {
  const key = keyOf(memberId)
  write(
    key,
    read(key).filter((x) => x.productId !== productId),
  )
}

/** 비로그인 기록을 회원 기록에 합치고 비로그인 기록을 지워요. 합칠 게 없으면 아무것도 안 해요. */
export function mergeGuestRecentViews(memberId: number) {
  const guestKey = keyOf(null)
  const guest = read(guestKey)
  if (guest.length === 0) return
  const memberKey = keyOf(memberId)
  const byId = new Map<number, RecentViewedItem>()
  for (const item of [...guest, ...read(memberKey)]) {
    const prev = byId.get(item.productId)
    if (!prev || prev.viewedAt < item.viewedAt) byId.set(item.productId, item)
  }
  const merged = [...byId.values()].sort((a, b) => (a.viewedAt < b.viewedAt ? 1 : -1)).slice(0, RECENT_MAX)
  try {
    localStorage.removeItem(guestKey)
  } catch {
    // 지우지 못해도 회원 기록은 합쳐요
  }
  write(memberKey, merged)
}

// useSyncExternalStore는 같은 값을 돌려받아야 다시 그리지 않아서, 저장소 문자열이 같으면 이전 배열을 그대로 돌려줘요.
const cache = new Map<string, { raw: string | null; list: RecentViewedItem[] }>()
function snapshot(key: string) {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    raw = null
  }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.list
  const list = read(key)
  cache.set(key, { raw, list })
  return list
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** 지금 로그인 상태 기준의 최근 본 상품 (최근 본 순) */
export function useRecentViewed(): RecentViewedItem[] {
  const { me } = useAuth()
  const memberId = me?.memberId ?? null
  // 로그인한 상태가 되면 비로그인 때 본 기록을 회원 기록으로 옮겨요.
  useEffect(() => {
    if (memberId != null) mergeGuestRecentViews(memberId)
  }, [memberId])
  const key = keyOf(memberId)
  return useSyncExternalStore(subscribe, () => snapshot(key))
}
