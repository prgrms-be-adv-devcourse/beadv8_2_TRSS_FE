import type { ScreenRoute } from '../routes'
import MainPage from '../pages/Main'
import ProductDetailPage from '../pages/ProductDetail'

/** 구매자 · 쇼핑 (홈·카테고리·상품·리뷰·찜·알림·AI) */
export const buyerShopScreens: ScreenRoute[] = [
  { path: '/', title: '상품 목록', group: '구매자', element: <MainPage /> },
  {
    path: '/product/:productId',
    demo: '/product/1',
    title: '상품 상세',
    group: '구매자',
    element: <ProductDetailPage />,
  },
]
