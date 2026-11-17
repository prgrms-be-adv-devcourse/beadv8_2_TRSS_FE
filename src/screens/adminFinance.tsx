import { Navigate } from 'react-router-dom'
import type { ScreenRoute } from '../routes'
import AdminSettlements from '../pages/admin-finance/AdminSettlements'
import AdminFailed from '../pages/admin-finance/AdminFailed'
import AdminReviews from '../pages/admin-finance/AdminReviews'
import AdminCoupons from '../pages/admin-finance/AdminCoupons'
import AdminFaqs from '../pages/admin-finance/AdminFaqs'

/** 관리자 · 정산·실패 거래·리뷰·쿠폰·AI (재처리·보류 모달과 정산서 상세는 월 정산 화면 안에서 열려요) */
export const adminFinanceScreens: ScreenRoute[] = [
  { path: '/admin/settlements', title: '월 정산', auth: 'ADMIN', group: '관리자', element: <AdminSettlements /> },
  { path: '/admin/failed', title: '실패 거래', auth: 'ADMIN', group: '관리자', element: <AdminFailed /> },
  { path: '/admin/reviews', title: '리뷰', auth: 'ADMIN', group: '관리자', element: <AdminReviews /> },
  { path: '/admin/coupons', title: '쿠폰 · 협약', auth: 'ADMIN', group: '관리자', element: <AdminCoupons /> },
  { path: '/admin/faqs', title: '챗봇 FAQ', auth: 'ADMIN', group: '관리자', element: <AdminFaqs /> },
  // 예전 AI 문서 주소는 챗봇 FAQ로 보냄
  {
    path: '/admin/docs',
    title: 'AI 문서 → 챗봇 FAQ',
    auth: 'ADMIN',
    group: '관리자',
    element: <Navigate to="/admin/faqs" replace />,
  },
]
