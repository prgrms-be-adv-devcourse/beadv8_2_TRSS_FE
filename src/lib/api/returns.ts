/**
 * 반품 API (백엔드 TRSS-222, market-service)
 *
 * [구매자] (USER)
 * POST /api/v1/orders/{orderId}/returns           반품 요청 { reasonCode, reason } → RETURN_REQUESTED
 *   - 결제 완료(PAID) 주문만. 배송지가 있는 주문은 배송 완료 뒤부터 구매 확정 전까지
 *   - 주문 전체 단위, 주문당 한 번 (거절된 뒤에는 다시 요청 못 함). OTHER면 reason 필수, 300자까지
 *   - 내 반품 내역 API는 따로 없어요. 주문 목록(statuses=RETURN_REQUESTED,RETURNED)과 주문 상세의 반품 필드로 보여 줘요
 * [관리자] (ADMIN)
 * GET  /api/v1/admin/returns ?filter&page&size    반품 목록 (PageResponse). filter 기본 REQUESTED(먼저 요청한 순), 나머지는 최근 요청 순
 * POST /api/v1/admin/returns/{orderId}/approve    승인 { items: [{ orderItemId, restoreStock }] } — 주문의 모든 항목을 한 번씩
 * POST /api/v1/admin/returns/{orderId}/reject     거절 { reason } (필수, 300자까지, 구매자 주문 상세에 보여요)
 *
 * 환불 금액은 배송비를 포함한 결제 금액 전액이에요. 사용한 쿠폰은 돌려주지 않아요.
 */
import { api, type PageQuery, type PageResponse } from '.'
import type { ConfirmType, OrderStatus } from './order'

/** 반품 사유 코드 */
export type ReturnReasonCode = 'CHANGE_OF_MIND' | 'DEFECTIVE' | 'OTHER'

export const RETURN_REASON_LABEL: Record<ReturnReasonCode, string> = {
  CHANGE_OF_MIND: '단순 변심',
  DEFECTIVE: '불량·파손',
  OTHER: '기타',
}

/** 상세 사유 최대 글자 수 (요청 사유·거절 사유 공통) */
export const RETURN_REASON_MAX = 300

/** 주문 상세의 환불 상태 */
export type RefundStatus = 'NONE' | 'PENDING' | 'COMPLETED' | 'UNKNOWN'

export type ReturnRequestResponse = {
  orderId: number
  status: OrderStatus
  returnRequestedAt: string
}

export const requestReturn = (orderId: number, reasonCode: ReturnReasonCode, reason?: string) =>
  api<ReturnRequestResponse>(`/api/v1/orders/${orderId}/returns`, {
    method: 'POST',
    body: { reasonCode, reason: reason?.trim() || null },
  })

// ── 관리자 ───────────────────────────────────────────

/** REQUESTED(처리 대기) · RETURNED(승인) · REJECTED(거절) · ALL(전체) */
export type ReturnFilter = 'REQUESTED' | 'RETURNED' | 'REJECTED' | 'ALL'

export type AdminReturnItem = {
  orderItemId: number
  productId: number
  productName: string
  optionName: string
  sellerName: string
  quantity: number
  lineAmount: number
  /** 승인 때 정한 재고 복원 여부 (승인 전이면 null) */
  restoreStock: boolean | null
}

export type AdminReturn = {
  orderId: number
  orderNumber: string
  buyerId: number
  status: OrderStatus
  /** 결제 금액(배송비 포함). 승인하면 이 금액 전액을 환불해요 */
  payAmount: number
  shippingFee: number
  /** 배송 완료 시각 (배송지 없는 주문은 null) */
  deliveredAt: string | null
  returnRequestedAt: string
  reasonCode: ReturnReasonCode
  reason: string | null
  returnedAt: string | null
  returnRejectedAt: string | null
  items: AdminReturnItem[]
}

export type ReturnResultResponse = {
  orderId: number
  status: OrderStatus
  /** 거절하면서 바로 구매 확정했으면 RETURN_REJECTED */
  confirmType: ConfirmType | null
}

export const getAdminReturns = (filter: ReturnFilter, query: PageQuery = {}) =>
  api<PageResponse<AdminReturn>>('/api/v1/admin/returns', { query: { filter, ...query } })

export const approveReturn = (orderId: number, items: Array<{ orderItemId: number; restoreStock: boolean }>) =>
  api<ReturnResultResponse>(`/api/v1/admin/returns/${orderId}/approve`, { method: 'POST', body: { items } })

export const rejectReturn = (orderId: number, reason: string) =>
  api<ReturnResultResponse>(`/api/v1/admin/returns/${orderId}/reject`, { method: 'POST', body: { reason } })
