/**
 * 상품·카테고리 API (백엔드 담당: 유진)
 *
 * GET    /api/v1/products                       상품 검색 (PageResponse)
 * GET    /api/v1/products/{productId}           상품 상세
 * GET    /api/v1/categories                     카테고리 트리
 * GET    /api/v1/seller/products                판매자 상품 목록 (PageResponse)
 * GET    /api/v1/seller/products/counts         판매자 상품 탭별 개수
 * POST   /api/v1/seller/products                상품 등록 (multipart)
 * GET    /api/v1/seller/products/{productId}    수정 폼 조회
 * PATCH  /api/v1/seller/products/{productId}    상품 수정 (multipart)
 * POST   /api/v1/seller/products/{productId}/options/{optionId}/stock-adjustments  재고 조정
 * GET    /api/v1/admin/categories               관리자 카테고리 목록
 * POST   /api/v1/admin/categories               카테고리 추가
 * PATCH  /api/v1/admin/categories/{categoryId}  카테고리 수정
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

export type ProductSort = 'LATEST' | 'PRICE_ASC' | 'PRICE_DESC'

/** 상품 검색 결과 한 줄 */
export type ProductSummary = {
  productId: number
  name: string
  price: number
  categoryId: number
  sellerId: number
  /** 판매자 상호명 */
  businessName: string
  /** 이미지 기능 전까지 null */
  thumbnailUrl: string | null
  soldOut: boolean
  /** 재고 합계가 1~5개일 때만 그 수, 그 외(6개 이상·품절)에는 null */
  remainingStock: number | null
}

export type ProductSearchQuery = PageQuery & {
  /** 상품명 일부 (최대 100자) */
  keyword?: string
  /** 대분류 ID면 그 아래 소분류 전체, 소분류 ID면 그 소분류만 */
  categoryId?: number
  sort?: ProductSort
  /** 기본 true */
  excludeSoldOut?: boolean
}

/** size는 최대 50이에요. 넘기면 50으로 잘려요. */
export const searchProducts = (query: ProductSearchQuery = {}) =>
  api<PageResponse<ProductSummary>>('/api/v1/products', { query })

export type ProductOption = {
  optionId: number
  name: string
  soldOut: boolean
  /** 재고가 1~5개일 때만 남은 수량, 그 외에는 null */
  remainingStock: number | null
}

export type ProductDetail = {
  productId: number
  name: string
  description: string
  price: number
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
  options: ProductOption[]
}

/** 판매 중지·삭제·카테고리 사용 중지 상품은 404-PRODUCT_NOT_FOUND */
export const getProduct = (productId: number | string) => api<ProductDetail>(`/api/v1/products/${productId}`)

// ── 판매자 상품 ──────────────────────────────────────────

/** ON_SALE 판매 중(재고 있음) · SOLD_OUT 품절(재고 0) · STOPPED 판매 중지 */
export type ProductDisplayStatus = 'ON_SALE' | 'SOLD_OUT' | 'STOPPED'
/** ADMIN 관리자 즉시 중지 · SELLER_REQUEST 판매자 요청 승인 · SELLER_WITHDRAWN 판매자 철회·제재 */
export type ProductStoppedBy = 'ADMIN' | 'SELLER_REQUEST' | 'SELLER_WITHDRAWN'

export type SellerProductSummary = {
  productId: number
  /** 재고 조정에 쓰는 옵션 ID (지금은 상품마다 옵션 1개) */
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
}

export const getSellerProductForm = (productId: number | string) =>
  api<SellerProductForm>(`/api/v1/seller/products/${productId}`)

export type ProductCreateRequest = {
  name: string
  price: number
  /** 사용 중인 소분류 ID */
  categoryId: number
  description: string
  /** 초기 재고 (기본 옵션의 재고) */
  stock: number
}

/** 수정은 보낸 값만 바뀌고 재고는 바꿀 수 없어요. */
export type ProductModifyRequest = Partial<Omit<ProductCreateRequest, 'stock'>> & {
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

/** 재고 조정. changeQty는 늘리면 양수, 줄이면 음수 (0 불가) */
export const adjustStock = (productId: number, optionId: number, changeQty: number) =>
  api<{ optionId: number; stock: number }>(
    `/api/v1/seller/products/${productId}/options/${optionId}/stock-adjustments`,
    { method: 'POST', body: { changeQty } },
  )
