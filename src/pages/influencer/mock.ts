/**
 * 인플루언서 pick·공개 프로필 목업
 * (신청·신청 상태는 실제 API: lib/api/influencer.ts, 상태 훅은 ./influencerStatus.ts)
 *
 * TODO(API 미구현): GET/POST /api/v1/influencer/picks, DELETE /api/v1/influencer/picks/{id} — 내 pick
 * TODO(API 미구현): GET /api/v1/influencers/{influencerId} (공개 프로필 + pick 목록) — 크리에이터 프로필
 */

// ── pick ──
export type PickItem = {
  pickId: number
  productId: number
  name: string
  price: number
  thumbnailUrl: string | null
  /** 진행 중인 상품 쿠폰이 있으면 해제할 수 없어요 */
  hasActiveCoupon: boolean
}

// TODO(API 미구현): GET /api/v1/influencer/picks
export const MOCK_PICKS: PickItem[] = [
  { pickId: 1, productId: 1, name: '라이트 윈드브레이커', price: 48000, thumbnailUrl: '/images/windbreaker.jpg', hasActiveCoupon: false },
  { pickId: 2, productId: 2, name: '비타민 브라이트닝 세럼', price: 32000, thumbnailUrl: '/images/serum.jpg', hasActiveCoupon: true },
  { pickId: 3, productId: 3, name: '시카 리페어 크림 50ml', price: 27000, thumbnailUrl: '/images/cica-cream.jpg', hasActiveCoupon: false },
  { pickId: 4, productId: 4, name: '저자극 데일리 선크림', price: 21000, thumbnailUrl: '/images/sunscreen.jpg', hasActiveCoupon: false },
]

// ── 공개 프로필 ──
export type CreatorProfile = {
  influencerId: number
  activityName: string
  intro: string
  tags: string[]
  /** AI가 본 나와 비슷한 점 */
  matches: string[]
  picks: {
    productId: number
    brand: string
    name: string
    price: number
    thumbnailUrl: string | null
    badge?: string
    avoid?: boolean
    coupon?: string
  }[]
}

// TODO(API 미구현): GET /api/v1/influencers/{influencerId} — 공개 프로필·pick, AI 비슷한 점은 AI 추천 API
export const MOCK_PROFILE: CreatorProfile = {
  influencerId: 1,
  activityName: '데일리 뷰티 민지',
  intro: '지성·트러블 피부를 위한 스킨케어 루틴을 주로 올려요.',
  tags: ['지성', '트러블', '모공', '시카 선호'],
  matches: ['같은 지성 피부예요', '트러블 · 모공 고민이 같아요', 'pick 4개 중 3개가 내 선호 성분을 담고 있어요'],
  picks: [
    { productId: 3, brand: 'MOODLAB', name: '시카 리페어 크림 50ml', price: 27000, thumbnailUrl: '/images/cica-cream.jpg', badge: '내 피부 맞춤', coupon: '크리에이터 쿠폰 10%' },
    { productId: 4, brand: 'HARUDAM', name: '저자극 데일리 선크림', price: 21000, thumbnailUrl: '/images/sunscreen.jpg', badge: '내 피부 맞춤' },
    { productId: 5, brand: 'MOODLAB', name: '글로우 커버 쿠션', price: 24000, thumbnailUrl: '/images/cushion.jpg' },
    { productId: 2, brand: 'ONGYEOL', name: '비타민 브라이트닝 세럼', price: 32000, thumbnailUrl: '/images/serum.jpg', badge: '향료 포함', avoid: true },
  ],
}
