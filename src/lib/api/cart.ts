/**
 * 장바구니 API (백엔드 담당: 은정)
 *
 * GET    /api/v1/cart                    장바구니 조회
 * POST   /api/v1/cart/items              담기
 * PATCH  /api/v1/cart/items/{itemId}     수량 변경
 * PATCH  /api/v1/cart/items/selection    선택 변경
 * DELETE /api/v1/cart/items              삭제
 */

import { api } from '.'

/** 주문할 수 없는 사유. 백엔드: order.domain.UnorderableReason */
export type UnorderableReason =
  | 'PRODUCT_DELETED' // 상품이 삭제됐거나 없음
  | 'OPTION_DELETED' // 옵션이 삭제됨
  | 'PRODUCT_STOPPED' // 판매 중지
  | 'CATEGORY_INACTIVE' // 카테고리 비활성
  | 'SOLD_OUT' // 품절 (재고 0)
  | 'STOCK_INSUFFICIENT' // 재고가 담은 수량보다 적음
  | 'IN_PENDING_ORDER' // 결제 대기 중인 주문에 들어 있음

/** 장바구니 항목 하나. 구매 단위는 옵션이에요. 상품이 삭제되면 상품 정보는 null로 와요. */
export type CartItem = {
  itemId: number
  optionId: number
  productId: number | null
  /** 판매자 상호명. 상품·판매자 정보가 없으면 null */
  sellerName: string | null
  productName: string | null
  optionName: string | null
  thumbnailUrl: string | null
  /** 지금 가격 (조회할 때마다 다시 계산) */
  price: number
  quantity: number
  lineAmount: number
  selected: boolean
  orderable: boolean
  unorderableReason: UnorderableReason | null
}

export type Cart = {
  items: CartItem[]
  /** 선택된 항목 수 (주문할 수 없는 항목 포함) */
  selectedCount: number
  /** 선택했고 주문할 수 있는 항목의 합계 */
  expectedTotalPrice: number
  /** 선택한 항목이 1개 이상이고 모두 주문할 수 있는지 */
  orderable: boolean
}

export const getCart = () => api<Cart>('/api/v1/cart')

/** 같은 옵션을 다시 담으면 수량이 합쳐져요. */
export const addCartItem = (optionId: number, quantity: number) =>
  api<{ optionId: number; quantity: number }>('/api/v1/cart/items', {
    method: 'POST',
    body: { optionId, quantity },
  })

/** 수량·선택 여부 중 바꿀 값만 보내요. */
export const updateCartItem = (itemId: number, body: { quantity?: number; selected?: boolean }) =>
  api<void>(`/api/v1/cart/items/${itemId}`, { method: 'PATCH', body })

export const selectAllCartItems = (selected: boolean) =>
  api<void>('/api/v1/cart/items/selection', { method: 'PATCH', body: { selected } })

/** 백엔드가 itemIds=1&itemIds=2 형태를 받아서 쿼리를 직접 만들어요. */
export const deleteCartItems = (itemIds: number[]) =>
  api<void>(`/api/v1/cart/items?${itemIds.map((id) => `itemIds=${id}`).join('&')}`, { method: 'DELETE' })
