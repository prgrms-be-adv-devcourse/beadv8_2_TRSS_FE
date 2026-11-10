import type { ReactElement } from 'react'
import { buyerScreens } from './screens/buyer'
import { sellerScreens } from './screens/seller'
import { influencerScreens } from './screens/influencer'
import { adminScreens } from './screens/admin'
import { logisticsScreens } from './screens/logistics'

/**
 * auth: 들어가는 데 필요한 권한
 * - 없음: 누구나
 * - 'login': 로그인한 구매자·판매자·인플루언서 (관리자·물류 담당자는 제외)
 * - 'SELLER': 판매자 센터. 로그인한 회원 중 판매자 상태가 판매 중(APPROVED)인 사람만 (App.tsx의 RequireActiveSeller가 확인해요)
 * - 'ADMIN': 관리자만 (App.tsx의 RequireRole이 확인해요)
 * - 'LOGISTICS': 물류 담당자만
 *
 * demo: 경로에 :id 가 있는 화면의 /screens 바로가기 주소
 */
export type ScreenAuth = 'login' | 'SELLER' | 'ADMIN' | 'LOGISTICS'
export type ScreenGroup = '구매자' | '판매자' | '인플루언서' | '관리자' | '물류'
export type ScreenRoute = {
  path: string
  title: string
  group: ScreenGroup
  element: ReactElement
  auth?: ScreenAuth
  demo?: string
}

export const SCREEN_GROUPS: ScreenGroup[] = ['구매자', '판매자', '인플루언서', '관리자', '물류']

/** 디자인 캔버스의 화면 하나가 라우트 하나예요. 그룹별 목록은 src/screens/*.tsx */
export const screens: ScreenRoute[] = [
  ...buyerScreens,
  ...sellerScreens,
  ...influencerScreens,
  ...adminScreens,
  ...logisticsScreens,
]
