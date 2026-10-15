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

/**
 * 장바구니 담기. 옵션 단위로 담고, 같은 옵션은 수량이 합쳐져요. 응답의 quantity는 합친 뒤 수량이에요.
 * 오류: 400-STOCK_EXCEEDED(합친 수량이 재고 초과·품절), 400-SELF_PURCHASE_NOT_ALLOWED(본인 상품),
 *      409-PRODUCT_NOT_ON_SALE, 400-CART_QUANTITY_INVALID(최대 99개 초과)
 */
export const addCartItem = (optionId: number, quantity: number) =>
  api<{ optionId: number; quantity: number }>('/api/v1/cart/items', { method: 'POST', body: { optionId, quantity } })
