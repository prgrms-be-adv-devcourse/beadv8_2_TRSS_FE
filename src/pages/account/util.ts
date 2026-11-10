import { useEffect, useRef, useState } from 'react'
import { ApiError, errorMessage, type PageResponse } from '../../lib/api'
import type { Me } from '../../lib/auth'
import type { SellerStatus } from '../../lib/api/member'
import type { Tone } from '../../components/ui/Misc'

/** 로그인 뒤 갈 곳: 관리자·물류는 각자 첫 화면, 그 밖에는 원래 가려던 곳 또는 홈 */
export function afterLoginPath(me: Pick<Me, 'role'>, from?: string | null) {
  if (me.role === 'ADMIN') return '/admin/members'
  if (me.role === 'LOGISTICS') return '/logistics/ready'
  return from?.startsWith('/') ? from : '/'
}

const p2 = (n: number) => String(n).padStart(2, '0')

/** 2026-10-09T14:05:00 → 10.09 14:05 */
export function fmtDateTime(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`
}

/** 2026-10-09T14:05:00 → 10.09 */
export function fmtMd(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : `${p2(d.getMonth() + 1)}.${p2(d.getDate())}`
}

/** 2026-10-09T14:05:00 → 2026.10.09 */
export function fmtDate(iso?: string | null) {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : `${d.getFullYear()}.${p2(d.getMonth() + 1)}.${p2(d.getDate())}`
}

/** 1초마다 줄어드는 남은 시간(초). until은 ms 시각 */
export function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    setNow(Date.now())
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [until])
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
}

/** 판매자 상태 표시. '신청 전'은 판매자 정보가 없을 때 */
export type SellerView = '신청 전' | SellerStatus
export const SELLER_META: Record<
  SellerView,
  { tone: Tone; tag: string; text: string; act?: string; to: string }
> = {
  '신청 전': {
    tone: 'neutral',
    tag: '신청 전',
    text: '사업자 정보를 내면 관리자가 확인한 뒤 판매를 시작할 수 있어요.',
    act: '판매자 신청하기',
    to: '/seller/apply',
  },
  PENDING: { tone: 'amber', tag: '심사 중', text: '관리자가 신청 내용을 확인하고 있어요.', to: '/seller/status' },
  REJECTED: {
    tone: 'red',
    tag: '반려됨',
    text: '반려 사유를 확인하고 고친 뒤 다시 신청할 수 있어요.',
    act: '다시 신청하기',
    to: '/seller/apply',
  },
  APPROVED: {
    tone: 'green',
    tag: '판매 중',
    text: '상품을 등록하고 주문과 정산을 관리할 수 있어요.',
    act: '판매자 센터로 가기',
    to: '/seller/products',
  },
  WITHDRAW_REQUESTED: {
    tone: 'amber',
    tag: '철회 심사 중',
    text: '판매 철회를 요청했어요. 확인하는 동안 판매 기능은 잠겨요.',
    to: '/seller/status',
  },
  WITHDRAWN: {
    tone: 'neutral',
    tag: '철회됨',
    text: '판매를 그만뒀어요. 구매는 그대로 할 수 있어요.',
    act: '다시 신청하기',
    to: '/seller/apply',
  },
  SANCTIONED: {
    tone: 'red',
    tag: '이용 제한',
    text: '판매 활동이 제한됐어요. 다시 신청할 수 없어요.',
    to: '/seller/status',
  },
}

/** 마이페이지 메뉴: 판매자 상태에 따라 신청·상태·센터로 */
export function sellerMenu(status: SellerView) {
  if (status === APPROVED_SELLER) return { label: '판매자 센터', to: '/seller/products' }
  if (status === '신청 전' || status === 'REJECTED' || status === 'WITHDRAWN')
    return { label: '판매자 신청', to: status === '신청 전' ? '/seller/apply' : '/seller/status' }
  return { label: '판매자 신청 상태', to: '/seller/status' }
}
const APPROVED_SELLER: SellerView = 'APPROVED'

/** 404면 신청 전(null), 그 밖의 오류면 모름(undefined) */
export const notFoundAsNull = (e: unknown) => (e instanceof ApiError && e.status === 404 ? null : undefined)

/**
 * "더 보기" 목록: 페이지를 하나씩 더 불러와 이어 붙여요. deps가 바뀌면 처음부터 다시
 * fetcher(page)는 0부터 시작하는 페이지를 받아요.
 */
export function usePaged<T>(fetcher: (page: number) => Promise<PageResponse<T>>, deps: unknown[] = []) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const seq = useRef(0)

  // deps가 바뀌거나 reload하면 처음 페이지부터
  useEffect(() => {
    setItems([])
    setPage(0)
    setTotal(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  useEffect(() => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    fetcher(page)
      .then((r) => {
        if (id !== seq.current) return
        setItems((prev) => (page === 0 ? r.items : [...prev, ...r.items]))
        setTotal(r.totalElements)
      })
      .catch((e) => id === seq.current && setError(errorMessage(e)))
      .finally(() => id === seq.current && setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ...deps, nonce])

  return {
    items,
    total,
    loading,
    error,
    loaded: total !== null,
    hasMore: total !== null && items.length < total,
    loadMore: () => setPage((p) => p + 1),
    reload: () => setNonce((n) => n + 1),
  }
}
