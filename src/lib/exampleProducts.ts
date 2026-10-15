/**
 * 백엔드에 연결되지 않았을 때 메인 화면에 보여줄 프론트 전용 예시 데이터
 *
 * 백엔드 시드(ProductDataInit)와 일부러 다른 상품이에요. 화면에 이 상품(판매자 온결·무드랩·하루담·데일리핏)이 보이면
 * 서버 데이터가 아니라는 뜻이고, "팔레트 시드 상점" 상품이 보이면 서버에 제대로 연결된 거예요.
 */
import { ApiError, type PageResponse } from './api'
import type { CategoryNode, ProductSearchQuery, ProductSummary } from './api/product'

/** 서버에 닿지 못한 오류인지. 요청 자체가 실패했거나, 백엔드 형식("404-CODE")이 아닌 응답(프록시 오류 등)이면 true */
export function isServerUnreachable(e: unknown) {
  return e instanceof ApiError && (e.status === 0 || !e.resultCode.includes('-'))
}

/** 카테고리 구조는 백엔드와 같아요. (대분류 → 소분류) */
const CATEGORY_NAMES: Array<[string, string[]]> = [
  ['뷰티', ['메이크업', '바디케어', '선케어', '마스크팩', '클렌징', '스킨케어', '헤어케어', '건강식품']],
  ['의류', ['상의', '아우터', '바지', '원피스/스커트', '신발', '가방', '모자', '소품']],
]

let nextId = 1
export const EXAMPLE_CATEGORIES: CategoryNode[] = CATEGORY_NAMES.map(([name, children], i) => ({
  categoryId: nextId++,
  name,
  depth: 1,
  sortOrder: i,
  children: children.map((child, j) => ({ categoryId: nextId++, name: child, depth: 2, sortOrder: j, children: [] })),
}))

const categoryIdOf = (name: string) =>
  EXAMPLE_CATEGORIES.flatMap((g) => g.children).find((c) => c.name === name)!.categoryId

// [판매자, 상품명, 소분류, 가격, 재고]
const ROWS: Array<[string, string, string, number, number]> = [
  ['온결', '약산성 수분 진정 토너 300ml', '스킨케어', 18900, 24],
  ['무드랩', '시카 리페어 크림 50ml', '스킨케어', 27000, 3],
  ['데일리핏', '순한 아미노 클렌징폼 150ml', '클렌징', 12500, 40],
  ['온결', '비타민 브라이트닝 세럼 30ml', '스킨케어', 32000, 0],
  ['하루담', '저자극 데일리 선크림 SPF50+', '선케어', 21000, 5],
  ['무드랩', '세라마이드 장벽 크림 80ml', '스킨케어', 29500, 18],
  ['하루담', '진정 마스크팩 10매', '마스크팩', 15900, 12],
  ['하루담', '촉촉 커버 쿠션 21호', '메이크업', 26000, 9],
  ['데일리핏', '오버핏 코튼 반팔 티셔츠', '상의', 24000, 2],
  ['데일리핏', '라이트 윈드브레이커', '아우터', 59000, 14],
]

/** 최신순(ID 내림차순)으로 둬요. */
const EXAMPLE_PRODUCTS: Array<ProductSummary & { stock: number }> = ROWS.map(
  ([shop, name, category, price, stock], i) => ({
    productId: 900 + ROWS.length - i,
    name,
    price,
    categoryId: categoryIdOf(category),
    sellerId: 0,
    businessName: shop,
    thumbnailUrl: null,
    soldOut: stock === 0,
    remainingStock: stock > 0 && stock <= 5 ? stock : null,
    stock,
  }),
)

/** GET /api/v1/products 와 같은 규칙으로 예시 상품을 걸러요. */
export function searchExampleProducts({
  keyword,
  categoryId,
  sort = 'LATEST',
  excludeSoldOut = true,
  page = 0,
  size = 20,
}: ProductSearchQuery): PageResponse<ProductSummary> {
  const group = EXAMPLE_CATEGORIES.find((g) => g.categoryId === categoryId)
  const categoryIds = group ? group.children.map((c) => c.categoryId) : categoryId ? [categoryId] : null

  let items = EXAMPLE_PRODUCTS.filter(
    (p) =>
      (!categoryIds || categoryIds.includes(p.categoryId)) &&
      (!keyword || p.name.includes(keyword)) &&
      (!excludeSoldOut || !p.soldOut),
  )
  if (sort === 'PRICE_ASC') items = [...items].sort((a, b) => a.price - b.price)
  if (sort === 'PRICE_DESC') items = [...items].sort((a, b) => b.price - a.price)

  return {
    items: items.slice(page * size, (page + 1) * size).map(({ stock: _stock, ...p }) => p),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  }
}
