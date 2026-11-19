/**
 * 기획전 설정 (TRSS-343)
 *
 * 백엔드에 기획전 데이터가 없어서 프론트에서 큐레이션해요. 기획전 하나 = 상품 검색 조건 하나예요.
 * - 상품은 GET /api/v1/products 검색 결과를 그대로 써요. 결과가 0개거나 요청이 실패한 기획전은 화면에서 숨겨요.
 * - bannerUrl이 없으면 그 기획전 상품 썸네일을 겹친 콜라주로 배너를 자동으로 만들어요.
 * - 카테고리 ID는 GET /api/v1/categories 기준이에요 (1 뷰티 · 7 스킨케어 · 10 의류 · 12 아우터 …).
 *   카테고리가 바뀌면 여기 숫자도 같이 고쳐 주세요.
 */
import type { ProductSearchQuery } from '../../lib/api/product'

export type Exhibition = {
  /** 주소에 쓰는 slug (/exhibitions/:id) */
  id: string
  title: string
  subtitle: string
  /** 기간 표시 문구 (예: "12.1 – 12.31", "상시") */
  period: string
  /** 배너 배경색 */
  bg: string
  /** 배너 글자·강조색 (배경 위에서 대비 4.5:1 이상) */
  accent: string
  /** 배너 이미지. 없으면 상품 썸네일 콜라주 */
  bannerUrl?: string
  /** 상품 검색 조건 (page·size는 화면이 정해요) */
  query: Omit<ProductSearchQuery, 'page' | 'size'>
}

export const EXHIBITIONS: Exhibition[] = [
  {
    id: 'winter-moisture',
    title: '겨울 보습 기획전',
    subtitle: '건조한 계절, 촉촉하게 채워 줄 크림 모음',
    period: '12.1 – 2.28',
    bg: '#e9edf5',
    accent: '#1f2a44',
    query: { keyword: '크림', categoryId: 1, sort: 'POPULAR' },
  },
  {
    id: 'winter-outer',
    title: '따뜻한 겨울 아우터',
    subtitle: '패딩부터 트위드 자켓까지, 한 벌로 끝내는 겨울',
    period: '11.20 – 1.31',
    bg: '#f1ebe3',
    accent: '#5a3d1e',
    query: { categoryId: 12, sort: 'POPULAR' },
  },
  {
    id: 'sale-pick',
    title: '지금만 이 가격, 특가 모음',
    subtitle: '할인 중인 상품을 할인율 높은 순으로 모았어요',
    period: '기간 한정',
    bg: '#fdecec',
    accent: '#b3261e',
    query: { discounted: true, sort: 'DISCOUNT_RATE' },
  },
  {
    id: 'best-reviewed',
    title: '리뷰로 검증된 베스트',
    subtitle: '찜·별점·판매량이 고르게 높은 인기 상품',
    period: '상시',
    bg: '#e8f5ee',
    accent: '#1f6e44',
    query: { sort: 'POPULAR' },
  },
]

export const findExhibition = (id: string | undefined) => EXHIBITIONS.find((e) => e.id === id)
