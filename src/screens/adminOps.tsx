import type { ScreenRoute } from '../routes'
import AdminSellersPage from '../pages/AdminSellers'
import AdminMembersPage from '../pages/AdminMembers'
import AdminProductsPage from '../pages/AdminProducts'
import AdminReturnsPage from '../pages/AdminReturns'
import AdminPaymentsPage from '../pages/AdminPayments'

/** 관리자 · 회원·심사·상품·결제·반품 */
export const adminOpsScreens: ScreenRoute[] = [
  { path: '/admin/sellers', title: '판매자 심사', auth: 'ADMIN', group: '관리자', element: <AdminSellersPage /> },
  { path: '/admin/members', title: '회원', auth: 'ADMIN', group: '관리자', element: <AdminMembersPage /> },
  { path: '/admin/products', title: '상품과 카테고리', auth: 'ADMIN', group: '관리자', element: <AdminProductsPage /> },
  { path: '/admin/returns', title: '반품 심사', auth: 'ADMIN', group: '관리자', element: <AdminReturnsPage /> },
  { path: '/admin/payments', title: '결제 조회', auth: 'ADMIN', group: '관리자', element: <AdminPaymentsPage /> },
]
