import { Navigate } from 'react-router-dom'
import type { ScreenRoute } from '../routes'
import AdminMembers from '../pages/admin/Members'
import AdminSellers from '../pages/admin/Sellers'
import AdminInfluencers from '../pages/admin/Influencers'
import AdminProducts from '../pages/admin/Products'
import AdminPayments from '../pages/admin/Payments'
import AdminReturns from '../pages/admin/Returns'

/** 관리자 · 회원·심사·상품·결제·반품 */
export const adminOpsScreens: ScreenRoute[] = [
  { path: '/admin', title: '관리자 홈 (회원으로 이동)', auth: 'ADMIN', group: '관리자', element: <Navigate to="/admin/members" replace /> },
  { path: '/admin/members', title: '회원', auth: 'ADMIN', group: '관리자', element: <AdminMembers /> },
  { path: '/admin/sellers', title: '판매자 심사', auth: 'ADMIN', group: '관리자', element: <AdminSellers /> },
  { path: '/admin/influencers', title: '인플루언서 심사', auth: 'ADMIN', group: '관리자', element: <AdminInfluencers /> },
  { path: '/admin/products', title: '상품과 카테고리', auth: 'ADMIN', group: '관리자', element: <AdminProducts /> },
  { path: '/admin/payments', title: '결제 조회', auth: 'ADMIN', group: '관리자', element: <AdminPayments /> },
  { path: '/admin/returns', title: '반품 심사', auth: 'ADMIN', group: '관리자', element: <AdminReturns /> },
]
