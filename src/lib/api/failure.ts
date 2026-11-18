/**
 * 관리자 실패 거래 (A7). 서비스마다 같은 공통 형식(BE AdminFailureItem)으로 돌려줘요.
 *
 * - GET /api/v1/admin/payments/failures?type=PAYMENT_FAILED|REFUND_FAILED  결제 실패, 반품 환불 실패
 * - GET /api/v1/admin/topups/failures                                       충전 확인 지연, 충전 실패
 * - GET /api/v1/admin/settlements/failures                                  정산 수동 처리 필요
 * - GET /api/v1/admin/deliveries/failures                                   배송 추적 실패
 *
 * 공통: from, to(yyyy-MM-dd, 포함), page, size. occurredAt 최신순. totalElements를 탭 건수로 써요.
 */
import { api, type PageResponse } from '.'

export type AdminFailureType =
  'PAYMENT_FAILED' | 'TOPUP_DELAYED' | 'REFUND_FAILED' | 'SETTLEMENT_MANUAL_REQUIRED' | 'DELIVERY_TRACKING_FAILED'

export type AdminFailureTargetType = 'MEMBER' | 'SELLER'

/** BE AdminFailureItem */
export type AdminFailureItem = {
  type: AdminFailureType
  occurredAt: string
  targetType: AdminFailureTargetType
  targetId: number | null
  /** 회원은 마스킹한 이메일, 판매자는 상호명. 모르면 null */
  targetLabel: string | null
  /** 원. 금액이 없는 유형(배송 추적 실패)은 null */
  amount: number | null
  reasonCode: string
  reasonLabel: string
  handlingCode: string
  handlingLabel: string
  /** 원본 ID (결제, 충전, 환불, 정산서, 배송) */
  refId: number
  orderId: number | null
}

export type AdminFailureQuery = { from?: string; to?: string; page?: number; size?: number }

export const getPaymentFailures = (type: 'PAYMENT_FAILED' | 'REFUND_FAILED', query: AdminFailureQuery = {}) =>
  api<PageResponse<AdminFailureItem>>('/api/v1/admin/payments/failures', { query: { ...query, type } })
export const getTopupFailures = (query: AdminFailureQuery = {}) =>
  api<PageResponse<AdminFailureItem>>('/api/v1/admin/topups/failures', { query })
export const getSettlementFailures = (query: AdminFailureQuery = {}) =>
  api<PageResponse<AdminFailureItem>>('/api/v1/admin/settlements/failures', { query })
export const getDeliveryFailures = (query: AdminFailureQuery = {}) =>
  api<PageResponse<AdminFailureItem>>('/api/v1/admin/deliveries/failures', { query })
