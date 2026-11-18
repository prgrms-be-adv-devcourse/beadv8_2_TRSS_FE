import type { ScreenRoute } from '../routes'
import WithQuery from './WithQuery'
import InfluencerApplyPage from '../pages/influencer/Apply'
import InfluencerStatusPage from '../pages/influencer/Status'
import InfluencerPartnersPage from '../pages/influencer/Partners'
import InfluencerProfilePage from '../pages/influencer/Profile'

/** 인플루언서 화면 (신청·상태·협약·쿠폰·크리에이터 프로필 모두 실제 API) */
export const influencerScreens: ScreenRoute[] = [
  {
    path: '/influencer/apply',
    title: '인플루언서 신청',
    auth: 'login',
    group: '인플루언서',
    element: <InfluencerApplyPage />,
  },
  {
    path: '/influencer/status',
    title: '인플루언서 신청 상태',
    auth: 'login',
    group: '인플루언서',
    // ?influencerStatus=PENDING|APPROVED|REJECTED 로 상태별 화면을 볼 수 있어요
    element: <WithQuery page={InfluencerStatusPage} />,
    demo: '/influencer/status?influencerStatus=REJECTED',
  },
  {
    path: '/influencer/partners',
    title: '협약 · 발행받은 쿠폰',
    auth: 'login',
    group: '인플루언서',
    element: <InfluencerPartnersPage />,
  },
  {
    path: '/influencer/profile',
    title: '크리에이터 프로필',
    auth: 'login',
    group: '인플루언서',
    element: <WithQuery page={InfluencerProfilePage} />,
  },
]
