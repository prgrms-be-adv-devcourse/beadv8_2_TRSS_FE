/**
 * 백엔드 공통 응답 타입
 * 백엔드: com.backend.global.page.PageResponse
 */

/** 목록 조회 응답. RsData.data에 담겨 와요. */
export type PageResponse<T> = {
  items: T[]
  /** 0부터 시작 */
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/**
 * 목록 조회 요청 파라미터 (Spring Pageable)
 * - page: 0부터 시작
 * - size: 기본 20, 최대 100
 * - sort: "필드,asc|desc" 형식. 예: "createdAt,desc"
 */
export type PageQuery = {
  page?: number
  size?: number
  sort?: string
}

/** 화면의 페이지 번호(1부터)를 백엔드 page(0부터)로 바꿔요. */
export const toPageParam = (uiPage: number) => Math.max(0, uiPage - 1)
