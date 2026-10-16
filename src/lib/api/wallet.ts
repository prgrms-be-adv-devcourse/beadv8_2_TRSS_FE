/**
 * 예치금·충전 API (충전 백엔드 담당: 시연)
 *
 * GET    /api/v1/wallet                    예치금 잔액
 * POST   /api/v1/topups                    충전 준비 (토스 결제위젯 결제 요청 전)
 * POST   /api/v1/topups/confirm            충전 승인 (토스 successUrl에서)
 * POST   /api/v1/topups/{topupId}/fail     충전 실패 기록 (failUrl 복귀 또는 결제창 닫기 USER_CANCEL)
 * GET    /api/v1/topups                    충전 내역 (PageResponse, 최신순)
 * GET    /api/v1/topups/{topupId}          충전 상세
 *
 * 실패 기록: 이미 처리된 충전 건이면 409, 다른 사람 충전 건이면 404
 */
import { api, type PageQuery, type PageResponse } from '.'

/** 예치금. balance = 쓸 수 있는 금액, heldAmount = 결제 후 판매자에게 지급되기 전 보관 중인 금액 */
export type Wallet = { memberId: number; balance: number; heldAmount: number }

/** BE TopupStatus */
export type TopupStatus =
  | 'READY' // 결제 요청 전
  | 'PROCESSING' // 토스 승인 확인 중
  | 'DONE'
  | 'CANCELED'
  | 'FAILED_USER_CANCEL'
  | 'FAILED_PG_DECLINED'
  | 'FAILED_AMOUNT_MISMATCH'
  | 'FAILED_EXPIRED' // 결제 요청 후 15분 안에 끝나지 않으면 자동 만료
  | 'FAILED_SYSTEM_ERROR'

/** BE TopupDto */
export type Topup = {
  topupId: number
  orderId: string // TOPUP-…
  amount: number
  remainingAmount: number
  status: TopupStatus
  failReason: string | null
  approvedAt: string | null
  createdAt: string
}
export type TopupPrepare = { topupId: number; orderId: string; amount: number }
/** status DONE이면 balance는 반영 후 잔액, PROCESSING이면 null */
export type TopupConfirm = {
  topupId: number
  orderId: string
  status: TopupStatus
  amount: number
  balance: number | null
}
export type TopupFail = { topupId: number; status: TopupStatus; failReason: string }

export const getWallet = () => api<Wallet>('/api/v1/wallet')
export const getTopups = (query: PageQuery = {}) => api<PageResponse<Topup>>('/api/v1/topups', { query })
export const getTopup = (topupId: number) => api<Topup>(`/api/v1/topups/${topupId}`)
export const prepareTopup = (amount: number) =>
  api<TopupPrepare>('/api/v1/topups', { method: 'POST', body: { amount } })
export const confirmTopup = (body: { paymentKey: string; orderId: string; amount: number }) =>
  api<TopupConfirm>('/api/v1/topups/confirm', { method: 'POST', body })
/** code는 토스 에러 코드 그대로(USER_CANCEL 등), message는 선택이고 최대 300자 */
export const failTopup = (topupId: number, body: { code: string; message?: string }) =>
  api<TopupFail>(`/api/v1/topups/${topupId}/fail`, {
    method: 'POST',
    body: { code: body.code, message: body.message?.slice(0, 300) },
  })

// ── 결제 요청 직전에 저장해 두는 충전 건 ──
// 사용자가 결제를 취소하면 토스가 orderId를 안 줘서, 충전 준비 응답의 topupId를 미리 저장해 둬요.
const PENDING_KEY = 'palette:pendingTopup'
export type PendingTopup = { topupId: number; orderId: string; orderNo: string | null }
export function savePendingTopup(p: PendingTopup) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(p))
  } catch {
    /* 저장 실패해도 failUrl의 topupId로 처리돼요 */
  }
}
export function readPendingTopup(): PendingTopup | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    return raw ? (JSON.parse(raw) as PendingTopup) : null
  } catch {
    return null
  }
}
export function clearPendingTopup() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* 무시 */
  }
}
