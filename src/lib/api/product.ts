/**
 * 상품·카테고리 API (백엔드 담당: 유진)
 *
 * GET    /api/v1/products                       상품 검색 (PageResponse)
 * GET    /api/v1/products/{productId}           상품 상세
 * GET    /api/v1/categories                     카테고리 트리
 * GET    /api/v1/seller/products                판매자 상품 목록 ({ products: PageResponse, counts })
 * POST   /api/v1/seller/products                상품 등록 (multipart)
 * GET    /api/v1/seller/products/{productId}    수정 폼 조회
 * PATCH  /api/v1/seller/products/{productId}    상품 수정 (multipart)
 * POST   /api/v1/seller/products/{productId}/options/{optionId}/stock-adjustments  재고 조정
 * GET    /api/v1/admin/categories               관리자 카테고리 목록
 * POST   /api/v1/admin/categories               카테고리 추가
 * PATCH  /api/v1/admin/categories/{categoryId}  카테고리 수정
 */

export {}
