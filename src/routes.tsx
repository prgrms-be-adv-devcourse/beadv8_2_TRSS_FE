import type { ComponentType, ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'
import MainPage from './pages/Main'
import ProductDetailPage from './pages/ProductDetail'
import CartPage from './pages/Cart'
import CheckoutPage from './pages/Checkout'
import PaymentPopupsPage from './pages/PaymentPopups'
import OrderListPage from './pages/OrderList'
import OrderDetailPage from './pages/OrderDetail'
import OrderErrorsPage from './pages/OrderErrors'
import WalletPage from './pages/Wallet'
import TopupResultPage from './pages/TopupResult'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import MyPagePage from './pages/MyPage'
import SellerApplyPage from './pages/SellerApply'
import SellerProductsPage from './pages/SellerProducts'
import SellerProductFormPage from './pages/SellerProductForm'
import SellerStockPage from './pages/SellerStock'
import SellerOrdersPage from './pages/SellerOrders'
import SellerSettlementsPage from './pages/SellerSettlements'
import SellerInfoPage from './pages/SellerInfo'
import AdminSellersPage from './pages/AdminSellers'
import AdminMembersPage from './pages/AdminMembers'
import AdminProductsPage from './pages/AdminProducts'
import AdminReturnsPage from './pages/AdminReturns'
import AdminPaymentsPage from './pages/AdminPayments'
import AdminFailedPage from './pages/AdminFailed'
import AdminSettlementsPage from './pages/AdminSettlements'
import AdminRetryModalPage from './pages/AdminRetryModal'

/**
 * 화면 상태를 URL 쿼리로 바꿔 볼 수 있어요.
 * 예: /checkout?balance=충분&popup=결제 요청, /orders/detail?status=구매 확정, /mypage?sellerStatus=APPROVED
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WithQuery({ page: Page }: { page: ComponentType<any> }) {
  const [params] = useSearchParams()
  return <Page {...Object.fromEntries(params)} />
}

export type ScreenRoute = { path: string; title: string; group: '구매자' | '판매자' | '관리자'; element: ReactElement }

/** 디자인 캔버스의 화면 하나가 라우트 하나예요. */
export const screens: ScreenRoute[] = [
  { path: '/', title: '상품 목록', group: '구매자', element: <MainPage /> },
  { path: '/product', title: '상품 상세', group: '구매자', element: <ProductDetailPage /> },
  { path: '/cart', title: '장바구니', group: '구매자', element: <CartPage /> },
  { path: '/checkout', title: '주문서', group: '구매자', element: <WithQuery page={CheckoutPage} /> },
  { path: '/checkout/popups', title: '결제 팝업 모음', group: '구매자', element: <PaymentPopupsPage /> },
  { path: '/orders', title: '주문 내역', group: '구매자', element: <OrderListPage /> },
  { path: '/orders/detail', title: '주문 상세', group: '구매자', element: <WithQuery page={OrderDetailPage} /> },
  { path: '/orders/errors', title: '주문·결제 안내 모달 모음', group: '구매자', element: <OrderErrorsPage /> },
  { path: '/wallet', title: '예치금', group: '구매자', element: <WalletPage /> },
  { path: '/wallet/topup-result', title: '충전 결과', group: '구매자', element: <WithQuery page={TopupResultPage} /> },
  { path: '/login', title: '로그인', group: '구매자', element: <LoginPage /> },
  { path: '/signup', title: '회원가입', group: '구매자', element: <SignupPage /> },
  { path: '/mypage', title: '마이페이지', group: '구매자', element: <WithQuery page={MyPagePage} /> },
  { path: '/seller/apply', title: '판매자 신청', group: '판매자', element: <SellerApplyPage /> },
  { path: '/seller/products', title: '상품 관리', group: '판매자', element: <SellerProductsPage /> },
  { path: '/seller/products/new', title: '상품 등록', group: '판매자', element: <SellerProductFormPage /> },
  { path: '/seller/stock', title: '재고', group: '판매자', element: <SellerStockPage /> },
  { path: '/seller/orders', title: '주문 항목', group: '판매자', element: <SellerOrdersPage /> },
  { path: '/seller/settlements', title: '정산', group: '판매자', element: <SellerSettlementsPage /> },
  { path: '/seller/info', title: '판매자 정보', group: '판매자', element: <SellerInfoPage /> },
  { path: '/admin/sellers', title: '판매자 심사', group: '관리자', element: <AdminSellersPage /> },
  { path: '/admin/members', title: '회원', group: '관리자', element: <AdminMembersPage /> },
  { path: '/admin/products', title: '상품과 카테고리', group: '관리자', element: <AdminProductsPage /> },
  { path: '/admin/returns', title: '반품 심사', group: '관리자', element: <AdminReturnsPage /> },
  { path: '/admin/payments', title: '결제 조회', group: '관리자', element: <AdminPaymentsPage /> },
  { path: '/admin/failed', title: '실패 거래', group: '관리자', element: <AdminFailedPage /> },
  { path: '/admin/settlements', title: '월 정산', group: '관리자', element: <WithQuery page={AdminSettlementsPage} /> },
  {
    path: '/admin/settlements/retry-modal',
    title: '정산 재실행 모달',
    group: '관리자',
    element: <AdminRetryModalPage />,
  },
]
