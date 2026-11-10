/**
 * 백엔드에 아직 없는 관리자 API의 목업 데이터 (인플루언서 심사 · 반품 심사)
 * 화면 안 상태만 바뀌고 새로고침하면 처음으로 돌아가요.
 */

// ── 인플루언서 심사 ──────────────────────────────────────
// TODO(API 미구현): GET /api/v1/admin/influencers?status= — 인플루언서 신청 목록(탭별 건수 포함)
// TODO(API 미구현): POST /api/v1/admin/influencers/{id}/approve | reject | revoke — 승인·반려(사유)·자격 해제(사유)

export type InfluencerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'

export type InfluencerHistory = { label: string; at: string; note?: string }

export type MockInfluencer = {
  id: number
  status: InfluencerStatus
  nickname: string
  email: string
  appliedAt: string
  sns: string
  intro: string
  /** 반려·해제 사유 */
  reason?: string
  history: InfluencerHistory[]
}

export const MOCK_INFLUENCERS: MockInfluencer[] = [
  {
    id: 1,
    status: 'PENDING',
    nickname: '[활동명 A]',
    email: 'so***@example.com',
    appliedAt: '11.09',
    sns: 'https://instagram.com/[계정 A]',
    intro: '[신청자가 쓴 소개]',
    history: [{ label: '신청', at: '11.09' }],
  },
  {
    id: 2,
    status: 'PENDING',
    nickname: '[활동명 B]',
    email: 'mi***@example.com',
    appliedAt: '11.08',
    sns: 'https://youtube.com/@[계정 B]',
    intro: '[신청자가 쓴 소개]',
    history: [
      { label: '신청', at: '11.01' },
      { label: '반려', at: '11.02', note: 'SNS 계정에서 본인 확인이 어려워요.' },
      { label: '다시 신청', at: '11.08' },
    ],
  },
  {
    id: 3,
    status: 'APPROVED',
    nickname: '[활동명 C]',
    email: 'ha***@example.com',
    appliedAt: '10.20',
    sns: 'https://instagram.com/[계정 C]',
    intro: '[신청자가 쓴 소개]',
    history: [
      { label: '신청', at: '10.20' },
      { label: '승인', at: '10.21' },
    ],
  },
  {
    id: 4,
    status: 'REJECTED',
    nickname: '[활동명 D]',
    email: 'jy***@example.com',
    appliedAt: '10.18',
    sns: 'https://instagram.com/[계정 D]',
    intro: '[신청자가 쓴 소개]',
    reason: '[반려 사유]',
    history: [
      { label: '신청', at: '10.18' },
      { label: '반려', at: '10.19', note: '[반려 사유]' },
    ],
  },
  {
    id: 5,
    status: 'REVOKED',
    nickname: '[활동명 E]',
    email: 'yu***@example.com',
    appliedAt: '09.02',
    sns: 'https://instagram.com/[계정 E]',
    intro: '[신청자가 쓴 소개]',
    reason: '[해제 사유]',
    history: [
      { label: '신청', at: '09.02' },
      { label: '승인', at: '09.03' },
      { label: '자격 해제', at: '10.30', note: '[해제 사유]' },
    ],
  },
]

// ── 반품 심사 ───────────────────────────────────────────
// TODO(API 미구현): GET /api/v1/admin/returns?status= — 반품 요청 목록(탭별 건수 포함)
// TODO(API 미구현): POST /api/v1/admin/returns/{id}/approve (항목별 재고 복원 여부) | reject (사유) — 승인 시 예치금 환불

export type ReturnStatus = 'REQUESTED' | 'COMPLETED' | 'REJECTED'

export type MockReturnItem = {
  id: number
  name: string
  option: string
  image: string
  /** 재고로 돌릴지 (관리자가 고름) */
  restock: boolean
}

export type MockReturn = {
  id: number
  status: ReturnStatus
  orderNumber: string
  buyer: string
  requestedAt: string
  reason: string
  detail: string
  refundAmount: number
  shippingIncluded: boolean
  items: MockReturnItem[]
  rejectReason?: string
}

export const MOCK_RETURNS: MockReturn[] = [
  {
    id: 1,
    status: 'REQUESTED',
    orderNumber: '[주문번호 A]',
    buyer: 'so***@example.com',
    requestedAt: '11.09',
    reason: '사이즈가 맞지 않아요',
    detail: '사이즈가 생각보다 커요.',
    refundAmount: 75000,
    shippingIncluded: true,
    items: [
      { id: 11, name: '라이트 윈드브레이커', option: '블랙 / L · 1개', image: '/images/windbreaker.jpg', restock: true },
      { id: 12, name: '시카 리페어 크림 50ml', option: '1개 · 개봉', image: '/images/cica-cream.jpg', restock: false },
    ],
  },
  {
    id: 2,
    status: 'REQUESTED',
    orderNumber: '[주문번호 B]',
    buyer: 'mi***@example.com',
    requestedAt: '11.08',
    reason: '상품 불량',
    detail: '뚜껑이 깨진 채로 왔어요.',
    refundAmount: 37800,
    shippingIncluded: false,
    items: [{ id: 21, name: '약산성 수분 진정 토너 300ml', option: '2개', image: '/images/toner.jpg', restock: false }],
  },
  {
    id: 3,
    status: 'COMPLETED',
    orderNumber: '[주문번호 C]',
    buyer: 'ha***@example.com',
    requestedAt: '11.02',
    reason: '단순 변심',
    detail: '다른 제품을 쓰기로 했어요.',
    refundAmount: 21000,
    shippingIncluded: false,
    items: [{ id: 31, name: '저자극 데일리 선크림', option: '1개 · 미개봉', image: '/images/sunscreen.jpg', restock: true }],
  },
]
