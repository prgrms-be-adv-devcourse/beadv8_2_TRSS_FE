import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import MainPage from '../pages/Main'
import ProductDetailPage from '../pages/ProductDetail'
import CartPage from '../pages/Cart'
import CheckoutPage from '../pages/Checkout'
import PaymentPopupsPage from '../pages/PaymentPopups'
import OrderListPage from '../pages/OrderList'
import OrderDetailPage from '../pages/OrderDetail'
import OrderErrorsPage from '../pages/OrderErrors'
import WalletPage from '../pages/Wallet'
import TopupResultPage from '../pages/TopupResult'
import LoginPage from '../pages/Login'
import SignupPage from '../pages/Signup'
import KakaoCallbackPage from '../pages/KakaoCallback'
import MyPagePage from '../pages/MyPage'

/** 구매자 화면 */
export const buyerScreens: ScreenRoute[] = [
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
  { path: '/oauth/kakao/callback', title: '카카오 콜백', group: '구매자', element: <KakaoCallbackPage /> },
  { path: '/mypage', title: '마이페이지', auth: 'login', group: '구매자', element: <WithQuery page={MyPagePage} /> },
]
