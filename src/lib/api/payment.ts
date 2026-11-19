/**
 * 결제 API (백엔드 담당: 지은)
 *
 * POST   /api/v1/orders/{orderId}/payment  예치금 결제
 *
 * 실패: 402-INSUFFICIENT_BALANCE(data: InsufficientBalance), 404-ORDER_NOT_FOUND,
 *       409-ORDER_EXPIRED / 409-ORDER_STATE_INVALID / 409-PRODUCT_NOT_ON_SALE
 *
 * [관리자 결제 조회 · 조회 전용]
 * GET    /api/v1/admin/payments            결제 탭, keyword = 회원 이메일(@ 포함) 또는 주문번호 ORD-… (둘 다 정확히 일치), from·to = 결제 시도일
 * GET    /api/v1/admin/topups              충전 탭, keyword = 회원 이메일(정확히 일치) 또는 충전번호 TOPUP-…(앞부분 일치, 10자 이상), from·to = 충전 준비일
 * (예정) 환불 탭 — payment_refund 구현 후
 *
 * [반품 환불 · 구매자] (ApiV1PaymentRefundController)
 * GET    /api/v1/payments/refunds/{orderId}             반품 환불 조회. 404-REFUND_NOT_FOUND = 반품 승인 전이거나 본인 주문이 아님
 * POST   /api/v1/payments/refunds/{orderId}/pickup-fee  단순 변심 반품의 회수 택배비를 예치금으로 결제하고 이어서 상품값을 환불 (한 번에, 멱등)
 *   실패: 402-INSUFFICIENT_BALANCE(data: PickupFeeShortage), 409-REFUND_PICKUP_FEE_NOT_REQUIRED, 409-REFUND_HOLDING_SETTLED
 *
 * 공통: 최신순 고정, page는 0부터, size 기본 20·최대 100, 기간이 거꾸로면 400-PAYMENT_PERIOD_INVALID, 관리자가 아니면 403
 */
import { ApiError, api, type PageQuery, type PageResponse } from '.'
import type { TopupStatus } from './wallet'
import type { OrderStatus } from './order'

/** BE PaymentStatus */
export type PaymentStatus =
  | 'PAID' // 결제 완료
  | 'REFUNDED' // 환불
  | 'CANCELED' // 결제 취소 (결제 후 주문 처리 실패)
  | 'FAILED_INSUFFICIENT_BALANCE' // 잔액 부족
  | 'FAILED_ORDER_EXPIRED' // 주문 만료
  | 'FAILED_SYSTEM_ERROR' // 시스템 오류

/** BE WalletHoldingStatus. 결제 완료 건만 값이 있고 실패 건은 null */
export type HoldingStatus = 'HELD' | 'RELEASED' | 'SETTLED'

/** 관리자 결제 조회 공통 검색 조건 (결제 탭·충전 탭) */
export type AdminPaymentQuery = PageQuery & {
  /**
   * 결제 탭: 회원 이메일(@ 포함) 또는 주문번호 ORD-… (둘 다 정확히 일치)
   * 충전 탭: 회원 이메일 (정확히 일치) 또는 충전번호 앞부분 (TOPUP- 뒤 4자리 이상 = 총 10자 이상, 대소문자 구분, 화면에 보이는 앞 13자도 가능)
   */
  keyword?: string
  from?: string // yyyy-MM-dd, 양 끝 포함
  to?: string
}

/** BE AdminPaymentDto (결제 탭 1행 = 결제 시도 1건) */
export type AdminPayment = {
  paymentId: number
  orderId: number
  /** 주문번호(ORD-…). BE가 결제 건에 함께 저장해 항상 채워 줘요(DB 필수 칸). 혹시 비어 오면 화면에는 '-' */
  orderNumber: string | null
  memberId: number
  memberEmail: string | null // 회원을 찾을 수 없으면 null
  amount: number // 배송비를 포함한 결제 금액
  shippingFee: number // amount에 포함된 배송비, 무료 배송이면 0 (BE PR #442)
  status: PaymentStatus
  failReason: string | null // 실패 건만
  holdingStatus: HoldingStatus | null
  createdAt: string // 결제 시도 시각 (화면의 결제일)
  paidAt: string | null
}

export const getAdminPayments = (query: AdminPaymentQuery = {}) =>
  api<PageResponse<AdminPayment>>('/api/v1/admin/payments', { query })

/** BE AdminTopupDto (충전 탭 1행 = 충전 건 1건, 성공·실패 포함) */
export type AdminTopup = {
  topupId: number
  orderId: string // 충전번호 TOPUP-… (토스 주문번호)
  memberId: number
  memberEmail: string | null // 회원을 찾을 수 없으면 null
  amount: number
  remainingAmount: number // 결제에 쓰이고 남은 금액. 충전 완료(DONE) 건만 의미가 있어요
  status: TopupStatus
  failReason: string | null // 실패 건만
  approvedAt: string | null // 토스 승인 시각. 충전 완료 건만
  createdAt: string // 충전 준비 시각 (화면의 충전일)
}

export const getAdminTopups = (query: AdminPaymentQuery = {}) =>
  api<PageResponse<AdminTopup>>('/api/v1/admin/topups', { query })

/** 결제 결과. 백엔드: OrderPayResponse */
export type OrderPay = {
  orderId: number
  orderNumber: string
  status: OrderStatus
  paidAmount: number
  paidAt: string
  paymentId: number
}

/** 402-INSUFFICIENT_BALANCE 응답의 data. 백엔드: InsufficientBalanceResponse */
export type InsufficientBalance = {
  shortage: number
  /** 1만 원 단위로 올린 충전 권장 금액 */
  recommendedTopupAmount: number
  remainingSeconds: number
}

/** 결제 대기·결제 실패이고 만료 전인 주문만 예치금으로 결제할 수 있어요. */
export const payOrder = (orderId: number) => api<OrderPay>(`/api/v1/orders/${orderId}/payment`, { method: 'POST' })

/** BE PaymentRefundStatus. FAILED_*는 관리자가 확인해요 (FAILED_SYSTEM_ERROR만 자동 재시도) */
export type PaymentRefundStatus =
  | 'REQUESTED' // 처리 중
  | 'PICKUP_FEE_REQUIRED' // 단순 변심: 회수 택배비를 결제하면 환불
  | 'COMPLETED' // 환불 완료
  | 'FAILED_AMOUNT_MISMATCH'
  | 'FAILED_HOLDING_SETTLED'
  | 'FAILED_PAYMENT_NOT_PAID'
  | 'FAILED_PLATFORM_BALANCE'
  | 'FAILED_SYSTEM_ERROR'

/** 반품 환불 한 건. 백엔드: RefundDto */
export type Refund = {
  orderId: number
  status: PaymentRefundStatus
  /** 돌려받는(받은) 금액. 완료 전이면 받을 예정 금액 (단순 변심은 상품값만, 그 밖에는 결제 금액 전부) */
  refundAmount: number
  /** 내야 하는(낸) 회수 택배비. 단순 변심만, 그 밖에는 0 */
  pickupFee: number
  /** 환불 시각. 완료 전이면 null */
  refundedAt: string | null
}

/** 회수 택배비 결제의 402-INSUFFICIENT_BALANCE data. 백엔드: InsufficientBalanceDto (주문 결제와 달리 남은 시간이 없어요) */
export type PickupFeeShortage = Pick<InsufficientBalance, 'shortage'> & {
  /** 충전 권장 금액 */
  chargeAmount: number
}

/** 반품 환불 조회. 환불 내역이 없으면(404-REFUND_NOT_FOUND) null */
export const getRefund = (orderId: number) =>
  api<Refund>(`/api/v1/payments/refunds/${orderId}`).catch((e: unknown) => {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  })

/** 단순 변심 반품의 회수 택배비를 예치금으로 결제하고 상품값을 환불해요. 이미 처리했으면 같은 결과를 돌려줘요 */
export const payRefundPickupFee = (orderId: number) =>
  api<Refund>(`/api/v1/payments/refunds/${orderId}/pickup-fee`, { method: 'POST' })
