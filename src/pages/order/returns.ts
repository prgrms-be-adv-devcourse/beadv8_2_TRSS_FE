/**
 * 반품 목업 데이터
 * TODO(API 미구현): POST /api/v1/orders/{orderId}/returns 반품 요청, GET /api/v1/returns 내 반품 내역
 * — 백엔드에 반품 API가 생기면 이 파일을 지우고 API 응답 타입으로 바꿔요.
 */

export type ReturnStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED'

export const RETURN_STATUS: Record<ReturnStatus, { label: string; note: string }> = {
  REQUESTED: { label: '반품 요청', note: '관리자 확인 중' },
  APPROVED: { label: '반품 완료', note: '예치금으로 환불됐어요' },
  REJECTED: { label: '반품 반려', note: '구매 확정으로 처리됐어요' },
}

export const RETURN_REASONS = ['단순 변심', '상품 불량', '기타'] as const

export type ReturnRecord = {
  returnId: number
  /** 목업은 0 (주문 상세 링크 없음) */
  orderId: number
  status: ReturnStatus
  requestedAt: string
  productName: string
  itemCount: number
  img: string | null
  refundAmount: number
  reason: string
  rejectReason?: string
}

export const MOCK_RETURNS: ReturnRecord[] = [
  {
    returnId: 3,
    orderId: 0,
    status: 'REQUESTED',
    requestedAt: '2026-10-28T10:12:00',
    productName: '저자극 데일리 선크림',
    itemCount: 1,
    img: '/images/sunscreen.jpg',
    refundAmount: 21000,
    reason: '상품 불량',
  },
  {
    returnId: 2,
    orderId: 0,
    status: 'APPROVED',
    requestedAt: '2026-10-12T19:40:00',
    productName: '라이트 윈드브레이커',
    itemCount: 1,
    img: '/images/windbreaker.jpg',
    refundAmount: 48000,
    reason: '단순 변심',
  },
  {
    returnId: 1,
    orderId: 0,
    status: 'REJECTED',
    requestedAt: '2026-09-30T08:05:00',
    productName: '약산성 수분 진정 토너',
    itemCount: 2,
    img: '/images/toner.jpg',
    refundAmount: 37800,
    reason: '기타',
    rejectReason: '개봉 후 사용한 흔적이 있어 반품할 수 없어요.',
  },
]
