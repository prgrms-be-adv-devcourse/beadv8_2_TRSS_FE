/**
 * 협약·인플루언서 쿠폰 API (백엔드 담당: 은정, market-service)
 *
 * [판매자] (USER + 판매자 승인 상태)
 * POST /api/v1/seller/partnerships                                 협약 요청 { influencerId, message } → { partnershipId }
 * GET  /api/v1/seller/partnerships ?status                         내 협약 목록 (PageResponse, 최신 요청순)
 * POST /api/v1/seller/partnerships/{partnershipId}/end             협약 종료 (그 협약의 상품 쿠폰 모두 중지)
 * [인플루언서] (USER + 인플루언서 승인 상태)
 * GET  /api/v1/influencer/partnerships ?status                     받은 협약 목록 (PageResponse, 최신 요청순)
 * POST /api/v1/influencer/partnerships/{partnershipId}/accept      수락 → ACTIVE
 * POST /api/v1/influencer/partnerships/{partnershipId}/reject      거절 → REJECTED
 * POST /api/v1/influencer/partnerships/{partnershipId}/end         종료 → ENDED (상품 쿠폰 모두 중지)
 * GET  /api/v1/influencer/coupons ?status                          나에게 발행된 쿠폰 (PageResponse, 최신 발행순)
 * [관리자] (ADMIN)
 * GET  /api/v1/admin/partnerships ?sellerId&influencerId&status    전체 협약 목록 (PageResponse, 최신 요청순)
 */
import { api, type PageQuery, type PageResponse } from '.'
import type { CouponDisplayStatus, ProductCoupon } from './coupon'

/** 협약 상태. ACTIVE에서만 상품 쿠폰을 발행할 수 있어요. */
export type PartnershipStatus = 'REQUESTED' | 'ACTIVE' | 'REJECTED' | 'ENDED'
export const PARTNERSHIP_STATUS_LABEL: Record<PartnershipStatus, string> = {
  REQUESTED: '요청 중',
  ACTIVE: '진행 중',
  REJECTED: '거절',
  ENDED: '종료',
}

/** 협약 종료 주체. SYSTEM은 판매자 제재로 자동 종료 */
export type PartnershipEndedBy = 'SELLER' | 'INFLUENCER' | 'SYSTEM'
export const PARTNERSHIP_ENDED_BY_LABEL: Record<PartnershipEndedBy, string> = {
  SELLER: '판매자',
  INFLUENCER: '인플루언서',
  SYSTEM: '자동 종료',
}

/** BE PartnershipDto (판매자·인플루언서·관리자 목록 공통) */
export type Partnership = {
  partnershipId: number
  sellerId: number
  /** 판매자 상호명. 조회 실패 시 null */
  businessName: string | null
  /** 인플루언서 ID (influencer.id) */
  influencerId: number
  /** 인플루언서 활동명. 조회 실패 시 null */
  activityName: string | null
  status: PartnershipStatus
  /** 인플루언서 수수료율(%). TRSS-224 전에 만든 협약은 null */
  commissionRate: number | null
  requestMessage: string | null
  requestedAt: string
  acceptedAt: string | null
  rejectedAt: string | null
  endedAt: string | null
  endedBy: PartnershipEndedBy | null
}

type PartnershipQuery = PageQuery & { status?: PartnershipStatus }

// ── 판매자 ──
/** 인플루언서 수수료율(%) 범위 (BE PartnershipRequestRequest와 같음) */
export const COMMISSION_RATE_MIN = 15
export const COMMISSION_RATE_MAX = 30

/** influencerId는 influencer.id (회원 ID 아님). commissionRate는 15~30 정수(필수), message는 선택, 최대 500자 */
export const requestPartnership = (influencerId: number, commissionRate: number, message?: string) =>
  api<{ partnershipId: number }>('/api/v1/seller/partnerships', {
    method: 'POST',
    body: { influencerId, commissionRate, message },
  })
export const getSellerPartnerships = (query: PartnershipQuery = {}) =>
  api<PageResponse<Partnership>>('/api/v1/seller/partnerships', { query })
export const endSellerPartnership = (partnershipId: number) =>
  api<void>(`/api/v1/seller/partnerships/${partnershipId}/end`, { method: 'POST' })

// ── 인플루언서 ──
export const getInfluencerPartnerships = (query: PartnershipQuery = {}) =>
  api<PageResponse<Partnership>>('/api/v1/influencer/partnerships', { query })
export const acceptPartnership = (partnershipId: number) =>
  api<void>(`/api/v1/influencer/partnerships/${partnershipId}/accept`, { method: 'POST' })
export const rejectPartnership = (partnershipId: number) =>
  api<void>(`/api/v1/influencer/partnerships/${partnershipId}/reject`, { method: 'POST' })
export const endInfluencerPartnership = (partnershipId: number) =>
  api<void>(`/api/v1/influencer/partnerships/${partnershipId}/end`, { method: 'POST' })
export const getInfluencerCoupons = (query: PageQuery & { status?: CouponDisplayStatus } = {}) =>
  api<PageResponse<ProductCoupon>>('/api/v1/influencer/coupons', { query })

// ── 관리자 ──
export const getAdminPartnerships = (query: PartnershipQuery & { sellerId?: number; influencerId?: number } = {}) =>
  api<PageResponse<Partnership>>('/api/v1/admin/partnerships', { query })
