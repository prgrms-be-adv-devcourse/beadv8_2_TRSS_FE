/**
 * 결제 API (백엔드 담당: 지은)
 *
 * POST   /api/v1/orders/{orderId}/payment  예치금 결제
 *
 * 실패: 402-INSUFFICIENT_BALANCE(data: InsufficientBalance), 404-ORDER_NOT_FOUND,
 *       409-ORDER_EXPIRED / 409-ORDER_STATE_INVALID / 409-PRODUCT_NOT_ON_SALE
 */

import { api } from '.'
import type { OrderStatus } from './order'

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
