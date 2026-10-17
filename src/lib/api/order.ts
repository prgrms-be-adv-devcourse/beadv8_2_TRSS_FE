/**
 * 주문 API (백엔드 담당: 은정)
 *
 * POST   /api/v1/orders                    주문 생성
 * GET    /api/v1/orders                    주문 내역 (PageResponse)
 * GET    /api/v1/orders/{orderId}          주문 상세
 * POST   /api/v1/orders/{orderId}/cancel   주문 취소
 * POST   /api/v1/orders/{orderId}/confirm  구매 확정
 * (결제 요청 POST /api/v1/orders/{orderId}/payment 는 payment.ts에)
 */

import { api } from '.'

/** 주문 상태. 백엔드: shared.order.dto.OrderStatus */
export type OrderStatus =
  | 'CREATED' // 결제 대기
  | 'PAYMENT_FAILED' // 결제 실패 (다시 결제할 수 있음)
  | 'PAID' // 결제 완료
  | 'CONFIRMED' // 구매 확정
  | 'CANCELED' // 취소
  | 'RETURN_REQUESTED' // 반품 요청
  | 'RETURNED' // 반품 완료

/** 확정 방식. 백엔드: shared.order.dto.ConfirmType */
export type ConfirmType = 'MANUAL' | 'AUTO' | 'RETURN_REJECTED'

/** 결제할 수 있는 상태인지 (결제 대기·결제 실패) */
export const isPayable = (status: OrderStatus) => status === 'CREATED' || status === 'PAYMENT_FAILED'

/** 날짜·시각은 LocalDateTime 문자열("2026-10-09T14:02:11")로 와요. */
export type OrderCreateResponse = {
  orderId: number
  orderNumber: string
  totalPrice: number
  /** 결제 만료 시각 */
  expiresAt: string
}

/** 주문 항목 한 줄. 주문할 때의 상품·판매자 정보와 가격으로 고정돼요. */
export type OrderItem = {
  orderItemId: number
  productId: number
  optionId: number
  productName: string
  optionName: string
  sellerName: string
  unitPrice: number
  quantity: number
  lineAmount: number
}

export type OrderDetail = {
  orderId: number
  orderNumber: string
  status: OrderStatus
  totalPrice: number
  orderedAt: string
  expiresAt: string
  /** 결제할 수 있는 남은 시간(초). 결제 대기가 아니거나 만료됐으면 0 */
  remainingSeconds: number
  paidAt: string | null
  canceledAt: string | null
  confirmedAt: string | null
  items: OrderItem[]
}

export type OrderCancelResponse = {
  orderId: number
  orderNumber: string
  status: OrderStatus
  canceledAt: string
}

export type OrderConfirmResponse = {
  orderId: number
  orderNumber: string
  status: OrderStatus
  confirmType: ConfirmType
  confirmedAt: string
}

/**
 * 장바구니에서 고른 항목으로 결제 대기 주문을 만들고 재고를 잡아 둬요.
 * expectedTotalPrice가 지금 가격 합계와 다르면 409-PRICE_CHANGED가 와요.
 */
export const createOrder = (cartItemIds: number[], expectedTotalPrice: number) =>
  api<OrderCreateResponse>('/api/v1/orders', { method: 'POST', body: { cartItemIds, expectedTotalPrice } })

export const getOrder = (orderId: number) => api<OrderDetail>(`/api/v1/orders/${orderId}`)

/** 결제 전(결제 대기·결제 실패) 주문만 취소할 수 있어요. 그 외에는 409-ORDER_NOT_CANCELABLE */
export const cancelOrder = (orderId: number) =>
  api<OrderCancelResponse>(`/api/v1/orders/${orderId}/cancel`, { method: 'POST' })

/** 결제 완료 주문만 확정할 수 있어요. 그 외에는 409-ORDER_NOT_CONFIRMABLE */
export const confirmOrder = (orderId: number) =>
  api<OrderConfirmResponse>(`/api/v1/orders/${orderId}/confirm`, { method: 'POST' })
