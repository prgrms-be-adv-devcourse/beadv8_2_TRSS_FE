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
