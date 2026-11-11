/**
 * 알림 API (notification-service, 구매자 USER)
 *
 * GET   /api/v1/notifications?cursor=&size=   내 알림 최신순 (커서 방식)
 * GET   /api/v1/notifications/unread-count    안 읽은 개수
 * PATCH /api/v1/notifications/{id}/read       하나 읽음 (이미 읽었으면 그대로 성공)
 * PATCH /api/v1/notifications/read-all        전체 읽음
 */
import { api } from '.'

export type NotificationType = 'ORDER_PAID' | 'DELIVERY_STARTED' | 'DELIVERY_COMPLETED'

/** BE NotificationDto */
export type NotificationItem = {
  id: number
  type: NotificationType
  /** 알림을 만들 때 서버가 완성해 저장한 문구 */
  message: string
  /** 눌렀을 때 이동할 주문 */
  orderId: number
  read: boolean
  /** 서버 LocalDateTime (KST, 시간대 표기 없음) */
  createdAt: string
  /** 대표 상품명 (주문 첫 상품). 필드 추가 전 알림이거나 값을 못 찾으면 null */
  productName?: string | null
  /** 주문 상품 줄 개수 (수량 합계 아님). "외 N개"는 itemCount - 1 */
  itemCount?: number | null
  /** 배송 시작 알림만. 이전에 저장된 알림이면 null */
  carrierName?: string | null
  trackingNumber?: string | null
}

/** BE NotificationListDto */
export type NotificationList = {
  items: NotificationItem[]
  /** 다음 페이지 요청에 cursor로 넘길 값 */
  nextCursor: number | null
  hasNext: boolean
}

/** 읽음 처리 뒤 헤더 배지를 다시 불러오라는 신호 */
export const NOTIFICATIONS_CHANGED = 'palette:notifications-changed'
const changed = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED))

export const getNotifications = (query: { cursor?: number | null; size?: number } = {}) =>
  api<NotificationList>('/api/v1/notifications', { query })
export const getUnreadNotificationCount = () => api<number>('/api/v1/notifications/unread-count')
/** 없거나 다른 회원 알림이면 404-NOTIFICATION_NOT_FOUND */
export const readNotification = (id: number) =>
  api<void>(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }).then(changed)
export const readAllNotifications = () => api<void>('/api/v1/notifications/read-all', { method: 'PATCH' }).then(changed)
