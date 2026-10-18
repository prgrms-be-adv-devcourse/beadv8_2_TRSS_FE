/**
 * 주문 상태 표시 공통 (주문 내역·주문 상세가 같이 써요)
 */

import type { OrderStatus } from './api/order'

/** 백엔드 custom.order.autoConfirmDays */
export const AUTO_CONFIRM_DAYS = 7

/**
 * 상태별 칩·안내
 * - at: 주문 상세 진행 단계 위치 (0 주문 생성, 1 결제 완료, 2 구매 확정)
 * - hold: 주문 상세 결제 정보 아래 안내 문구
 */
export const ORDER_STATUS: Record<OrderStatus, { label: string; chip: string; at: number; hold: string }> = {
  CREATED: { label: '결제 대기', chip: 'c-low', at: 0, hold: '아직 결제하지 않았어요.' },
  PAYMENT_FAILED: {
    label: '결제 실패',
    chip: 'c-low',
    at: 0,
    hold: '결제하지 못했어요. 남은 시간 안에 다시 결제할 수 있어요.',
  },
  PAID: { label: '결제 완료', chip: 'c-ok', at: 1, hold: '' },
  RETURN_REQUESTED: { label: '반품 요청', chip: 'c-blue', at: 1, hold: '반품이 승인되면 예치금으로 돌려드려요.' },
  RETURNED: { label: '반품 완료', chip: 'c-mute', at: 1, hold: '결제한 금액을 예치금으로 돌려드렸어요.' },
  CONFIRMED: { label: '구매 확정', chip: 'c-mute', at: 2, hold: '판매자에게 정산될 금액이에요.' },
  CANCELED: { label: '주문 취소', chip: 'c-mute', at: 0, hold: '결제 전에 취소된 주문이에요.' },
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Date → "10.09" */
export const mmdd = (d: Date) => `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
/** Date → "10.09 14:02" */
export const mdhm = (d: Date) => `${mmdd(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
/** Date → "10월 9일" */
export const md = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일`
/** 초 → "14:32" */
export const mmss = (sec: number) => `${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}`

/** 결제일 + AUTO_CONFIRM_DAYS (LocalDateTime 문자열을 받아요) */
export const autoConfirmDate = (paidAt: string) => new Date(new Date(paidAt).getTime() + AUTO_CONFIRM_DAYS * 86400000)

/** Date → "2026-10-18" (백엔드 LocalDate 파라미터) */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
