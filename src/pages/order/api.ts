/**
 * 주문 화면 전용 API·타입 보충
 *
 * lib/api/order.ts에 아직 없는 백엔드 필드·요청 본문을 여기서만 써요. (lib는 공유 파일이라 읽기만)
 * 백엔드 기준: market-service order/in/dto (origin/develop)
 * - OrderCreateRequest: shippingAddress, productCoupons(최대 1개), cartCouponId
 * - OrderCreateResponse: productDiscountAmount, cartCouponDiscountAmount, payAmount
 * - OrderDetailResponse: shippingAddress, deliveredAt, delivery, deliveryUnavailable, 할인액, payAmount, items[].discountAmount
 * - OrderSummaryResponse: deliveredAt, payAmount (배송비 포함 결제 금액)
 * - 배송비(TRSS-206): OrderCreateResponse·OrderDetailResponse의 shippingFee
 */
import { api, type PageResponse } from '../../lib/api'
import {
  getOrder,
  getOrders,
  type OrderCreateResponse,
  type OrderDetail,
  type OrderItem,
  type OrderListQuery,
  type OrderSummary,
} from '../../lib/api/order'

/** BE ShippingAddressRequest / ShippingAddressResponse */
export type ShippingAddress = {
  receiverName: string
  /** 숫자만, 0으로 시작하는 9~11자리 */
  receiverPhone: string
  /** 숫자 5자리 */
  zipCode: string
  address: string
  addressDetail?: string | null
  requestMessage?: string | null
}

/** BE DeliveryStatus */
export type DeliveryStatus = 'READY' | 'SHIPPED' | 'DELIVERED'

/** BE OrderDeliveryResponse */
export type OrderDelivery = {
  status: DeliveryStatus
  /** READY면 null */
  carrierName: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
}

export type OrderItemX = OrderItem & {
  /** 상품 쿠폰 할인액 (쿠폰이 붙지 않은 항목은 0). 예전 서버면 없어요 */
  discountAmount?: number
}

/** 주문 상세 (lib 타입 + 배송·할인 필드) */
export type OrderDetailX = Omit<OrderDetail, 'items'> & {
  items: OrderItemX[]
  shippingAddress?: ShippingAddress | null
  deliveredAt?: string | null
  /** 배송지 없는 주문·결제 전·배송 건 생성 전·조회 실패면 null */
  delivery?: OrderDelivery | null
  /** 배송 서비스 장애로 배송 정보를 못 불러왔으면 true */
  deliveryUnavailable?: boolean
  productDiscountAmount?: number
  cartCouponDiscountAmount?: number
  /** 결제 금액 = 상품 금액 합계 - 상품 쿠폰 할인 - 장바구니 쿠폰 할인 + 배송비 */
  payAmount?: number
  /** 배송비 (배송비 도입 전 주문은 0) */
  shippingFee?: number
}

/** 주문 내역 한 줄 (lib 타입 + 배송 완료 시각) */
export type OrderSummaryX = OrderSummary & { deliveredAt?: string | null }

export const getOrderDetail = (orderId: number) => getOrder(orderId) as Promise<OrderDetailX>
export const getOrderList = (q: OrderListQuery) => getOrders(q) as Promise<PageResponse<OrderSummaryX>>

/** 결제할 금액 (예전 서버 응답이면 totalPrice) */
export const payAmountOf = (o: OrderDetailX) => o.payAmount ?? o.totalPrice

export type OrderCreateResponseX = OrderCreateResponse & {
  productDiscountAmount?: number
  cartCouponDiscountAmount?: number
  shippingFee?: number
  payAmount?: number
}

export type OrderCreateBody = {
  cartItemIds: number[]
  /** 쿠폰을 쓰면 할인 후 금액. 배송비는 빼고 보내요 (서버가 배송비를 뺀 금액과 비교) */
  expectedTotalPrice: number
  shippingAddress?: ShippingAddress
  /** 한 주문에 1개까지 */
  productCoupons?: Array<{ cartItemId: number; code: string }>
  cartCouponId?: number
}

/**
 * 주문 생성 (lib의 createOrder와 같은 주소·멱등 키, 배송지·쿠폰까지 보내요)
 * - 쿠폰 할인 후 금액이 expectedTotalPrice와 다르면 409-PRICE_CHANGED (data.currentAmount)
 * - 서버에서 쿠폰 적용이 꺼져 있는데 쿠폰을 보내면 409-ORDER_COUPON_NOT_AVAILABLE
 */
export const createOrderX = (body: OrderCreateBody, idempotencyKey: string) =>
  api<OrderCreateResponseX>('/api/v1/orders', {
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
