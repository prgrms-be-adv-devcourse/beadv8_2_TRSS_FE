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
 * 예: /orders/1?status=구매 확정, /mypage?sellerStatus=APPROVED
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WithQuery({ page: Page }: { page: ComponentType<any> }) {
  const [params] = useSearchParams()
  return <Page {...Object.fromEntries(params)} />
}

/**
 * auth: 들어가는 데 필요한 권한
 * - 없음: 누구나
 * - 'login': 로그인한 구매자·판매자 (관리자는 제외)
 * - 'SELLER': 판매자 센터. 로그인한 회원 중 판매자 상태가 판매 중(APPROVED)인 사람만 (App.tsx의 RequireActiveSeller가 확인해요)
 * - 'ADMIN': 관리자만 (App.tsx의 RequireRole이 확인해요)
 *
 * demo: 경로에 :id 가 있는 화면의 /screens 바로가기 주소
 */
export type ScreenAuth = 'login' | 'SELLER' | 'ADMIN'
export type ScreenRoute = {
  path: string
  title: string
  group: '구매자' | '판매자' | '관리자'
  element: ReactElement
  auth?: ScreenAuth
  demo?: string
}

/** 디자인 캔버스의 화면 하나가 라우트 하나예요. */
export const screens: ScreenRoute[] = [
  { path: '/', title: '상품 목록', group: '구매자', element: <MainPage /> },
  {
    path: '/product/:productId',
    demo: '/product/1',
    title: '상품 상세',
    group: '구매자',
    element: <ProductDetailPage />,
  },
  { path: '/cart', title: '장바구니', auth: 'login', group: '구매자', element: <CartPage /> },
  { path: '/checkout', title: '주문서', auth: 'login', group: '구매자', element: <CheckoutPage /> },
  { path: '/checkout/popups', title: '결제 팝업 모음', auth: 'login', group: '구매자', element: <PaymentPopupsPage /> },
  { path: '/orders', title: '주문 내역', auth: 'login', group: '구매자', element: <OrderListPage /> },
  {
    path: '/orders/:orderId',
    demo: '/orders/1',
    title: '주문 상세',
    auth: 'login',
    group: '구매자',
    element: <WithQuery page={OrderDetailPage} />,
  },
  {
    path: '/orders/errors',
    title: '주문·결제 안내 모달 모음',
    auth: 'login',
    group: '구매자',
    element: <OrderErrorsPage />,
  },
  { path: '/wallet', title: '예치금', auth: 'login', group: '구매자', element: <WalletPage /> },
  {
    path: '/wallet/topup-result',
    title: '충전 결과',
    auth: 'login',
    group: '구매자',
    element: <TopupResultPage />,
  },
  { path: '/login', title: '로그인', group: '구매자', element: <LoginPage /> },
  { path: '/signup', title: '회원가입', group: '구매자', element: <SignupPage /> },
  { path: '/mypage', title: '마이페이지', auth: 'login', group: '구매자', element: <WithQuery page={MyPagePage} /> },
  { path: '/seller/apply', title: '판매자 신청', auth: 'login', group: '판매자', element: <SellerApplyPage /> },
  { path: '/seller/products', title: '상품 관리', auth: 'SELLER', group: '판매자', element: <SellerProductsPage /> },
  {
    path: '/seller/products/new',
    title: '상품 등록',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerProductFormPage />,
  },
  {
    path: '/seller/products/:productId/edit',
    demo: '/seller/products/1/edit',
    title: '상품 수정',
    auth: 'SELLER',
    group: '판매자',
    element: <SellerProductFormPage />,
  },
  { path: '/seller/stock', title: '재고', auth: 'SELLER', group: '판매자', element: <SellerStockPage /> },
  { path: '/seller/orders', title: '주문 항목', auth: 'SELLER', group: '판매자', element: <SellerOrdersPage /> },
  { path: '/seller/settlements', title: '정산', auth: 'SELLER', group: '판매자', element: <SellerSettlementsPage /> },
  {
    path: '/seller/info',
    title: '판매자 정보',
    auth: 'SELLER',
    group: '판매자',
    element: <WithQuery page={SellerInfoPage} />,
  },
  { path: '/admin/sellers', title: '판매자 심사', auth: 'ADMIN', group: '관리자', element: <AdminSellersPage /> },
  { path: '/admin/members', title: '회원', auth: 'ADMIN', group: '관리자', element: <AdminMembersPage /> },
  { path: '/admin/products', title: '상품과 카테고리', auth: 'ADMIN', group: '관리자', element: <AdminProductsPage /> },
  { path: '/admin/returns', title: '반품 심사', auth: 'ADMIN', group: '관리자', element: <AdminReturnsPage /> },
  { path: '/admin/payments', title: '결제 조회', auth: 'ADMIN', group: '관리자', element: <AdminPaymentsPage /> },
  { path: '/admin/failed', title: '실패 거래', auth: 'ADMIN', group: '관리자', element: <AdminFailedPage /> },
  {
    path: '/admin/settlements',
    title: '월 정산',
    auth: 'ADMIN',
    group: '관리자',
    element: <AdminSettlementsPage />,
  },
  {
    path: '/admin/settlements/retry-modal',
    title: '정산 재실행 모달',
    group: '관리자',
    auth: 'ADMIN',
    element: <AdminRetryModalPage />,
  },
]
