/**
 * 관리자 화면 목업 데이터 (백엔드 API가 아직 없는 부분)
 * API가 생기면 이 파일의 해당 상수를 지우고 화면에서 API를 불러요.
 */
// TODO(API 미구현): 관리자 리뷰 목록 API — GET /api/v1/admin/reviews ?keyword (상품명·작성자)
export type AdminReview = {
  reviewId: number
  productName: string
  writer: string
  rating: number
  content: string
  createdAt: string
}
export const MOCK_REVIEWS: AdminReview[] = [
  {
    reviewId: 1,
    productName: '라이트 윈드브레이커',
    writer: '김*진',
    rating: 5,
    content: '한 치수 크게 샀는데 오버핏으로 딱 좋아요.',
    createdAt: '2026-11-08T10:12:00',
  },
  {
    reviewId: 2,
    productName: '글로우 커버 쿠션',
    writer: '박*영',
    rating: 1,
    content: '[외부 쇼핑몰 링크와 광고 문구]',
    createdAt: '2026-11-07T21:03:00',
  },
  {
    reviewId: 3,
    productName: '시카 리페어 크림 50ml',
    writer: '이*수',
    rating: 2,
    content: '[욕설이 포함된 내용]',
    createdAt: '2026-10-30T09:40:00',
  },
  {
    reviewId: 4,
    productName: '비타민 브라이트닝 세럼',
    writer: '최*아',
    rating: 4,
    content: '산뜻하게 흡수돼요. 아침에 쓰기 좋아요.',
    createdAt: '2026-10-28T13:22:00',
  },
]
