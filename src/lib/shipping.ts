/**
 * 배송비 정책 (백엔드 TRSS-206·210, market-service application.yaml custom.order)
 * - 주문당 한 번 2,500원
 * - 상품 쿠폰 할인 후 상품 금액 합계가 30,000원 이상이면 무료 (장바구니 쿠폰은 기준에 영향 없음)
 *
 * 실제 금액은 서버 응답(장바구니 shippingFee · 주문 shippingFee)을 따르고,
 * 이 값은 서버 응답 전 화면 계산(장바구니 선택 변경, 주문서 쿠폰 적용)과 안내 문구에만 써요.
 */
export const SHIPPING_FEE = 2500
export const FREE_SHIPPING_THRESHOLD = 30000

/** 배송비. 주문할 상품이 없으면 0 */
export const shippingFeeFor = (productAmount: number) =>
  productAmount <= 0 || productAmount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE

/** 무료 배송까지 남은 금액. 이미 무료이거나 주문할 상품이 없으면 0 */
export const remainingForFreeShipping = (productAmount: number) =>
  productAmount <= 0 ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD - productAmount)
