/**
 * 판매자 센터 목업 데이터 (백엔드 API가 없는 부분만)
 *
 * TODO(API 미구현): 판매자가 협약을 요청할 승인된 인플루언서 목록 (예: GET /api/v1/seller/influencers?keyword=)
 *   지금은 아래 목록과 내 협약 상대(협약 목록 응답)만 고를 수 있어요. 목업 ID로 요청하면 백엔드가 404를 줄 수 있어요.
 */
export const MOCK_INFLUENCERS: Array<{ influencerId: number; activityName: string }> = [
  { influencerId: 9001, activityName: '데일리뷰티 민지' },
  { influencerId: 9002, activityName: '스타일노트 하루' },
  { influencerId: 9003, activityName: '피부일기 소은' },
]
