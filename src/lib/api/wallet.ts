/**
 * 예치금·충전 API (충전 백엔드 담당: 시연)
 *
 * GET    /api/v1/wallet                    예치금 잔액
 * POST   /api/v1/topups                    충전 준비 (토스 결제위젯 결제 요청 전)
 * POST   /api/v1/topups/confirm            충전 승인 (토스 successUrl에서)
 * POST   /api/v1/topups/{topupId}/fail     충전 실패 기록 (failUrl 복귀 또는 결제창 닫기 USER_CANCEL)
 * GET    /api/v1/topups                    충전 내역 (PageResponse, 최신순)
 * GET    /api/v1/topups/{topupId}          충전 상세
 * GET    /api/v1/wallet/transactions       예치금 거래 내역 (PageResponse, 최신순 고정, BE PR #132)
 *
 * 실패 기록: 이미 처리된 충전 건이면 409, 다른 사람 충전 건이면 404
 *
 * 주문서 ↔ 예치금 쿼리 (10/16 은정님과 확정)
 * - 주문서 → 예치금: /wallet?orderId=<숫자 주문 ID>&orderNumber=<ORD-…>&shortage=<부족 금액>
 * - 예치금·충전 결과 → 주문서: /checkout?orderId=<숫자 주문 ID>
 * - 충전 결과 화면에서는 토스가 붙이는 orderId(TOPUP-…)와 겹치지 않게 returnOrderId로 받아요
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

/** BE WalletTransactionType */
export type WalletTransactionType =
  | 'CHARGE' // 충전
  | 'CHARGE_CANCEL' // 미사용 충전 취소
  | 'PAYMENT' // 주문 결제
  | 'REFUND' // 반품 환불
  | 'SETTLEMENT' // 정산 지급 (판매자)
  | 'FEE' // 정산 수수료 (관리자)

/** BE WalletTransactionDto. 지갑 잔액이 바뀔 때마다 한 건씩 남아요 */
export type WalletTransaction = {
  transactionId: number
  type: WalletTransactionType
  amount: number // 들어오면 +, 빠져나가면 -
  balanceAfter: number // 이 거래 후 잔액
  referenceType: 'TOPUP' | 'PAYMENT' | 'REFUND' | 'SETTLEMENT'
  referenceId: number // 원본 건 ID (결제 건 ID는 주문 ID가 아님). 화면 표시용이 아니라 상세 이동용
  createdAt: string
}

/**
 * 내 예치금 거래 내역. type·from·to(yyyy-MM-dd, 양 끝 포함)는 선택이고 size는 최대 100이에요.
 * 시작일이 종료일보다 늦으면 400-WALLET_TRANSACTION_PERIOD_INVALID
 */
export const getWalletTransactions = (
  query: PageQuery & { type?: WalletTransactionType; from?: string; to?: string } = {},
) => api<PageResponse<WalletTransaction>>('/api/v1/wallet/transactions', { query })
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
/**
 * orderId는 토스 주문번호(TOPUP-…)예요.
 * 주문서에서 왔을 때만 returnOrderId(숫자 주문 ID, /checkout?orderId= 에 씀)와 orderNumber(ORD-…, 문구에 씀)가 있어요.
 */
export type PendingTopup = {
  topupId: number
  orderId: string
  returnOrderId: string | null
  orderNumber: string | null
}
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

/** 돌아갈 주문서 주소. 주문서에서 오지 않았으면 null */
export const checkoutPath = (returnOrderId: string | null) =>
  returnOrderId ? `/checkout?orderId=${encodeURIComponent(returnOrderId)}` : null
