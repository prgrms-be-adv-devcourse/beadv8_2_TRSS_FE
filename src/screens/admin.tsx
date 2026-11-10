import type { ScreenRoute } from '../routes'
import AdminSellersPage from '../pages/AdminSellers'
import AdminMembersPage from '../pages/AdminMembers'
import AdminProductsPage from '../pages/AdminProducts'
import AdminReturnsPage from '../pages/AdminReturns'
import AdminPaymentsPage from '../pages/AdminPayments'
import AdminFailedPage from '../pages/AdminFailed'
import AdminSettlementsPage from '../pages/AdminSettlements'
import AdminRetryModalPage from '../pages/AdminRetryModal'

/** 관리자 화면 */
export const adminScreens: ScreenRoute[] = [
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
