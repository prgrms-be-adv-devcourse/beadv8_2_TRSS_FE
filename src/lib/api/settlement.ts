/**
 * 정산 API (백엔드 담당: 다은)
 *
 * [관리자]
 * POST /api/v1/admin/settlements/runs                   월 정산 수동 실행 { settleMonth }
 * GET  /api/v1/admin/settlements/runs                   실행 결과 (PageResponse, 최신순)
 * GET  /api/v1/admin/settlements                        정산서 목록 ?month&status&sellerId (PageResponse)
 * GET  /api/v1/admin/settlements/{id}                   정산서 상세 (묶인 후보 포함)
 * GET  /api/v1/admin/settlements/{id}/histories         처리 이력
 * POST /api/v1/admin/settlements/{id}/retry             수동 재처리 { reason } (MANUAL_REQUIRED만)
 * POST /api/v1/admin/settlements/{id}/hold | release    보류 { reason } / 해제
 * GET  /api/v1/admin/settlements/preview?month=         미리보기 (판매자별 PageResponse 포함)
 * GET  /api/v1/admin/settlement-candidates              후보 목록
 * POST /api/v1/admin/settlement-candidates/{id}/exclude 후보 제외 { reason }
 * [판매자]
 * GET  /api/v1/seller/settlements ?month&status         내 정산서 목록 (PageResponse)
 * GET  /api/v1/seller/settlements/expected              정산 예정 금액
 * GET  /api/v1/seller/settlements/{id}                  내 정산서 상세 (품목별)
 */
import { api, type PageQuery, type PageResponse } from '.'

/** 'yyyy-MM' 형식. 예: '2026-09' */
export type YearMonth = string

export type SettlementStatus = 'READY' | 'PAID' | 'FAILED' | 'MANUAL_REQUIRED' | 'HOLD'
/** 판매자에게 보이는 상태. 실패 사유·시도 횟수는 숨김 */
export type SettlementSellerStatus = 'SCHEDULED' | 'PAID' | 'DELAYED' | 'ON_HOLD'

/** BE SettlementResponse (관리자 목록 1행) */
export type Settlement = {
  settlementId: number
  sellerId: number
  /** 판매자 상호명. 회원 쪽에 판매자가 없으면 null (BE에 businessName 추가 후) */
  businessName: string | null
  settlementMonth: YearMonth
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
  itemCount: number
  status: SettlementStatus
  retryCount: number
  nextRetryAt: string | null
  lastFailReason: string | null
  holdReason: string | null
  paidAt: string | null
  createdAt: string
}

export type SettlementCandidate = {
  candidateId: number
  sellerId: number
  settlementId: number | null
  orderId: number
  orderItemId: number
  salePrice: number
  feeRate: number
  fee: number
  payoutAmount: number
  confirmedAt: string
  settlementMonth: YearMonth
  status: 'READY' | 'INCLUDED' | 'EXCLUDED'
  excludedReason: string | null
}
export type SettlementDetail = { settlement: Settlement; candidates: SettlementCandidate[] }

/** BE SettlementRunResponse */
export type SettlementRun = {
  jobExecutionId: number
  targetMonth: YearMonth
  status: string // COMPLETED, FAILED, STARTED …
  exitCode: string
  startTime: string | null
  endTime: string | null
  aggregatedSellerCount: number
  aggregatedCandidateCount: number
  failedSellerCount: number
  paidCount: number
  failedCount: number
  manualRequiredCount: number
  skippedCount: number
  payoutTotal: number
  feeTotal: number
}

export type SettlementPreviewSeller = {
  sellerId: number
  businessName: string | null
  sellerStatus: string | null
  willHold: boolean
  existingSettlementId: number | null
  existingSettlementStatus: SettlementStatus | null
  carriedToNextMonth: boolean
  itemCount: number
  carriedOverCount: number
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
}
export type SettlementPreview = {
  targetMonth: YearMonth
  sellerCount: number
  itemCount: number
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
  sellers: PageResponse<SettlementPreviewSeller>
}

/** BE SettlementPayoutResult. processed=false면 지급 가능한 상태가 아니라 건너뜀 */
export type SettlementPayoutResult = {
  settlementId: number
  processed: boolean
  status: SettlementStatus
  attemptNo: number
  payoutAmount: number
  totalFee: number
  retryCount: number
  lastFailReason: string | null
  nextRetryAt: string | null
  paidAt: string | null
}

export type SellerSettlement = {
  settlementId: number
  settlementMonth: YearMonth
  status: SettlementSellerStatus
  statusLabel: string // 지급 예정·지급 완료·지급 지연·지급 보류
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
  itemCount: number
  paidAt: string | null
}
export type SellerSettlementItem = {
  orderId: number
  orderItemId: number
  salePrice: number
  feeRate: number
  fee: number
  payoutAmount: number
  confirmedAt: string
  settlementMonth: YearMonth
  carriedOver: boolean // 지난달에서 이월된 품목
}
export type SellerSettlementDetail = { settlement: SellerSettlement; items: SellerSettlementItem[] }
export type SettlementExpectedMonth = {
  settlementMonth: YearMonth
  itemCount: number
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
  expectedPayDate: string // 'yyyy-MM-dd'
}
export type SettlementExpected = {
  itemCount: number
  totalSalePrice: number
  totalFee: number
  payoutAmount: number
  months: SettlementExpectedMonth[] // 오래된 달부터
}

// ── 관리자 ──
export const runSettlement = (settleMonth: YearMonth) =>
  api<SettlementRun>('/api/v1/admin/settlements/runs', { method: 'POST', body: { settleMonth } })
export const getSettlementRuns = (query: PageQuery = {}) =>
  api<PageResponse<SettlementRun>>('/api/v1/admin/settlements/runs', { query })
export const getSettlements = (
  query: PageQuery & { month?: YearMonth; status?: SettlementStatus; sellerId?: number } = {},
) => api<PageResponse<Settlement>>('/api/v1/admin/settlements', { query })
export const getSettlement = (id: number) => api<SettlementDetail>(`/api/v1/admin/settlements/${id}`)
export const getSettlementPreview = (month: YearMonth, query: PageQuery = {}) =>
  api<SettlementPreview>('/api/v1/admin/settlements/preview', { query: { month, ...query } })
export const retrySettlement = (id: number, reason: string) =>
  api<SettlementPayoutResult>(`/api/v1/admin/settlements/${id}/retry`, { method: 'POST', body: { reason } })
export const holdSettlement = (id: number, reason: string) =>
  api<Settlement>(`/api/v1/admin/settlements/${id}/hold`, { method: 'POST', body: { reason } })
export const releaseSettlement = (id: number) =>
  api<Settlement>(`/api/v1/admin/settlements/${id}/release`, { method: 'POST' })

// ── 판매자 ──
export const getMySettlements = (query: PageQuery & { month?: YearMonth; status?: SettlementSellerStatus } = {}) =>
  api<PageResponse<SellerSettlement>>('/api/v1/seller/settlements', { query })
export const getMySettlement = (id: number) => api<SellerSettlementDetail>(`/api/v1/seller/settlements/${id}`)
export const getMyExpectedSettlement = () => api<SettlementExpected>('/api/v1/seller/settlements/expected')

// ── 표시 도우미 ──
/** '2026-09' → '2026년 9월' */
export const fmtMonth = (ym: YearMonth) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5, 7))}월`
