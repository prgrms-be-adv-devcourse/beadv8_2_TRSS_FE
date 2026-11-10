/**
 * 물류 배송 API (delivery-service, LOGISTICS 역할 전용. 관리자·구매자는 403)
 *
 * GET   /api/v1/logistics/deliveries ?status=READY|SHIPPED|DELIVERED   배송 목록 (PageResponse, status 기본 READY)
 * GET   /api/v1/logistics/deliveries/{deliveryId}                      배송 상세 (배송지 포함)
 * POST  /api/v1/logistics/deliveries/{deliveryId}/ship                 송장 등록 { courier, trackingNumber } READY → SHIPPED
 * PATCH /api/v1/logistics/deliveries/{deliveryId}/tracking             송장 수정 { courier, trackingNumber } (SHIPPED만)
 */
import { api, type PageQuery, type PageResponse } from '.'

/** 배송 상태 (출고 대기 → 배송 중 → 배송 완료) */
export type DeliveryStatus = 'READY' | 'SHIPPED' | 'DELIVERED'
export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  READY: '출고 대기',
  SHIPPED: '배송 중',
  DELIVERED: '배송 완료',
}

/** 택배사 */
export type Courier = 'CJ' | 'POST' | 'HANJIN' | 'LOTTE'
export const COURIER_LABEL: Record<Courier, string> = {
  CJ: 'CJ대한통운',
  POST: '우체국택배',
  HANJIN: '한진택배',
  LOTTE: '롯데택배',
}

/** BE LogisticsDeliveryResponse.Item */
export type LogisticsDeliveryItem = {
  orderItemId: number
  sellerId: number
  sellerName: string
  productName: string
  optionName: string
  quantity: number
}

/** BE LogisticsDeliveryResponse (목록·상세·송장 등록/수정 응답 공통) */
export type LogisticsDelivery = {
  deliveryId: number
  orderId: number
  orderNumber: string
  status: DeliveryStatus
  paidAt: string
  receiverName: string
  receiverPhone: string
  zipCode: string
  address: string
  addressDetail: string | null
  requestMessage: string | null
  /** 송장 등록 전이면 null */
  courier: Courier | null
  /** 택배사 표시명 (예: CJ대한통운). 송장 등록 전이면 null */
  carrierName: string | null
  trackingNumber: string | null
  shippedAt: string | null
  deliveredAt: string | null
  /** 배송 추적(Delivery Tracker)의 마지막 상태 */
  lastTrackingStatus: string | null
  items: LogisticsDeliveryItem[]
}

/** 송장 요청. trackingNumber는 하이픈·공백 포함 40자 이내, 지운 뒤 영문·숫자 8~30자 */
export type TrackingRequest = { courier: Courier; trackingNumber: string }

export const getLogisticsDeliveries = (query: PageQuery & { status?: DeliveryStatus } = {}) =>
  api<PageResponse<LogisticsDelivery>>('/api/v1/logistics/deliveries', { query })
export const getLogisticsDelivery = (deliveryId: number) =>
  api<LogisticsDelivery>(`/api/v1/logistics/deliveries/${deliveryId}`)
export const shipDelivery = (deliveryId: number, body: TrackingRequest) =>
  api<LogisticsDelivery>(`/api/v1/logistics/deliveries/${deliveryId}/ship`, { method: 'POST', body })
/** 같은 값이면 바꾸지 않아요. */
export const changeDeliveryTracking = (deliveryId: number, body: TrackingRequest) =>
  api<LogisticsDelivery>(`/api/v1/logistics/deliveries/${deliveryId}/tracking`, { method: 'PATCH', body })
