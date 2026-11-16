/**
 * AI 뷰티 설문 · 맞춤 추천 (ai-service, TRSS-243)
 *
 * - 값은 모두 코드(SKIN_TYPES 등)로 주고받고, 화면 글자는 아래 *_LABEL로 바꿔요.
 * - 상품 추천은 비회원도 부를 수 있어요(설문이 없거나 비회원이면 personalized=false, 판매 중 뷰티 최신순).
 * - 설문 저장·조회와 크리에이터 추천은 로그인이 필요해요.
 */
import { api, ApiError } from './client'

// ── 코드표 (백엔드 enum과 같은 순서) ─────────────────────

export const SKIN_TYPES = ['DRY', 'NORMAL', 'OILY', 'COMBINATION', 'UNKNOWN'] as const
export type SkinType = (typeof SKIN_TYPES)[number]
export const SKIN_TYPE_LABEL: Record<SkinType, string> = {
  DRY: '건성',
  NORMAL: '중성',
  OILY: '지성',
  COMBINATION: '복합성',
  UNKNOWN: '잘 모르겠어요',
}

export const SKIN_CONCERNS = [
  'TROUBLE',
  'PORE',
  'DEAD_SKIN',
  'DRYNESS',
  'SENSITIVE_REDNESS',
  'DULLNESS',
  'WRINKLE_ELASTICITY',
  'PIGMENTATION',
  'SEBUM',
] as const
export type SkinConcern = (typeof SKIN_CONCERNS)[number]
export const SKIN_CONCERN_LABEL: Record<SkinConcern, string> = {
  TROUBLE: '트러블',
  PORE: '모공',
  DEAD_SKIN: '각질',
  DRYNESS: '건조함',
  SENSITIVE_REDNESS: '민감 · 홍조',
  DULLNESS: '칙칙함',
  WRINKLE_ELASTICITY: '주름 · 탄력',
  PIGMENTATION: '색소침착',
  SEBUM: '유분',
}
/** 피부 고민은 최대 3개 */
export const MAX_CONCERNS = 3

/** 선호 성분 칸에만 올 수 있는 성분 */
export const PREFERRED_INGREDIENTS = [
  'NIACINAMIDE',
  'CICA',
  'VITAMIN_C',
  'HYALURONIC_ACID',
  'CERAMIDE',
  'RETINOL',
  'PANTHENOL',
  'TEA_TREE',
  'PEPTIDE',
  'AHA_BHA',
] as const
/** 피하는 성분 칸에만 올 수 있는 성분 */
export const AVOIDED_INGREDIENTS = [
  'FRAGRANCE',
  'ALCOHOL',
  'PARABEN',
  'ESSENTIAL_OIL',
  'SILICONE',
  'MINERAL_OIL',
] as const
export type IngredientTag = (typeof PREFERRED_INGREDIENTS)[number] | (typeof AVOIDED_INGREDIENTS)[number]
export const INGREDIENT_LABEL: Record<IngredientTag, string> = {
  NIACINAMIDE: '나이아신아마이드',
  CICA: '시카(병풀)',
  VITAMIN_C: '비타민C',
  HYALURONIC_ACID: '히알루론산',
  CERAMIDE: '세라마이드',
  RETINOL: '레티놀',
  PANTHENOL: '판테놀',
  TEA_TREE: '티트리',
  PEPTIDE: '펩타이드',
  AHA_BHA: 'AHA · BHA',
  FRAGRANCE: '향료',
  ALCOHOL: '알코올(에탄올)',
  PARABEN: '파라벤',
  ESSENTIAL_OIL: '에센셜 오일',
  SILICONE: '실리콘',
  MINERAL_OIL: '미네랄 오일',
}

/** 라벨은 market 뷰티 소분류 이름과 같아요 */
export const BEAUTY_CATEGORIES = ['SKINCARE', 'SUNCARE', 'MAKEUP', 'CLEANSING', 'MASK_PACK'] as const
export type BeautyCategory = (typeof BEAUTY_CATEGORIES)[number]
export const BEAUTY_CATEGORY_LABEL: Record<BeautyCategory, string> = {
  SKINCARE: '스킨케어',
  SUNCARE: '선케어',
  MAKEUP: '메이크업',
  CLEANSING: '클렌징',
  MASK_PACK: '마스크팩',
}

// ── 설문 ────────────────────────────────────────────────

export type SurveySaveRequest = {
  skinType: SkinType
  /** 최대 3개 */
  concerns: SkinConcern[]
  /** PREFERRED_INGREDIENTS 안에서만 */
  preferredIngredients: IngredientTag[]
  /** AVOIDED_INGREDIENTS 안에서만. "없어요"는 빈 배열 */
  avoidedIngredients: IngredientTag[]
  interestCategories: BeautyCategory[]
}

/** 내 뷰티 프로필. 여러 개인 값은 코드표 순서예요 */
export type BeautyProfile = SurveySaveRequest & {
  /** 마지막 저장 시각 (LocalDateTime, 예: 2026-11-16T10:20:30) */
  updatedAt: string
}

/** 설문 저장(처음이면 만들고 있으면 덮어써요). 고르지 않은 칸은 빈 배열로 보내요 */
export const saveMySurvey = (request: SurveySaveRequest) =>
  api<BeautyProfile>('/api/v1/ai/survey/me', { method: 'PUT', body: request })

/** 내 뷰티 프로필. 설문을 아직 안 했으면(404-SURVEY_NOT_FOUND) null */
export const getMySurvey = () =>
  api<BeautyProfile>('/api/v1/ai/survey/me').catch((e) => {
    if (e instanceof ApiError && e.status === 404) return null
    throw e
  })

// ── 추천 ────────────────────────────────────────────────

export type ProductRecommendation = {
  productId: number
  name: string
  /** 정가 (할인·품절은 상품 상세에서 봐요) */
  price: number
  thumbnailUrl: string | null
  categoryName: string
  /** 추천 이유. personalized=false(최신순)면 null */
  reason: string | null
  /** 상품에 있는 내 선호 성분 (코드표 순서) */
  matchedIngredients: IngredientTag[]
}

export type ProductRecommendations = {
  /** 설문으로 고른 결과면 true. 설문이 없거나 비회원이면 false(판매 중 뷰티 상품 최신순) */
  personalized: boolean
  /** 추천 기준이 된 내 설문 (personalized=false면 null) */
  basis: { skinType: SkinType; concerns: SkinConcern[]; avoidedIngredients: IngredientTag[] } | null
  items: ProductRecommendation[]
}

/** 맞춤 상품 추천. size 1~50 (기본 10) */
export const getProductRecommendations = (size = 10) =>
  api<ProductRecommendations>('/api/v1/ai/recommendations', { query: { size } })

export type CreatorRecommendation = {
  influencerId: number
  memberId: number
  /** 인플루언서 활동명 */
  activityName: string
  skinType: SkinType
  concerns: SkinConcern[]
  /** 피부 타입이 같은지 */
  matchedSkinType: boolean
  matchedConcerns: SkinConcern[]
  matchedIngredients: IngredientTag[]
  /** 예: "지성·트러블·모공 일치·나이아신아마이드 선호" */
  reason: string
}

/**
 * 피부가 비슷한 크리에이터 추천 (겹치는 정도가 큰 순서). size 1~20 (기본 10). 로그인 필요.
 * 설문을 안 했으면(404-SURVEY_NOT_FOUND) null
 */
export const getCreatorRecommendations = (size = 10) =>
  api<{ items: CreatorRecommendation[] }>('/api/v1/ai/recommendations/creators', { query: { size } }).then(
    (r) => r.items,
    (e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    },
  )

// ── 화면 문구 ───────────────────────────────────────────

/** "지성 · 트러블 · 모공" (UNKNOWN 피부 타입은 빼고, 남는 게 없으면 "내 설문") */
export function basisText(basis: { skinType: SkinType; concerns: SkinConcern[] }) {
  const type = basis.skinType === 'UNKNOWN' ? [] : [SKIN_TYPE_LABEL[basis.skinType]]
  return [...type, ...basis.concerns.map((c) => SKIN_CONCERN_LABEL[c])].join(' · ') || '내 설문'
}

/** 2026-11-16T10:20:30 → 11.16 */
export function shortDate(iso: string) {
  const m = /^\d{4}-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[1]}.${m[2]}` : iso
}
