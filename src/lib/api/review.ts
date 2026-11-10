/**
 * 리뷰 API (market-service)
 *
 * [공개] (로그인 불필요)
 * GET    /api/v1/products/{productId}/reviews ?sort=LATEST|RATING_HIGH|RATING_LOW   상품 리뷰 목록 (PageResponse)
 * GET    /api/v1/products/{productId}/reviews/summary                              평점 요약
 * [구매자] (USER)
 * POST   /api/v1/reviews                리뷰 작성 { orderItemId, rating, content } → { reviewId } (resultCode 201-1)
 * GET    /api/v1/reviews/me             내 리뷰 목록 (PageResponse, 최근 쓴 순)
 * DELETE /api/v1/reviews/{reviewId}     리뷰 삭제 (그 주문 항목에는 다시 쓸 수 없음)
 *
 * PATCH /api/v1/reviews/{reviewId}(수정)은 정책상 쓰지 않아서 넣지 않았어요.
 */
import { api, type PageQuery, type PageResponse } from '.'

/** 상품 리뷰 정렬. 별점이 같으면 최신순 */
export type ReviewSort = 'LATEST' | 'RATING_HIGH' | 'RATING_LOW'
export const REVIEW_SORT_LABEL: Record<ReviewSort, string> = {
  LATEST: '최신순',
  RATING_HIGH: '별점 높은순',
  RATING_LOW: '별점 낮은순',
}

/** BE ProductReviewDto */
export type ProductReview = {
  reviewId: number
  /** 작성 시점 이름, 가운데 글자는 * */
  reviewerName: string
  /** 1~5 */
  rating: number
  content: string
  /** 구매한 옵션명 (주문 시점) */
  optionName: string
  /** 작성 후 수정했는지 */
  modified: boolean
  createdAt: string
}

/** BE ReviewSummaryDto (삭제된 리뷰 제외) */
export type ReviewSummary = {
  /** 소수 첫째 자리 반올림. 리뷰가 없으면 0 */
  averageRating: number
  reviewCount: number
  /**
   * 별점별 리뷰 수. 키는 "5"~"1"이고 0개도 포함.
   * BE는 5점부터 주지만 JS 객체는 숫자 키를 오름차순으로 돌기 때문에 화면에서는 [5,4,3,2,1]로 직접 꺼내 쓰세요.
   */
  ratingCounts: Record<number, number>
}

/** BE MyReviewDto */
export type MyReview = {
  reviewId: number
  orderItemId: number
  productId: number
  /** 현재 상품명 (삭제된 상품도 줌). 상품 정보를 못 찾으면 null */
  productName: string | null
  thumbnailUrl: string | null
  optionName: string
  rating: number
  content: string
  modified: boolean
  createdAt: string
}

/** 리뷰 작성 요청 (BE ReviewCreateRequest) */
export type ReviewCreateRequest = {
  /** 본인의 구매 확정 주문 항목 */
  orderItemId: number
  /** 1~5 */
  rating: number
  /** 10~1,000자 */
  content: string
}

// ── 공개 ──
/** sort는 Pageable sort가 아니라 ReviewSort 값이에요(기본 LATEST). */
export const getProductReviews = (productId: number, query: Omit<PageQuery, 'sort'> & { sort?: ReviewSort } = {}) =>
  api<PageResponse<ProductReview>>(`/api/v1/products/${productId}/reviews`, { query })
export const getReviewSummary = (productId: number) =>
  api<ReviewSummary>(`/api/v1/products/${productId}/reviews/summary`)

// ── 구매자 ──
/** 404-ORDER_ITEM_NOT_REVIEWABLE(구매 확정 전·취소·반품·본인 아님), 409-REVIEW_ALREADY_EXISTS */
export const createReview = (body: ReviewCreateRequest) =>
  api<{ reviewId: number }>('/api/v1/reviews', { method: 'POST', body })
export const getMyReviews = (query: PageQuery = {}) => api<PageResponse<MyReview>>('/api/v1/reviews/me', { query })
export const deleteReview = (reviewId: number) => api<void>(`/api/v1/reviews/${reviewId}`, { method: 'DELETE' })
