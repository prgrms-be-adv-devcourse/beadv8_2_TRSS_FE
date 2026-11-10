import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import LoginPage from '../pages/account/Login'
import SignupPage from '../pages/account/Signup'
import SignupInfoPage from '../pages/account/SignupInfo'
import KakaoCallbackPage from '../pages/account/KakaoCallback'
import MyPagePage from '../pages/account/MyPage'
import ProfilePage from '../pages/account/Profile'
import AddressesPage from '../pages/account/Addresses'
import MyReviewsPage from '../pages/account/MyReviews'
import WithdrawPage from '../pages/account/Withdraw'
import WalletPage from '../pages/account/Wallet'
import TopupPage from '../pages/account/Topup'
import TopupResultPage from '../pages/account/TopupResult'
import TopupHistoryPage from '../pages/account/TopupHistory'

/** 구매자 · 계정 (로그인·가입·마이·예치금) */
export const buyerAccountScreens: ScreenRoute[] = [
  { path: '/login', title: '로그인', group: '구매자', element: <LoginPage /> },
  { path: '/signup', title: '회원가입 · 이메일 인증', group: '구매자', element: <SignupPage /> },
  { path: '/signup/info', title: '회원가입 · 정보 입력', group: '구매자', element: <SignupInfoPage /> },
  { path: '/oauth/kakao/callback', title: '카카오 콜백', group: '구매자', element: <KakaoCallbackPage /> },
  // ?sellerStatus=APPROVED, ?influencerStatus=APPROVED 로 상태별 화면을 볼 수 있어요
  { path: '/mypage', title: '마이페이지', auth: 'login', group: '구매자', element: <WithQuery page={MyPagePage} /> },
  { path: '/mypage/profile', title: '내 정보', auth: 'login', group: '구매자', element: <WithQuery page={ProfilePage} /> },
  { path: '/mypage/addresses', title: '배송지 관리', auth: 'login', group: '구매자', element: <AddressesPage /> },
  { path: '/mypage/reviews', title: '내 리뷰', auth: 'login', group: '구매자', element: <MyReviewsPage /> },
  { path: '/mypage/withdraw', title: '회원 탈퇴', auth: 'login', group: '구매자', element: <WithdrawPage /> },
  { path: '/wallet', title: '예치금', auth: 'login', group: '구매자', element: <WalletPage /> },
  { path: '/wallet/topup', title: '예치금 충전', auth: 'login', group: '구매자', element: <TopupPage /> },
  { path: '/wallet/topup-result', title: '충전 결과', auth: 'login', group: '구매자', element: <TopupResultPage /> },
  { path: '/wallet/topups', title: '충전 내역 · 충전 취소', auth: 'login', group: '구매자', element: <TopupHistoryPage /> },
]
