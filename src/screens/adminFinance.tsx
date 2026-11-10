import type { ScreenRoute } from '../routes'
import AdminFailedPage from '../pages/AdminFailed'
import AdminSettlementsPage from '../pages/AdminSettlements'
import AdminRetryModalPage from '../pages/AdminRetryModal'

/** 관리자 · 정산·실패 거래·리뷰·쿠폰·AI */
export const adminFinanceScreens: ScreenRoute[] = [
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
