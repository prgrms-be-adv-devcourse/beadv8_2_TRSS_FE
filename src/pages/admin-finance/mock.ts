/**
 * 관리자 화면 목업 데이터 (백엔드 API가 아직 없는 부분)
 * API가 생기면 이 파일의 해당 상수를 지우고 화면에서 API를 불러요.
 */
import type { FailedRow } from './AdminFailed'

// TODO(API 미구현): 환불 실패 목록 · 배송 추적 실패 목록 — 실패 거래 화면 예시 행
export const MOCK_FAILED: FailedRow[] = [
  {
    key: 'mock-refund-1',
    kind: 'refund',
    type: '환불 실패',
    tone: 'red',
    at: '2026-11-08T18:44:00',
    who: 'buyer03@example.com',
    amount: 41000,
    cause: '환불 처리 오류',
    handle: '자동 재시도 대기',
    mock: true,
  },
  {
    key: 'mock-delivery-1',
    kind: 'delivery',
    type: '배송 추적 실패',
    tone: 'amber',
    at: '2026-11-07T06:00:00',
    who: '[판매자]',
    amount: null,
    cause: '송장 등록 후 15일',
    handle: '',
    mock: true,
  },
]

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

// TODO(API 미구현): AI 문서 API — 목록 · 업로드(PDF/Markdown/TXT) · 삭제 · 다시 올리기 (챗봇 RAG 참고 문서)
export type DocStatus = 'DONE' | 'PROCESSING' | 'FAILED'
export type AiDoc = {
  id: number
  name: string
  format: string
  uploadedAt: string
  chunks: number | null
  status: DocStatus
}
export const MOCK_DOCS: AiDoc[] = [
  { id: 1, name: '배송 정책.pdf', format: 'PDF', uploadedAt: '2026-11-08T10:00:00', chunks: 42, status: 'DONE' },
  {
    id: 2,
    name: '반품·구매 확정 안내.md',
    format: 'Markdown',
    uploadedAt: '2026-11-08T10:05:00',
    chunks: 18,
    status: 'DONE',
  },
  {
    id: 3,
    name: '쿠폰 사용 FAQ.pdf',
    format: 'PDF',
    uploadedAt: '2026-11-09T09:30:00',
    chunks: null,
    status: 'PROCESSING',
  },
  {
    id: 4,
    name: '충전·환불 FAQ.pdf',
    format: 'PDF',
    uploadedAt: '2026-11-02T15:10:00',
    chunks: null,
    status: 'FAILED',
  },
]
