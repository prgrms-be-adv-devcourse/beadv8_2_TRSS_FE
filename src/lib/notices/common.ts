/**
 * 안내 모달 공통 처리
 *
 * 디자인: /orders/errors (주문·결제 안내 모달 모음)
 * 백엔드 resultCode는 "상태코드-이름" 형식이에요. 예: "409-PRICE_CHANGED"
 *
 * 도메인별 문구는 같은 폴더에 따로 둬요. (order.tsx: 장바구니·주문, payment.tsx·topup.tsx: 결제·충전 담당자가 추가)
 */

import type { Notice, NoticeAction } from '../../components/NoticeModal'
import { ApiError, errorMessage } from '../api'

/** 확인 버튼 하나 */
export const OK: NoticeAction[] = [{ label: '확인', primary: true }]

export const LOGIN: Notice = {
  title: '다시 로그인해 주세요',
  body: '로그인한 지 오래되어 안전을 위해 로그아웃됐어요. 다시 로그인하면 이어서 진행할 수 있어요.',
  actions: [{ label: '로그인하기', to: '/login', primary: true }],
}

/** 권한 가드가 이동하면서 넘기는 표시 (location.state.forbidden). RouteNotice가 받아 안내한다 */
export type ForbiddenKind = 'role' | 'seller'

/** 로그인은 했지만 들어올 수 없는 화면 (403에 해당) */
export const FORBIDDEN: Record<ForbiddenKind, Notice> = {
  role: {
    title: '접근 권한이 없어요',
    body: '이 화면을 볼 수 있는 권한이 없어 메인으로 이동했어요.',
    actions: OK,
  },
  seller: {
    title: '접근 권한이 없어요',
    body: '판매자 센터는 판매 중인 판매자만 이용할 수 있어요. 마이페이지에서 판매자 상태를 확인해 주세요.',
    actions: OK,
  },
}

/** "409-PRICE_CHANGED" → "PRICE_CHANGED". ApiError가 아니면 빈 문자열 */
export const codeOf = (e: unknown) => (e instanceof ApiError ? e.resultCode.replace(/^\d+-/, '') : '')

/** 어느 화면에서나 같은 안내 (로그인 만료, 그 밖의 오류). 도메인 함수의 switch default에서 불러요. */
export function commonNotice(e: unknown): Notice {
  if (e instanceof ApiError && e.status === 401) return LOGIN
  return { title: '요청을 처리하지 못했어요', body: errorMessage(e), actions: OK }
}

/** 받침이 있으면 true. "크림" → true, "토너" → false */
export function hasBatchim(word: string) {
  const w = word.trim()
  const last = w.charCodeAt(w.length - 1)
  if (last >= 0xac00 && last <= 0xd7a3) return (last - 0xac00) % 28 !== 0
  // 숫자로 끝나면 읽는 소리 기준 (일·삼·육·칠·팔·영 → 받침 있음). 영문 단위(ml 등)는 "는"
  return /[136780]$/.test(w)
}

/** "시카 리페어 크림 50ml는" / 이름을 모르면 "이 상품은" */
export const subject = (name?: string) => (name ? `${name}${hasBatchim(name) ? '은' : '는'}` : '이 상품은')
