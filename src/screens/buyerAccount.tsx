import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import WalletPage from '../pages/Wallet'
import TopupResultPage from '../pages/TopupResult'
import LoginPage from '../pages/Login'
import SignupPage from '../pages/Signup'
import KakaoCallbackPage from '../pages/KakaoCallback'
import MyPagePage from '../pages/MyPage'

/** 구매자 · 계정 (로그인·가입·마이·예치금) */
export const buyerAccountScreens: ScreenRoute[] = [
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
