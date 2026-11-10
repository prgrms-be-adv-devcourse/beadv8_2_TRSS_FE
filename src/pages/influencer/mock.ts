/**
 * 인플루언서 신청·상태·pick·프로필 목업
 *
 * TODO(API 미구현): POST /api/v1/influencers (신청), GET /api/v1/influencers/me (내 신청 상태)
 *   — 백엔드에 인플루언서 신청·심사 API가 아직 없어요. 생기면 이 파일의 함수만 실제 API로 바꾸면 돼요.
 * TODO(API 미구현): GET/POST /api/v1/influencer/picks, DELETE /api/v1/influencer/picks/{id} — 내 pick
 * TODO(API 미구현): GET /api/v1/influencers/{influencerId} (공개 프로필 + pick 목록) — 크리에이터 프로필
 *
 * 목업 동안은 신청 내용을 sessionStorage에 두고, 화면 확인용으로 ?influencerStatus=PENDING|APPROVED|REJECTED|REVOKED 를 받아요.
 * 실제로 협약 API(/api/v1/influencer/partnerships)가 열리면 승인된 인플루언서로 봐요 (useInfluencerStatus).
 */
import { useEffect, useState } from 'react'
import { getInfluencerPartnerships } from '../../lib/api/partnership'

export type InfluencerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'
/** 신청한 적 없으면 '신청 전' */
export type InfluencerView = '신청 전' | InfluencerStatus

export type InfluencerApplication = {
  status: InfluencerStatus
  activityName: string
  snsUrl: string
  intro: string
  appliedAt: string
  /** 승인·반려·해제일 */
  decidedAt: string | null
  /** 반려·해제 사유 */
  reason: string | null
}

export type InfluencerApplyRequest = Pick<InfluencerApplication, 'activityName' | 'snsUrl' | 'intro'>

const KEY = 'palette:mockInfluencer'
const wait = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 250))

function read(): InfluencerApplication | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as InfluencerApplication) : null
  } catch {
    return null
  }
}

/** 화면 확인용 예시 (?influencerStatus=…) */
export function sampleApplication(status: InfluencerStatus): InfluencerApplication {
  const now = new Date().toISOString()
  return {
    status,
    activityName: '데일리 뷰티 민지',
    snsUrl: 'https://instagram.com/daily.beauty',
    intro: '지성·트러블 피부를 위한 스킨케어 루틴을 주로 올려요.',
    appliedAt: now,
    decidedAt: status === 'PENDING' ? null : now,
    reason:
      status === 'REJECTED'
        ? 'SNS 계정에서 본인 확인이 어려워요. 프로필에 팔레트 활동명을 적어 주세요.'
        : status === 'REVOKED'
          ? '협약 쿠폰을 약관과 다르게 배포했어요.'
          : null,
  }
}

// TODO(API 미구현): GET /api/v1/influencers/me — 신청한 적 없으면 404
export const getMyInfluencer = () => wait(read())

// TODO(API 미구현): POST /api/v1/influencers — { activityName, snsUrl, intro }
export function applyInfluencer(body: InfluencerApplyRequest) {
  const app: InfluencerApplication = {
    ...body,
    status: 'PENDING',
    appliedAt: new Date().toISOString(),
    decidedAt: null,
    reason: null,
  }
  try {
    sessionStorage.setItem(KEY, JSON.stringify(app))
  } catch {
    /* 목업이라 저장 실패는 무시 */
  }
  return wait(app)
}

export const isInfluencerStatus = (v?: string | null): v is InfluencerStatus =>
  v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED' || v === 'REVOKED'

/**
 * 내 인플루언서 상태.
 * 1) ?influencerStatus 화면 확인용 값 2) 협약 API가 열리면 APPROVED 3) 목업 신청 내용 4) 신청 전
 */
export function useInfluencerStatus(override?: string | null) {
  const [app, setApp] = useState<InfluencerApplication | null | undefined>(
    isInfluencerStatus(override) ? sampleApplication(override) : undefined,
  )
  useEffect(() => {
    if (isInfluencerStatus(override)) {
      setApp(sampleApplication(override))
      return
    }
    let alive = true
    getInfluencerPartnerships({ size: 1 })
      .then(() => alive && setApp({ ...(read() ?? sampleApplication('APPROVED')), status: 'APPROVED' }))
      .catch(() => getMyInfluencer().then((a) => alive && setApp(a)))
    return () => {
      alive = false
    }
  }, [override])
  const view: InfluencerView | undefined = app === undefined ? undefined : (app?.status ?? '신청 전')
  return { app, view }
}

export const INFLUENCER_META: Record<
  InfluencerView,
  { tag: string; tone: 'neutral' | 'amber' | 'green' | 'red'; text: string; act?: string; to: string }
> = {
  '신청 전': {
    tag: '신청 전',
    tone: 'neutral',
    text: '활동명과 SNS 계정을 내면 관리자가 확인한 뒤 승인해요. 판매자와 함께 할 수 있어요.',
    act: '인플루언서 신청하기',
    to: '/influencer/apply',
  },
  PENDING: { tag: '심사 중', tone: 'amber', text: '관리자가 SNS 계정을 확인하고 있어요.', to: '/influencer/status' },
  APPROVED: {
    tag: '승인됨',
    tone: 'green',
    text: 'pick한 상품과 판매자 협약·쿠폰을 관리할 수 있어요.',
    act: '내 pick 보기',
    to: '/influencer/picks',
  },
  REJECTED: {
    tag: '반려됨',
    tone: 'red',
    text: '반려 사유를 확인하고 다시 신청할 수 있어요.',
    act: '반려 사유 보기',
    to: '/influencer/status',
  },
  REVOKED: { tag: '자격 해제', tone: 'neutral', text: '자격이 해제된 계정은 다시 신청할 수 없어요.', to: '/influencer/status' },
}

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
