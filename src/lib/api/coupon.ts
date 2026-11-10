/**
 * 쿠폰 API (백엔드 담당: 은정, market-service)
 *
 * [구매자] (USER)
 * GET   /api/v1/coupons/cart?cartItemIds=1,2      사용 가능한 장바구니 쿠폰 (cartItemIds를 주면 예상 할인액 계산)
 * POST  /api/v1/coupons/validate                  상품 쿠폰 코드 검증 { code, cartItemId } (예약 안 함)
 * GET   /api/v1/users/me/coupon-usages            내 쿠폰 사용 내역 (PageResponse, 최신순)
 * [판매자] (USER + 판매자 승인 상태)
 * POST  /api/v1/seller/coupons                    상품 쿠폰 발행 → { couponId, code }
 * GET   /api/v1/seller/coupons ?status            내 쿠폰 목록 (PageResponse, 최신 발행순)
 * GET   /api/v1/seller/coupons/{couponId}         쿠폰 상세
 * PATCH /api/v1/seller/coupons/{couponId}         쿠폰 수정 (보낸 항목만. 시작 후에는 validUntil 연장만)
 * POST  /api/v1/seller/coupons/{couponId}/stop    쿠폰 중지 (해제 없음)
 * [관리자] (ADMIN)
 * GET   /api/v1/admin/coupons ?type&status&sellerId&influencerId   전체 쿠폰 (PageResponse, 최신 등록순, sort 무시)
 * GET   /api/v1/admin/coupons/{couponId}          쿠폰 상세 (사용 내역은 page·size로 나눠 옴)
 * POST  /api/v1/admin/coupons/cart                장바구니 쿠폰 등록 → { couponId }
 * POST  /api/v1/admin/coupons/{couponId}/stop     쿠폰 강제 중지 { reason }
 *
 * 인플루언서 쿠폰(GET /api/v1/influencer/coupons)은 partnership.ts에 있어요.
 * 일시(LocalDateTime)는 시간대 없는 'yyyy-MM-ddTHH:mm:ss' 문자열이에요. validFrom은 포함, validUntil은 포함하지 않아요.
 */
import { api, type PageQuery, type PageResponse } from '.'

// ── enum ──
/** 쿠폰 종류 */
export type CouponType = 'PRODUCT' | 'CART'
export const COUPON_TYPE_LABEL: Record<CouponType, string> = { PRODUCT: '상품 쿠폰', CART: '장바구니 쿠폰' }

/** 화면용 쿠폰 상태 (저장값이 아니라 유효 기간·중지 여부로 계산) */
export type CouponDisplayStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED' | 'STOPPED'
export const COUPON_DISPLAY_STATUS_LABEL: Record<CouponDisplayStatus, string> = {
  SCHEDULED: '시작 전',
  ACTIVE: '사용 가능',
  ENDED: '종료',
  STOPPED: '중지',
}

/** 쿠폰 등록 주체. issuerId는 SELLER면 판매자 ID(seller.id), ADMIN이면 관리자 회원 ID */
export type CouponIssuerType = 'SELLER' | 'ADMIN'
export const COUPON_ISSUER_TYPE_LABEL: Record<CouponIssuerType, string> = { SELLER: '판매자', ADMIN: '관리자' }

/** 쿠폰 중지 주체. SYSTEM은 협약 종료·상품 판매 중지·판매자 제재 등으로 자동 중지 */
export type CouponStoppedBy = 'SELLER' | 'ADMIN' | 'SYSTEM'
export const COUPON_STOPPED_BY_LABEL: Record<CouponStoppedBy, string> = {
  SELLER: '판매자 중지',
  ADMIN: '관리자 중지',
  SYSTEM: '자동 중지',
}

/** 쿠폰 사용 기록 상태 */
export type CouponUsageStatus = 'RESERVED' | 'USED' | 'RELEASED'
export const COUPON_USAGE_STATUS_LABEL: Record<CouponUsageStatus, string> = {
  RESERVED: '예약', // 결제 대기 주문에 예약
  USED: '사용', // 결제 완료
  RELEASED: '해제', // 결제 전 취소·만료로 예약 해제
}

/** 상품 쿠폰 할인 방식 */
export type DiscountType = 'FIXED' | 'RATE'
export const DISCOUNT_TYPE_LABEL: Record<DiscountType, string> = { FIXED: '정액', RATE: '정률' }

// ── 공통 ──
/** 장바구니 쿠폰 할인 구간. 주문 금액이 넘는 구간 중 가장 높은 구간 하나만 적용 */
export type CartCouponTier = {
  /** 최소 주문 금액 (이 금액 이상) */
  minOrderAmount: number
  discountAmount: number
}

// ── 구매자 ──
/** BE CartCouponDto */
export type CartCoupon = {
  couponId: number
  name: string
  /** 최소 주문 금액 오름차순 */
  tiers: CartCouponTier[]
  validFrom: string
  validUntil: string
  /** 이미 썼거나 다른 주문에 예약함 (1인 1회) */
  used: boolean
  /** 수량 제한 쿠폰이 모두 소진됨 */
  soldOut: boolean
  /** cartItemIds를 보냈을 때만 값. 썼거나 소진·구간 미달이면 0 */
  expectedDiscountAmount: number | null
  /** cartItemIds를 보냈을 때만 값 (할인액 > 0) */
  applicable: boolean | null
}
/** BE CartCouponsDto */
export type CartCoupons = {
  /** cartItemIds 항목들의 현재 상품 금액 합계(배송비 제외). 안 보냈으면 null */
  orderAmount: number | null
  /** 종료가 가까운 순 */
  coupons: CartCoupon[]
}

/** BE ProductCouponValidationDto. 예약은 하지 않고 주문 생성 때 다시 검증해요. */
export type ProductCouponValidation = {
  couponId: number
  code: string
  couponName: string
  cartItemId: number
  productId: number
  /** 그 항목의 현재 금액 (단가 × 수량) */
  lineAmount: number
  /** 예상 할인액 (항목 금액을 넘지 않음) */
  expectedDiscountAmount: number
  validUntil: string
}

/** BE MyCouponUsageDto */
export type MyCouponUsage = {
  usageId: number
  couponId: number
  couponName: string
  couponType: CouponType
  orderId: number
  discountAmount: number
  status: CouponUsageStatus
  reservedAt: string
  usedAt: string | null
  releasedAt: string | null
}

// ── 판매자 ──
/** BE ProductCouponDto (판매자 목록·상세, 인플루언서 목록 공통) */
export type ProductCoupon = {
  couponId: number
  name: string
  status: CouponDisplayStatus
  /** 쿠폰 코드 (대문자·숫자 10자리) */
  code: string
  partnershipId: number
  sellerId: number
  /** 판매자 상호명. 조회 실패 시 null */
  businessName: string | null
  influencerId: number
  /** 인플루언서 활동명. 조회 실패 시 null */
  activityName: string | null
  productId: number
  productName: string | null
  discountType: DiscountType
  /** FIXED면 할인액(원), RATE면 할인율(%) */
  discountValue: number
  /** RATE일 때 최대 할인액. FIXED면 null */
  maxDiscountAmount: number | null
  validFrom: string
  validUntil: string
  quantityLimited: boolean
  /** 수량 제한이 없으면 null */
  totalQuantity: number | null
  /** 수량 제한이 없으면 null. 예약된 수량도 빠진 값 */
  remainingQuantity: number | null
  /** 사용(USED) 수. 예약 중인 것은 세지 않음 */
  usedCount: number
  usedDiscountAmount: number
  stoppedBy: CouponStoppedBy | null
  /** 판매자 중지거나 중지되지 않았으면 null */
  stopReason: string | null
  stoppedAt: string | null
  createdAt: string
}

/**
 * 상품 쿠폰 발행 요청 (BE ProductCouponIssueRequest)
 * - RATE: discountValue 1~99, maxDiscountAmount 필수 / FIXED: maxDiscountAmount 보내지 않음
 * - quantityLimited=true면 totalQuantity(1~1,000,000) 필수, false면 보내지 않음
 */
export type ProductCouponIssueRequest = {
  partnershipId: number
  /** 진행 중 협약의 인플루언서가 pick한 내 판매 중 상품 */
  productId: number
  /** 최대 100자 */
  name: string
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount?: number
  validFrom: string
  validUntil: string
  quantityLimited: boolean
  totalQuantity?: number
}
/** BE ProductCouponIssueResultDto */
export type ProductCouponIssueResult = {
  couponId: number
  /** 인플루언서가 구독자에게 전달할 코드 */
  code: string
}

/**
 * 상품 쿠폰 수정 요청 (BE ProductCouponUpdateRequest). 보낸 항목만 바꿔요(하나 이상 필수).
 * - 시작 전: 모든 항목 / 시작 후: validUntil 연장만
 * - discountType을 보내면 discountValue도, RATE면 maxDiscountAmount도 함께
 * - quantityLimited=true면 totalQuantity 필수, false면 보내지 않음
 */
export type ProductCouponUpdateRequest = Partial<{
  name: string
  discountType: DiscountType
  discountValue: number
  maxDiscountAmount: number
  validFrom: string
  validUntil: string
  quantityLimited: boolean
  totalQuantity: number
}>

// ── 관리자 ──
/** BE ProductCouponInfoDto. 관리자 목록·상세에 붙는 상품 쿠폰 정보 */
export type ProductCouponInfo = {
  partnershipId: number
  influencerId: number
  productId: number
  code: string
  discountType: DiscountType
  discountValue: number
  /** RATE일 때만 */
  maxDiscountAmount: number | null
}

/** BE AdminCouponSummaryDto (관리자 목록 1행) */
export type AdminCouponSummary = {
  couponId: number
  couponType: CouponType
  issuerType: CouponIssuerType
  issuerId: number
  name: string
  status: CouponDisplayStatus
  validFrom: string
  validUntil: string
  quantityLimited: boolean
  totalQuantity: number | null
  remainingQuantity: number | null
  usedCount: number
  usedDiscountAmount: number
  createdAt: string
  /** 장바구니 쿠폰이면 null */
  productCoupon: ProductCouponInfo | null
}

/** BE AdminCouponUsageDto */
export type AdminCouponUsage = {
  usageId: number
  memberId: number
  orderId: number
  /** 상품 쿠폰이 붙은 주문 항목. 장바구니 쿠폰은 null */
  orderItemId: number | null
  discountAmount: number
  status: CouponUsageStatus
  reservedAt: string
  usedAt: string | null
  releasedAt: string | null
}

/** BE AdminCouponDetailDto */
export type AdminCouponDetail = Omit<AdminCouponSummary, 'createdAt' | 'productCoupon'> & {
  /** 장바구니 쿠폰의 할인 구간(오름차순). 상품 쿠폰은 빈 배열 */
  tiers: CartCouponTier[]
  stoppedBy: CouponStoppedBy | null
  stopReason: string | null
  stoppedAt: string | null
  createdAt: string
  productCoupon: ProductCouponInfo | null
  /** 사용 내역 (최신순, 요청한 page·size) */
  usages: PageResponse<AdminCouponUsage>
}

/**
 * 장바구니 쿠폰 등록 요청 (BE CartCouponCreateRequest)
 * - tiers 1~10개, 각 discountAmount < minOrderAmount
 * - validUntil은 현재 이후. quantityLimited=true면 totalQuantity(1~1,000,000) 필수, false면 보내지 않음
 */
export type CartCouponCreateRequest = {
  /** 최대 100자 */
  name: string
  tiers: CartCouponTier[]
  validFrom: string
  validUntil: string
  quantityLimited: boolean
  totalQuantity?: number
}

// ── 구매자 ──
/** cartItemIds를 주면 그 항목 금액으로 쿠폰별 예상 할인액을 계산해 줘요. */
export const getCartCoupons = (cartItemIds?: number[]) =>
  api<CartCoupons>('/api/v1/coupons/cart', {
    query: { cartItemIds: cartItemIds?.length ? cartItemIds.join(',') : undefined },
  })
/** 코드는 대소문자 구분 없음. 상품 쿠폰은 한 주문에 1개, 항목 1개에 붙어요. */
export const validateProductCoupon = (code: string, cartItemId: number) =>
  api<ProductCouponValidation>('/api/v1/coupons/validate', { method: 'POST', body: { code, cartItemId } })
export const getMyCouponUsages = (query: PageQuery = {}) =>
  api<PageResponse<MyCouponUsage>>('/api/v1/users/me/coupon-usages', { query })

// ── 판매자 ──
export const issueProductCoupon = (body: ProductCouponIssueRequest) =>
  api<ProductCouponIssueResult>('/api/v1/seller/coupons', { method: 'POST', body })
export const getSellerCoupons = (query: PageQuery & { status?: CouponDisplayStatus } = {}) =>
  api<PageResponse<ProductCoupon>>('/api/v1/seller/coupons', { query })
export const getSellerCoupon = (couponId: number) => api<ProductCoupon>(`/api/v1/seller/coupons/${couponId}`)
export const updateProductCoupon = (couponId: number, body: ProductCouponUpdateRequest) =>
  api<void>(`/api/v1/seller/coupons/${couponId}`, { method: 'PATCH', body })
export const stopSellerCoupon = (couponId: number) =>
  api<void>(`/api/v1/seller/coupons/${couponId}/stop`, { method: 'POST' })

// ── 관리자 ──
/** sellerId·influencerId를 보내면 장바구니 쿠폰은 빠져요. sort는 무시(최신 등록순). */
export const getAdminCoupons = (
  query: PageQuery & {
    type?: CouponType
    status?: CouponDisplayStatus
    sellerId?: number
    influencerId?: number
  } = {},
) => api<PageResponse<AdminCouponSummary>>('/api/v1/admin/coupons', { query })
/** query의 page·size는 사용 내역(usages) 페이지예요. */
export const getAdminCoupon = (couponId: number, query: PageQuery = {}) =>
  api<AdminCouponDetail>(`/api/v1/admin/coupons/${couponId}`, { query })
export const createCartCoupon = (body: CartCouponCreateRequest) =>
  api<{ couponId: number }>('/api/v1/admin/coupons/cart', { method: 'POST', body })
/** 사유 필수(최대 300자). 이미 주문에 예약된 쿠폰은 그대로 결제·취소를 따라가요. */
export const stopAdminCoupon = (couponId: number, reason: string) =>
  api<void>(`/api/v1/admin/coupons/${couponId}/stop`, { method: 'POST', body: { reason } })
