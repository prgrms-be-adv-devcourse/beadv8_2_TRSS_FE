/**
 * 카카오 로그인·계정 연결 (인가 코드 방식, 백엔드 TRSS-135)
 *
 * 1. startKakao: state를 만들어 목적(로그인/연결)과 함께 sessionStorage에 두고 카카오 인가 화면으로 이동
 * 2. 카카오가 /oauth/kakao/callback?code&state 로 돌려보냄 (동의 취소 등 실패면 ?error&state)
 * 3. 콜백 화면이 takeKakaoAuth로 저장한 값을 꺼내 state를 비교하고, 같을 때만 code를 백엔드 API에 넘긴다
 *
 * 카카오 REST API 키는 인가 주소에 그대로 드러나는 공개 값이라 프론트 환경 변수로 둔다. Client Secret은 백엔드에만 있다.
 * redirect_uri는 백엔드 KAKAO_REDIRECT_URI·카카오 개발자 콘솔 등록 주소와 글자까지 같아야 한다.
 */

import { ApiError, errorMessage } from './api'
import { codeOf } from './notices/common'

export type KakaoPurpose = 'login' | 'link'
/** 인가 화면으로 가기 전에 저장해 두는 값. from: 로그인 뒤 돌아갈 화면 */
export type KakaoAuth = { state: string; purpose: KakaoPurpose; from?: string }

const KEY = 'palette.kakaoAuth'
const CLIENT_ID = import.meta.env.VITE_KAKAO_REST_API_KEY as string | undefined

/** 환경 변수에 키가 있어야 카카오 버튼을 쓸 수 있다 */
export const kakaoEnabled = !!CLIENT_ID

/** 비어 있으면 지금 주소 기준 콜백 화면 (로컬 http://localhost:5173/oauth/kakao/callback) */
export const kakaoRedirectUri = () =>
  (import.meta.env.VITE_KAKAO_REDIRECT_URI as string | undefined) || `${window.location.origin}/oauth/kakao/callback`

/** 카카오 인가 화면으로 이동한다. 키가 없으면 이동하지 않고 false */
export function startKakao(purpose: KakaoPurpose, from?: string) {
  if (!CLIENT_ID) return false
  const state = crypto.randomUUID()
  const saved: KakaoAuth = { state, purpose, from }
  sessionStorage.setItem(KEY, JSON.stringify(saved))
  const query = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: kakaoRedirectUri(),
    response_type: 'code',
    state,
  })
  window.location.assign(`https://kauth.kakao.com/oauth/authorize?${query}`)
  return true
}

/** 저장해 둔 값을 꺼내고 지운다 (한 번만 쓸 수 있게). 없거나 깨졌으면 null */
export function takeKakaoAuth(): KakaoAuth | null {
  const raw = sessionStorage.getItem(KEY)
  sessionStorage.removeItem(KEY)
  if (!raw) return null
  try {
    const v = JSON.parse(raw) as KakaoAuth
    return typeof v.state === 'string' && (v.purpose === 'login' || v.purpose === 'link') ? v : null
  } catch {
    return null
  }
}

/** 카카오 동의 화면에서 취소하고 돌아온 경우 */
export const KAKAO_CANCELED: Record<KakaoPurpose, string> = {
  login: '카카오 로그인을 취소했어요.',
  link: '카카오 연결을 취소했어요.',
}

/** state가 없거나 다른 경우: 다른 곳에서 만든 요청일 수 있어 API를 부르지 않는다 */
export const KAKAO_STATE_MISMATCH = '요청을 확인하지 못했어요. 처음부터 다시 시도해 주세요.'

/** 백엔드 응답 코드별 안내 문구 */
export function kakaoErrorMessage(e: unknown) {
  switch (codeOf(e)) {
    case 'SOCIAL_NOT_LINKED':
      return '연결된 계정이 없어요. 이메일로 로그인한 뒤 마이페이지에서 카카오를 연결해 주세요.'
    case 'KAKAO_AUTH_FAILED':
      return '카카오 인증에 실패했어요. 다시 시도해 주세요.'
    case 'SOCIAL_ACCOUNT_LINKED_TO_OTHER':
      return '다른 회원에 이미 연결된 카카오 계정이에요.'
    case 'SOCIAL_PROVIDER_ALREADY_LINKED':
      return '이미 다른 카카오 계정이 연결돼 있어요. 연결을 해제한 뒤 다시 연결해 주세요.'
  }
  // 카카오 서버가 응답하지 않으면 502
  if (e instanceof ApiError && e.status === 502) return '카카오와 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'
  return errorMessage(e)
}
