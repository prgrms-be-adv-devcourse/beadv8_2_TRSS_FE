import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import CartPage from '../pages/Cart'
import CheckoutPage from '../pages/Checkout'
import PaymentPopupsPage from '../pages/PaymentPopups'
import OrderListPage from '../pages/OrderList'
import OrderDetailPage from '../pages/OrderDetail'
import OrderErrorsPage from '../pages/OrderErrors'

/** 구매자 · 주문 (장바구니·결제·주문·반품) */
export const buyerOrderScreens: ScreenRoute[] = [
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
]
