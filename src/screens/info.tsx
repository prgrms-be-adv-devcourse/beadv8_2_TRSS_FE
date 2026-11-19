import type { ScreenRoute } from '../routes'
import TermsPage from '../pages/info/Terms'
import PrivacyPage from '../pages/info/Privacy'
import FaqPage from '../pages/info/Faq'

/** 안내 (푸터 링크: 이용약관 · 개인정보처리방침 · 자주 묻는 질문) */
export const infoScreens: ScreenRoute[] = [
  { path: '/terms', title: '이용약관', group: '구매자', element: <TermsPage /> },
  { path: '/privacy', title: '개인정보처리방침', group: '구매자', element: <PrivacyPage /> },
  { path: '/faq', title: '자주 묻는 질문 (FAQ 검색)', group: '구매자', element: <FaqPage />, auth: 'login' },
]
