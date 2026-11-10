import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import SellerApplyPage from '../pages/SellerApply'
import SellerProductsPage from '../pages/SellerProducts'
import SellerProductFormPage from '../pages/SellerProductForm'
import SellerStockPage from '../pages/SellerStock'
import SellerOrdersPage from '../pages/SellerOrders'
import SellerSettlementsPage from '../pages/SellerSettlements'
import SellerInfoPage from '../pages/SellerInfo'

/** 판매자 화면 */
export const sellerScreens: ScreenRoute[] = [
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
]
