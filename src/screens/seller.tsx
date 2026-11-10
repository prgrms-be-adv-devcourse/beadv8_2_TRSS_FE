import { Navigate } from 'react-router-dom'
import type { ScreenRoute } from '../routes'
import SellerApplyPage from '../pages/seller/Apply'
import SellerStatusPage from '../pages/seller/Status'
import SellerProductsPage from '../pages/seller/Products'
import SellerProductFormPage from '../pages/seller/ProductForm'
import SellerStopRequestPage from '../pages/seller/StopRequest'
import SellerStockPage from '../pages/seller/Stock'
import SellerOrdersPage from '../pages/seller/Orders'
import SellerSettlementsPage from '../pages/seller/Settlements'
import SellerInfoPage from '../pages/seller/Info'
import SellerPartnersPage from '../pages/seller/Partners'
import SellerCouponsPage from '../pages/seller/Coupons'
import SellerCouponFormPage from '../pages/seller/CouponForm'

/** 판매자 화면 (TRSS-201 판매자 센터: 1024px 이상 사이드바+표, 미만 모바일) */
export const sellerScreens: ScreenRoute[] = [
  {
    path: '/seller',
    title: '판매자 센터 (→ 상품 관리)',
    auth: 'SELLER',
    group: '판매자',
    element: <Navigate to="/seller/products" replace />,
  },
  { path: '/seller/apply', title: '판매자 신청 (S7)', auth: 'login', group: '판매자', element: <SellerApplyPage /> },
  {
    path: '/seller/status',
    demo: '/seller/status?state=PENDING',
    title: '판매자 신청 상태 (S8)',
    auth: 'login',
    group: '판매자',
    element: <SellerStatusPage />,
  },
  { path: '/seller/products', title: '상품 관리 (S1)', auth: 'SELLER', group: '판매자', element: <SellerProductsPage /> },
  {
    path: '/seller/products/new',
    title: '상품 등록 (S2)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerProductFormPage />,
  },
  {
    path: '/seller/products/:productId/edit',
    demo: '/seller/products/1/edit',
    title: '상품 수정 (S2)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerProductFormPage />,
  },
  {
    path: '/seller/products/:productId/stop',
    demo: '/seller/products/1/stop',
    title: '판매 중지 요청 (S13)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerStopRequestPage />,
  },
  { path: '/seller/stock', title: '재고 (S3)', auth: 'SELLER', group: '판매자', element: <SellerStockPage /> },
  { path: '/seller/orders', title: '주문 (S4)', auth: 'SELLER', group: '판매자', element: <SellerOrdersPage /> },
  {
    path: '/seller/settlements',
    title: '정산 (S5)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerSettlementsPage />,
  },
  { path: '/seller/info', title: '판매자 정보 (S6)', auth: 'SELLER', group: '판매자', element: <SellerInfoPage /> },
  {
    path: '/seller/partners',
    title: '인플루언서 협약 (S9)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerPartnersPage />,
  },
  { path: '/seller/coupons', title: '상품 쿠폰 (S10)', auth: 'SELLER', group: '판매자', element: <SellerCouponsPage /> },
  {
    path: '/seller/coupons/new',
    title: '쿠폰 발행 (S11)',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerCouponFormPage />,
  },
]
