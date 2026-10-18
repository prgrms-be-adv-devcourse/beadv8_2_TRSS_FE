import { useSyncExternalStore } from 'react'
import { api, getAccessToken, onAccessTokenChange, refreshAccessToken, setAccessToken } from './api'
import type { SellerStatus } from './api/member'

// 판매자는 역할이 아니라 판매자 상태(APPROVED)로 구분한다
export type MemberRole = 'USER' | 'ADMIN'
export type Me = { memberId: number; email: string; name: string; role: MemberRole; createdAt: string }

/** 화면에 보여 줄 회원 유형. 역할에는 판매자가 없으므로 판매자 상태가 판매 중(APPROVED)이면 '판매자'로 보여 준다 */
export function memberTypeLabel(role: MemberRole, sellerStatus?: SellerStatus | null) {
  if (role === 'ADMIN') return '관리자'
  return sellerStatus === 'APPROVED' ? '판매자' : '일반 회원'
}

type AuthState = {
  /** 처음 로그인 상태 확인이 끝났는지 */
  ready: boolean
  me: Me | null
}

let state: AuthState = { ready: false, me: null }
const listeners = new Set<() => void>()
function setState(next: Partial<AuthState>) {
  state = { ...state, ...next }
  listeners.forEach((fn) => fn())
}

// 토큰이 사라지면(재발급 실패 등) 로그아웃 상태로 바꿔요.
onAccessTokenChange(() => {
  if (!getAccessToken() && state.me) setState({ me: null })
})

async function loadMe() {
  const me = await api<Me>('/api/v1/users/me')
  setState({ me })
  return me
}

/** 앱 시작 시 한 번: Refresh Token 쿠키가 살아 있으면 로그인 상태를 복구해요. */
let started = false
export function initAuth() {
  if (started) return
  started = true
  refreshAccessToken()
    .then((ok) => (ok ? loadMe() : null))
    .catch(() => setAccessToken(null))
    .finally(() => setState({ ready: true }))
}

export async function login(email: string, password: string) {
  const { accessToken } = await api<{ accessToken: string }>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  setAccessToken(accessToken)
  const me = await loadMe()
  setState({ ready: true })
  return me
}

export async function logout() {
  try {
    await api('/api/v1/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null)
    setState({ me: null })
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** 컴포넌트에서 로그인 상태를 읽어요. */
export function useAuth() {
  const s = useSyncExternalStore(subscribe, () => state)
  return { ...s, loggedIn: !!s.me }
}
