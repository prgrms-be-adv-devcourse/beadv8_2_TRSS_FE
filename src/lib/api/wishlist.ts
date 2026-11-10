/**
 * 찜 API (market-service, 구매자 USER)
 *
 * GET    /api/v1/wishlist               내 찜 목록 (PageResponse, 최근 찜한 순)
 * PUT    /api/v1/wishlist/{productId}   찜 추가 (이미 찜했어도 성공, 품절도 가능)
 * DELETE /api/v1/wishlist/{productId}   찜 해제 (찜하지 않았어도 성공)
 */
import { api, type PageQuery, type PageResponse } from '.'

/** BE WishlistItemDto */
export type WishlistItem = {
  productId: number
  name: string
  price: number
  thumbnailUrl: string | null
  /** 삭제되지 않은 옵션의 재고가 모두 0 */
  soldOut: boolean
  /** 판매 중지·삭제·카테고리 사용 중지면 false (목록에는 남아요) */
  available: boolean
  /** 찜한 시각 */
  wishedAt: string
}

export const getWishlist = (query: PageQuery = {}) => api<PageResponse<WishlistItem>>('/api/v1/wishlist', { query })
/** 구매자에게 보이지 않는 상품이면 404-PRODUCT_NOT_FOUND */
export const addWishlist = (productId: number) => api<void>(`/api/v1/wishlist/${productId}`, { method: 'PUT' })
export const removeWishlist = (productId: number) => api<void>(`/api/v1/wishlist/${productId}`, { method: 'DELETE' })
