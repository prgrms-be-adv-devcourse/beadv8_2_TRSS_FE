import type { ScreenRoute } from '../routes'
import CartPage from '../pages/order/CartPage'
import CheckoutPage from '../pages/order/CheckoutPage'
import { OrderExpiredPage, PayDonePage, PayProgressPage } from '../pages/order/PayPages'
import OrderListPage from '../pages/order/OrderListPage'
import OrderDetailPage from '../pages/order/OrderDetailPage'
import ReturnPage from '../pages/order/ReturnPage'
import ModalsPage from '../pages/order/ModalsPage'

/** 구매자 · 주문 (장바구니·결제·주문·반품) */
export const buyerOrderScreens: ScreenRoute[] = [
  { path: '/cart', title: '장바구니', auth: 'login', group: '구매자', element: <CartPage /> },
  { path: '/checkout', title: '주문 결제', auth: 'login', group: '구매자', element: <CheckoutPage /> },
  { path: '/checkout/progress', title: '결제 진행', auth: 'login', group: '구매자', element: <PayProgressPage /> },
  {
    path: '/checkout/done',
    demo: '/checkout/done?orderId=1',
    title: '결제 완료',
    auth: 'login',
    group: '구매자',
    element: <PayDonePage />,
  },
  {
    path: '/orders/expired',
    demo: '/orders/expired?amount=20000&orderNumber=ORD-20261009-0142',
    title: '주문 만료',
    auth: 'login',
    group: '구매자',
    element: <OrderExpiredPage />,
  },
  { path: '/orders', title: '주문 내역', auth: 'login', group: '구매자', element: <OrderListPage /> },
  {
    path: '/orders/:orderId',
    demo: '/orders/1',
    title: '주문 상세 · 배송 조회',
    auth: 'login',
    group: '구매자',
    element: <OrderDetailPage />,
  },
  {
    path: '/orders/:orderId/return',
    demo: '/orders/1/return',
    title: '반품 요청',
    auth: 'login',
    group: '구매자',
    element: <ReturnPage />,
  },
  { path: '/modals', title: '안내 모달 · 경고 문구 모음', group: '구매자', element: <ModalsPage /> },
]
