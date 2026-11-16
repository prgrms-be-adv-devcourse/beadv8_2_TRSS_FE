/**
 * 백엔드에 아직 없는 API 자리를 채우는 목업 데이터예요.
 * 뷰티 설문·맞춤 추천·크리에이터 추천은 lib/api/ai.ts의 실제 API를 써요.
 */

// TODO(API 미구현): AI 피부 맞춤 분석(상품 상세) — 상세 맞춤도 화면(DetailMatch)만 쓰는 목업 프로필
export type MockBeautyProfile = {
  type: string[]
  concern: string[]
}
export const MOCK_PROFILE: MockBeautyProfile = {
  type: ['지성'],
  concern: ['트러블', '모공'],
}

/** 찜 기반 추천 이유 문구 (목업). 상품 순서대로 돌려 써요. */
// TODO(API 미구현): 찜 기반 추천 API가 없어 이유 문구도 목업이에요
export const MOCK_WHY = [
  '시카 포함 · 트러블 피부 추천',
  '무향료 · 지성 피부 산뜻한 마무리',
  '나이아신아마이드 포함 · 모공 고민',
  '[크리에이터 A]의 pick · 지성 피부',
]

/** 인기 급상승 검색어 (change: 지난 시간 대비 순위 변동, 'new'는 새로 진입) */
// TODO(API 미구현): GET /api/v1/search/trending 이 생기면 이 목업을 지워요
export type TrendingKeyword = { word: string; change: number | 'new' }
export const MOCK_TRENDING: TrendingKeyword[] = [
  { word: '선크림', change: 2 },
  { word: '시카 크림', change: 'new' },
  { word: '쿠션', change: 0 },
  { word: '나이아신아마이드 세럼', change: 3 },
  { word: '립틴트', change: -1 },
  { word: '클렌징폼', change: 1 },
  { word: '윈드브레이커', change: 'new' },
  { word: '와이드 팬츠', change: -2 },
  { word: '마스크팩', change: 0 },
  { word: '오버핏 티셔츠', change: -1 },
]

/**
 * 인기 검색어 (검색어만, 순위대로). 검색 패널·홈 검색창 안내·상품 목록·검색 결과 없음에서 같이 써요.
 * TODO(API 미구현): GET /api/v1/search/trending — 지금은 목업
 */
export const POPULAR_KEYWORDS = MOCK_TRENDING.map((t) => t.word)
