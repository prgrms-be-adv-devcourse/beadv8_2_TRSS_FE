/**
 * 관리자 챗봇 FAQ (ai-service, TRSS-254)
 *
 * - 챗봇은 노출 중인 FAQ만 근거로 답한다. 삭제는 없고 내리려면 노출을 끈다.
 * - 등록·질문/답변 수정 뒤 임베딩이 끝날 때까지 embedded=false(보통 수 초, OpenAI 장애 중이면 복구될 때까지).
 */
import { api } from './client'

// ── 코드표 (백엔드 FaqCategory와 같은 순서) ──────────────

export const FAQ_CATEGORIES = ['MEMBER', 'TOPUP', 'ORDER', 'DELIVERY', 'RETURN', 'SELLER'] as const
export type FaqCategory = (typeof FAQ_CATEGORIES)[number]
export const FAQ_CATEGORY_LABEL: Record<FaqCategory, string> = {
  MEMBER: '회원',
  TOPUP: '충전',
  ORDER: '주문·결제',
  DELIVERY: '배송',
  RETURN: '반품·환불',
  SELLER: '판매·정산',
}

/** 질문 200자, 답변 2000자까지 */
export const FAQ_QUESTION_MAX = 200
export const FAQ_ANSWER_MAX = 2000

export type AdminFaq = {
  faqId: number
  category: FaqCategory
  /** 화면 표시용 카테고리 이름 (예: 반품·환불) */
  categoryLabel: string
  question: string
  answer: string
  /** false면 챗봇 검색에서 빠짐 */
  visible: boolean
  /** 검색 반영 여부. false면 반영 전 */
  embedded: boolean
  createdAt: string
  updatedAt: string
}

export type FaqContent = {
  category: FaqCategory
  question: string
  answer: string
}

/** FAQ 목록. 숨긴 FAQ까지 최근 등록 순으로 전부 (페이지 없음) */
export const getAdminFaqs = (category?: FaqCategory) => api<AdminFaq[]>('/api/v1/admin/faqs', { query: { category } })

/** FAQ 등록. 수 초 안에 챗봇 검색에 반영된다 */
export const createFaq = (body: FaqContent & { visible: boolean }) =>
  api<{ faqId: number }>('/api/v1/admin/faqs', { method: 'POST', body })

/** FAQ 수정 (카테고리·질문·답변 모두 보냄). 404-FAQ_NOT_FOUND */
export const modifyFaq = (faqId: number, body: FaqContent) =>
  api<AdminFaq>(`/api/v1/admin/faqs/${faqId}`, { method: 'PUT', body })

/** 노출 변경. 끄면 챗봇 검색에서 빠지고, 다시 켜면 바로 검색된다. 404-FAQ_NOT_FOUND */
export const changeFaqVisibility = (faqId: number, visible: boolean) =>
  api<AdminFaq>(`/api/v1/admin/faqs/${faqId}/visibility`, { method: 'PATCH', body: { visible } })
