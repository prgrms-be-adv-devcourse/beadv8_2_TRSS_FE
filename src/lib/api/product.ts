/**
 * 상품·카테고리 API (백엔드 담당: 유진)
 *
 * GET    /api/v1/products                       상품 검색 (PageResponse)
 * GET    /api/v1/products/popular-keywords      인기 검색어 (순위·변동)
 * GET    /api/v1/products/{productId}           상품 상세
 * GET    /api/v1/products/{productId}/similar   비슷한 상품
 * GET    /api/v1/products/recommendations/me     회원 개인화 추천 (회원님을 위한 추천 · 기준 상품별 섹션)
 * GET    /api/v1/products/recommendations/recent 최근 본 상품 기반 추천
 * GET    /api/v1/categories                     카테고리 트리
 * GET    /api/v1/seller/products                판매자 상품 목록 (PageResponse)
 * GET    /api/v1/seller/products/counts         판매자 상품 탭별 개수
 * DELETE /api/v1/seller/products/{productId}    상품 삭제 (소프트 삭제)
 * POST   /api/v1/seller/products/{productId}/stop-requests  판매 중지 요청
 * GET    /api/v1/seller/products/{productId}/options/{optionId}/stock-history  재고 이력 (PageResponse)
 * POST   /api/v1/seller/products                상품 등록 (multipart)
 * GET    /api/v1/seller/products/{productId}    수정 폼 조회
 * PATCH  /api/v1/seller/products/{productId}    상품 수정 (multipart)
 * POST   /api/v1/seller/products/{productId}/options/{optionId}/stock-adjustments  재고 조정
 * POST   /api/v1/seller/products/{productId}/options                옵션 조합 추가
 * PATCH  /api/v1/seller/products/{productId}/options/{optionId}     옵션 추가금 수정
 * DELETE /api/v1/seller/products/{productId}/options/{optionId}     옵션 삭제
 * POST   /api/v1/seller/products/{productId}/discounts              기간 할인 등록
 * PATCH  /api/v1/seller/products/{productId}/discounts/{discountId} 할인 수정 (보낸 값만)
 * DELETE /api/v1/seller/products/{productId}/discounts/{discountId} 시작 전 할인 삭제
 * POST   /api/v1/seller/products/{productId}/discounts/{discountId}/end  진행 중인 할인 지금 종료
 * GET    /api/v1/admin/categories               관리자 카테고리 목록
 * POST   /api/v1/admin/categories               카테고리 추가
 * PATCH  /api/v1/admin/categories/{categoryId}  카테고리 수정
 * GET    /api/v1/admin/products              관리자 전체 상품 (PageResponse)
 * POST   /api/v1/admin/products/{productId}/stop        즉시 판매 중지
 * POST   /api/v1/admin/products/search-index/rebuild    검색 색인 전체 다시 만들기
 * GET    /api/v1/admin/product-stop-requests            판매 중지 요청 목록 (PageResponse)
 * POST   /api/v1/admin/product-stop-requests/{requestId}/approve | reject  요청 승인·반려
 *
 * 오류 코드는 노션 「상품 API · 오류 코드 정리 (프론트 전달용)」을 따라요. resultCode는 "404-PRODUCT_NOT_FOUND" 형식이에요.
 */
import { api, type PageQuery, type PageResponse } from '.'

// ── 카테고리 ─────────────────────────────────────────────

/** 구매자용 카테고리 트리 노드 (사용 중인 것만). depth 1 = 대분류, 2 = 소분류 */
export type CategoryNode = {
  categoryId: number
  name: string
  depth: number
  sortOrder: number
  children: CategoryNode[]
}

/** 관리자용 카테고리 트리 노드 (사용 중지 포함) */
export type AdminCategoryNode = Omit<CategoryNode, 'children'> & {
  active: boolean
  children: AdminCategoryNode[]
}

export type Category = { categoryId: number; name: string; sortOrder: number; active: boolean }

export const getCategories = () => api<CategoryNode[]>('/api/v1/categories')

export const getAdminCategories = () => api<AdminCategoryNode[]>('/api/v1/admin/categories')

/** 소분류 추가. 같은 대분류의 맨 뒤에 붙어요. */
export const createCategory = (body: { name: string; parentId: number }) =>
  api<{ categoryId: number }>('/api/v1/admin/categories', { method: 'POST', body })

/** 소분류 수정. 보낸 값만 바뀌어요. */
export const modifyCategory = (categoryId: number, body: { name?: string; active?: boolean }) =>
  api<Category>(`/api/v1/admin/categories/${categoryId}`, { method: 'PATCH', body })

// ── 구매자 상품 ──────────────────────────────────────────

/**
 * 상품 정렬. 안 보내면 서버가 검색어 유무로 정해요 (있으면 RELEVANCE, 없으면 LATEST).
 * - RELEVANCE 관련도순 · LATEST 최신순 · PRICE_ASC/PRICE_DESC 가격순(할인 중이면 할인가 기준)
 * - DISCOUNT_RATE 할인율 높은순(할인 없는 상품은 뒤)
 * - POPULAR 인기순(찜·별점·최근 30일 판매량) · WISH 찜 많은순 · SALES 최근 30일 판매량순
 *   (검색 서버가 꺼져 DB 검색이 되면 이 셋은 최신순과 같아요)
 */
export type ProductSort =
  'RELEVANCE' | 'LATEST' | 'PRICE_ASC' | 'PRICE_DESC' | 'DISCOUNT_RATE' | 'POPULAR' | 'WISH' | 'SALES'

/** 지금 진행 중인 할인. 할인이 없으면 salePrice·discountRate 둘 다 null이에요. */
export type DiscountFields = {
  /** 할인가(옵션 추가금 제외). 할인 중이 아니면 null */
  salePrice: number | null
  /** 정가 대비 할인율(%, 소수점 버림). 할인 중이 아니면 null */
  discountRate: number | null
}

/** 상품 검색 결과 한 줄 */
export type ProductSummary = DiscountFields & {
  productId: number
  name: string
  /** 정가 */
  price: number
  sellerId: number
  /** 판매자 상호명 */
  businessName: string
  /** 이미지 기능 전까지 null */
  thumbnailUrl: string | null
  soldOut: boolean
  /** 재고 합계가 1~5개일 때만 그 수, 그 외(6개 이상·품절)에는 null */
  remainingStock: number | null
  reviewCount: number
  /** 평균 별점 (리뷰가 없으면 0) */
  averageRating: number
}

export type ProductSearchQuery = PageQuery & {
  /** 상품명 일부 (최대 100자) */
  keyword?: string
  /** 대분류 ID면 그 아래 소분류 전체, 소분류 ID면 그 소분류만 */
  categoryId?: number
  sort?: ProductSort
  /** 기본 true */
  excludeSoldOut?: boolean
  /** true면 지금 할인 중인 상품만 (특가). 기본 false */
  discounted?: boolean
}

/** size는 최대 50이에요. 넘기면 50으로 잘려요. */
export const searchProducts = (query: ProductSearchQuery = {}) =>
  api<PageResponse<ProductSummary>>('/api/v1/products', { query })

/**
 * 인기 검색어 한 줄. 최근 7일 검색을 최근일수록 크게 쳐서(반감기 3시간) 매긴 순위예요. 서버가 1분 캐시해요.
 * 집계 저장소가 응답하지 않으면 빈 목록이에요.
 */
export type PopularKeyword = {
  /** 1부터 */
  rank: number
  /** 공백 정리·영문 소문자로 맞춘 검색어 */
  keyword: string
  /** 한 시간 전 순위와의 차이. 오르면 양수, 내리면 음수, 같으면 0, 새로 오른 검색어면 null */
  rankChange: number | null
}

export const getPopularKeywords = () => api<PopularKeyword[]>('/api/v1/products/popular-keywords')

export type ProductOption = {
  optionId: number
  /** 표시 이름 (예: "블랙 / M"). 옵션 없는 상품은 "기본" */
  name: string
  /** 옵션 값. 상품 optionNames 순서대로. 옵션 없는 상품이면 빈 목록 */
  values: string[]
  additionalPrice: number
  /** 지금 실제로 파는 단가 (할인가 또는 정가 + 추가금) */
  price: number
  /** 정가 + 추가금 */
  listPrice: number
  soldOut: boolean
  /** 재고가 1~5개일 때만 남은 수량, 그 외에는 null */
  remainingStock: number | null
}

export type ProductDetail = DiscountFields & {
  productId: number
  name: string
  description: string
  /** 정가 */
  price: number
  /** 진행 중인 할인의 마감 시각. 할인 중이 아니면 null */
  discountEndsAt: string | null
  parentCategoryId: number
  parentCategoryName: string
  categoryId: number
  categoryName: string
  sellerId: number
  businessName: string
  /** 이미지 기능 전까지 null */
  thumbnailUrl: string | null
  /** 이미지 기능 전까지 빈 목록 */
  imageUrls: string[]
  soldOut: boolean
  /** 옵션 이름 (예: ["색상", "사이즈"]). 옵션 없는 상품이면 빈 목록 */
  optionNames: string[]
  options: ProductOption[]
  /** 로그인한 회원이 찜했는지. 비로그인이면 false */
  wished: boolean
  /** 찜 수 (지금 값, wished 포함) */
  wishCount: number
  reviewCount: number
  /** 평균 별점 (소수 첫째 자리, 리뷰가 없으면 0) */
  averageRating: number
  /** 전성분 (판매자 입력 원문). 뷰티가 아니거나 아직 넣지 않았으면 null */
  ingredientsText: string | null
}

/** 판매 중지·삭제·카테고리 사용 중지 상품은 404-PRODUCT_NOT_FOUND */
export const getProduct = (productId: number | string) => api<ProductDetail>(`/api/v1/products/${productId}`)

/**
 * 비슷한 상품 (상세 하단). 같은 대분류에서 설명이 비슷하고, 같은 소분류·가까운 가격대·찜·별점·판매량이 높은 순이에요.
 * 기준 상품과 품절 상품은 빠져요. size는 1~20(기본 10). 기준 상품이 판매 중이 아니면 404예요.
 */
export const getSimilarProducts = (productId: number, size = 10) =>
  api<ProductSummary[]>(`/api/v1/products/${productId}/similar`, { query: { size } })

// ── 개인화 추천 ──────────────────────────────────────────

/** 추천 기준 상품의 출처 */
export type RecommendBasis =
  /** 별점 4점 이상을 준 상품 */
  | 'HIGH_RATING'
  /** 결제한 상품 */
  | 'PURCHASE'
  /** 찜한 상품 */
  | 'WISH'
  /** 장바구니에 담은 상품 */
  | 'CART'
  /** 최근 본 상품 */
  | 'RECENT_VIEW'

/** 추천 이유: "찜한 ○○와 비슷해요" */
export type RecommendationReason = { basis: RecommendBasis; productId: number; productName: string }

export type RecommendedProduct = {
  product: ProductSummary
  /** 기준 상품과 이어지지 않은 추천(인기순 등)이면 null */
  reason: RecommendationReason | null
}

/** 기준 상품별 섹션 ("○○을 찜하셨네요") */
export type RecommendationSection = {
  basis: RecommendBasis
  seedProductId: number
  seedProductName: string
  items: ProductSummary[]
}

export type MemberRecommendations = {
  /** 회원 행동으로 추천했는지. 비로그인이거나 이력이 없으면 false이고 forYou는 인기순, sections는 빈 목록 */
  personalized: boolean
  forYou: RecommendedProduct[]
  /** 같은 상품은 forYou나 앞 섹션에 한 번만 나와요 */
  sections: RecommendationSection[]
}

/**
 * 회원 개인화 추천. 구매·높게 평가한(별점 4점 이상)·찜·장바구니 상품과 비슷한 상품이에요.
 * 이미 산·찜한·담은 상품, 1~2점 준 상품, 품절 상품은 빠져요. size는 1~50(기본 20).
 */
export const getMemberRecommendations = (size = 20) =>
  api<MemberRecommendations>('/api/v1/products/recommendations/me', { query: { size } })

/**
 * 최근 본 상품과 비슷한 상품. 최근 본 상품 ID를 최근 순으로 보내요(앞의 20개만 써요). 로그인하지 않아도 돼요.
 * 보낸 상품과 품절 상품은 빠지고, 기준 상품이 없으면 빈 목록이에요. size는 1~50(기본 20).
 */
export const getRecentRecommendations = (recentViewIds: number[], size = 20) =>
  api<ProductSummary[]>('/api/v1/products/recommendations/recent', {
    query: { recentViewIds: recentViewIds.join(','), size },
  })

// ── 판매자 상품 ──────────────────────────────────────────

/** ON_SALE 판매 중(재고 있음) · SOLD_OUT 품절(재고 0) · STOPPED 판매 중지 */
export type ProductDisplayStatus = 'ON_SALE' | 'SOLD_OUT' | 'STOPPED'
/** ADMIN 관리자 즉시 중지 · SELLER_REQUEST 판매자 요청 승인 · SELLER_WITHDRAWN 판매자 철회·제재 */
export type ProductStoppedBy = 'ADMIN' | 'SELLER_REQUEST' | 'SELLER_WITHDRAWN'

export type SellerProductSummary = DiscountFields & {
  productId: number
  /** 첫 옵션 ID. 옵션이 여럿이면 수정 폼(getSellerProductForm)의 options를 써요. */
  optionId: number
  thumbnailUrl: string | null
  name: string
  categoryName: string
  price: number
  /** 삭제되지 않은 옵션의 재고 합계 */
  stock: number
  status: ProductDisplayStatus
  stoppedBy: ProductStoppedBy | null
  stoppedReason: string | null
  /** 판매자가 보낸 판매 중지 요청이 관리자 심사 중이면 true */
  stopRequestPending: boolean
  createdAt: string
}

export type SellerProductCounts = { all: number; onSale: number; soldOut: number; stopped: number }

export type SellerProductQuery = PageQuery & { status?: ProductDisplayStatus; keyword?: string }

export const getSellerProducts = (query: SellerProductQuery = {}) =>
  api<PageResponse<SellerProductSummary>>('/api/v1/seller/products', { query })

/** 탭별 개수. status와 관계없이 세고, keyword는 목록과 같이 적용해요. */
export const getSellerProductCounts = (keyword?: string) =>
  api<SellerProductCounts>('/api/v1/seller/products/counts', { query: { keyword } })

export type ProductImage = { imageId: number; url: string }

export type SellerProductForm = {
  productId: number
  name: string
  price: number
  description: string
  parentCategoryId: number
  categoryId: number
  /** 이미지 기능 전까지 null */
  thumbnail: ProductImage | null
  detailImages: ProductImage[]
  optionNames: string[]
  options: SellerOption[]
  /** 끝나지 않은 할인 (예정·진행 중) */
  discounts: SellerDiscount[]
  /** 전성분. 뷰티가 아니거나 아직 넣지 않았으면 null */
  ingredientsText: string | null
}

export type SellerOption = {
  optionId: number
  /** 표시 이름 (예: "블랙 / M") */
  name: string
  values: string[]
  additionalPrice: number
  /** 정가 + 추가금 */
  price: number
  stock: number
}

/** SCHEDULED 시작 전 · ACTIVE 진행 중 · ENDED 끝남 */
export type ProductDiscountStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED'

export type SellerDiscount = {
  discountId: number
  salePrice: number
  discountRate: number
  startsAt: string
  endsAt: string
  status: ProductDiscountStatus
}

export const getSellerProductForm = (productId: number | string) =>
  api<SellerProductForm>(`/api/v1/seller/products/${productId}`)

/** 옵션 조합 하나 */
export type ProductOptionRequest = {
  /** 옵션 이름 순서대로 값 하나씩 (각 14자). 옵션 없는 상품이면 [] */
  values: string[]
  /** 추가금 (0 이상, 기본 0) */
  additionalPrice?: number
  /** 처음 재고 (1 이상) */
  stock: number
}

export type ProductCreateRequest = {
  name: string
  price: number
  /** 사용 중인 소분류 ID */
  categoryId: number
  description: string
  /** 옵션 이름 최대 3개(각 20자). 옵션 없는 상품이면 빼거나 [] */
  optionNames?: string[]
  /** 옵션 조합 1~100개. 옵션 없는 상품은 [{ values: [], stock }] */
  options: ProductOptionRequest[]
  /** 전성분 (용기에 적힌 그대로, 최대 5000자). 뷰티 소분류면 필수(없으면 400-INGREDIENTS_REQUIRED), 그 외는 무시 */
  ingredientsText?: string | null
}

/** 수정은 보낸 값만 바뀌어요. 옵션·재고·할인은 각각의 API로 바꿔요. 할인 중에는 정가(price)를 바꿀 수 없어요.
 * ingredientsText를 안 보내면 그대로 두고, 뷰티가 아닌 카테고리로 옮기면 전성분은 지워져요. */
export type ProductModifyRequest = Partial<Omit<ProductCreateRequest, 'optionNames' | 'options'>> & {
  /** 남길 기존 상세 이미지 ID (원하는 순서대로) */
  detailImageIds?: number[]
}

export type ProductImageFiles = {
  /** 대표 이미지. 등록할 때는 필수 */
  thumbnail?: File | null
  /** 상세 이미지, 최대 10개 */
  detailImages?: File[]
}

/** 등록·수정 multipart 본문. request 파트는 Content-Type이 application/json이어야 백엔드가 읽어요. */
function productFormData(request: object, { thumbnail, detailImages = [] }: ProductImageFiles) {
  const form = new FormData()
  form.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
  if (thumbnail) form.append('thumbnail', thumbnail)
  detailImages.forEach((file) => form.append('detailImages', file))
  return form
}

export const createProduct = (request: ProductCreateRequest, images: ProductImageFiles) =>
  api<{ productId: number }>('/api/v1/seller/products', {
    method: 'POST',
    body: productFormData(request, images),
  })

export const modifyProduct = (
  productId: number | string,
  request: ProductModifyRequest,
  images: ProductImageFiles = {},
) => api<null>(`/api/v1/seller/products/${productId}`, { method: 'PATCH', body: productFormData(request, images) })

/** 상품 삭제(소프트 삭제). 판매 중(품절 포함)만 지울 수 있고, 판매 중지 상품은 409예요. */
export const deleteProduct = (productId: number) =>
  api<null>(`/api/v1/seller/products/${productId}`, { method: 'DELETE' })

/** PENDING 심사 중 · APPROVED 승인(상품 STOPPED) · REJECTED 반려 · CANCELED 심사 중 삭제·다른 이유로 중지되어 닫힘 */
export type ProductStopRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELED'

export type ProductStopRequest = {
  requestId: number
  productId: number
  status: ProductStopRequestStatus
  reason: string
  createdAt: string
}

/**
 * 판매 중지 요청 (사유 필수, 최대 300자). 관리자가 승인할 때까지 판매는 계속돼요.
 * 이미 심사 중인 요청이 있으면 409-STOP_REQUEST_PENDING
 */
export const requestProductStop = (productId: number, reason: string) =>
  api<ProductStopRequest>(`/api/v1/seller/products/${productId}/stop-requests`, {
    method: 'POST',
    body: { reason },
  })

/** 재고 조정. changeQty는 늘리면 양수, 줄이면 음수 (0 불가) */
export const adjustStock = (productId: number, optionId: number, changeQty: number) =>
  api<{ optionId: number; stock: number }>(
    `/api/v1/seller/products/${productId}/options/${optionId}/stock-adjustments`,
    { method: 'POST', body: { changeQty } },
  )

// ── 판매자 옵션 ──────────────────────────────────────────

/** 옵션 조합 추가. 같은 조합이 있으면 409 */
export const addProductOption = (productId: number | string, body: ProductOptionRequest) =>
  api<{ optionId: number }>(`/api/v1/seller/products/${productId}/options`, { method: 'POST', body })

/** 옵션 추가금 수정 */
export const modifyProductOption = (productId: number | string, optionId: number, additionalPrice: number) =>
  api<null>(`/api/v1/seller/products/${productId}/options/${optionId}`, { method: 'PATCH', body: { additionalPrice } })

/** 옵션 삭제. 마지막 남은 옵션은 지울 수 없어요. */
export const deleteProductOption = (productId: number | string, optionId: number) =>
  api<null>(`/api/v1/seller/products/${productId}/options/${optionId}`, { method: 'DELETE' })

// ── 판매자 할인 ──────────────────────────────────────────

/** 기간 할인 등록. 시각은 "2026-12-01T00:00:00" 형식(서버 시간대). 기간이 겹치는 할인이 있으면 409 */
export const createDiscount = (
  productId: number | string,
  body: { salePrice: number; startsAt: string; endsAt: string },
) => api<{ discountId: number }>(`/api/v1/seller/products/${productId}/discounts`, { method: 'POST', body })

/** 보낸 값만 바뀌어요. 진행 중인 할인은 마감(endsAt)만 바꿀 수 있어요. */
export const modifyDiscount = (
  productId: number | string,
  discountId: number,
  body: { salePrice?: number; startsAt?: string; endsAt?: string },
) => api<null>(`/api/v1/seller/products/${productId}/discounts/${discountId}`, { method: 'PATCH', body })

/** 시작 전 할인 삭제 */
export const deleteDiscount = (productId: number | string, discountId: number) =>
  api<null>(`/api/v1/seller/products/${productId}/discounts/${discountId}`, { method: 'DELETE' })

/** 진행 중인 할인을 지금 끝내요. */
export const endDiscount = (productId: number | string, discountId: number) =>
  api<null>(`/api/v1/seller/products/${productId}/discounts/${discountId}/end`, { method: 'POST' })

/** INIT 등록 · ADJUST 직접 조정 · ORDER_DEDUCT 주문 · ORDER_RESTORE 주문 취소(결제 전 취소·만료·판매 중지) · RETURN_RESTORE 반품 */
export type StockChangeType = 'INIT' | 'ADJUST' | 'ORDER_DEDUCT' | 'ORDER_RESTORE' | 'RETURN_RESTORE'

export type StockHistory = {
  historyId: number
  changeType: StockChangeType
  /** 증감량. 늘면 양수, 줄면 음수 */
  changeQty: number
  /** 변경 후 재고 */
  stockAfter: number
  /** 주문 때문에 바뀐 경우의 주문 ID. 그 외에는 null */
  orderId: number | null
  createdAt: string
}

/** 옵션 재고 이력 (최신순). 판매 중지 상품도 볼 수 있어요. */
export const getStockHistory = (productId: number, optionId: number, query: PageQuery = {}) =>
  api<PageResponse<StockHistory>>(`/api/v1/seller/products/${productId}/options/${optionId}/stock-history`, {
    query,
  })

// ── 관리자 상품 ──────────────────────────────────────────

/** 관리자 화면 상태. ON_SALE 판매중(재고 있음) · SOLD_OUT 품절(판매 중 재고 0) · STOPPED 판매 중지 · DELETED 삭제됨 */
/** 검색 색인을 DB 기준으로 다시 만들어요. */
export const rebuildSearchIndex = () =>
  api<{ indexedCount: number }>('/api/v1/admin/products/search-index/rebuild', { method: 'POST' })

export type AdminProductStatus = 'ON_SALE' | 'SOLD_OUT' | 'STOPPED' | 'DELETED'

export type AdminProductSummary = {
  productId: number
  /** 판매자 ID (seller.id). 상호명은 관리자 판매자 목록으로 맞춰요. */
  sellerId: number
  thumbnailUrl: string | null
  name: string
  categoryName: string
  price: number
  /** 삭제되지 않은 옵션의 재고 합계 */
  stock: number
  status: AdminProductStatus
  stoppedBy: ProductStoppedBy | null
  stoppedReason: string | null
  stoppedAt: string | null
  createdAt: string
}

export type AdminProductQuery = PageQuery & {
  sellerId?: number
  status?: AdminProductStatus
  /** 대분류 또는 소분류 ID (사용 중지 카테고리도 가능) */
  categoryId?: number
  /** 상품명 일부 (최대 100자) */
  keyword?: string
}

/** 삭제된 상품까지 최신 등록순으로 와요. */
export const getAdminProducts = (query: AdminProductQuery = {}) =>
  api<PageResponse<AdminProductSummary>>('/api/v1/admin/products', { query })

/**
 * 즉시 판매 중지 (사유 필수, 300자, 해제 없음). 결제 대기 주문은 취소되고 심사 중인 중지 요청은 닫혀요.
 * 이미 판매 중지·삭제된 상품은 409-PRODUCT_NOT_ON_SALE
 */
export const stopProductByAdmin = (productId: number, reason: string) =>
  api<null>(`/api/v1/admin/products/${productId}/stop`, { method: 'POST', body: { reason } })

export type AdminProductStopRequest = {
  requestId: number
  productId: number
  productName: string
  sellerId: number
  /** 판매자가 적은 중지 사유 */
  reason: string
  status: ProductStopRequestStatus
  /** 반려 사유. 반려가 아니면 null */
  rejectReason: string | null
  createdAt: string
  /** 처리된 시각. 심사 중이면 null */
  reviewedAt: string | null
}

/** 이 상태의 요청을 먼저 들어온 순으로 줘요. status를 안 보내면 PENDING(심사 중)이에요. */
export const getAdminStopRequests = (query: PageQuery & { status?: ProductStopRequestStatus } = {}) =>
  api<PageResponse<AdminProductStopRequest>>('/api/v1/admin/product-stop-requests', { query })

/** 승인하면 상품이 판매 중지(SELLER_REQUEST)되고 결제 대기 주문이 취소돼요. 이미 처리된 요청은 409-STOP_REQUEST_NOT_PENDING */
export const approveStopRequest = (requestId: number) =>
  api<AdminProductStopRequest>(`/api/v1/admin/product-stop-requests/${requestId}/approve`, { method: 'POST' })

/** 반려 (사유 필수, 300자). 상품은 그대로 판매 중이에요. */
export const rejectStopRequest = (requestId: number, reason: string) =>
  api<AdminProductStopRequest>(`/api/v1/admin/product-stop-requests/${requestId}/reject`, {
    method: 'POST',
    body: { reason },
  })
