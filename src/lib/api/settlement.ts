/**
 * 정산 API (백엔드 담당: 다은)
 *
 * [관리자]
 * POST /api/v1/admin/settlements/runs                   월 정산 수동 실행 { settleMonth }
 * GET  /api/v1/admin/settlements/runs                   실행 결과 (PageResponse, 최신순)
 * GET  /api/v1/admin/settlements                        정산서 목록 ?month&status&sellerId (PageResponse)
 * GET  /api/v1/admin/settlements/{id}                   정산서 상세 (묶인 후보 포함)
 * GET  /api/v1/admin/settlements/{id}/histories         처리 이력 (List, 처리 순서대로)
 * POST /api/v1/admin/settlements/{id}/retry             수동 재처리 { reason } (MANUAL_REQUIRED만)
 * POST /api/v1/admin/settlements/{id}/hold | release    보류 { reason } / 해제
 * GET  /api/v1/admin/settlements/preview?month=         미리보기 (판매자별 PageResponse 포함)
 * GET  /api/v1/admin/settlement-candidates              후보 목록 ?sellerId&month&status (PageResponse, 최신순)
 * POST /api/v1/admin/settlement-candidates/{id}/exclude 후보 제외 { reason }
 * POST /api/v1/admin/settlements/{id}/ledger-mismatch/confirm  원장 불일치 확인 { reason }
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

/** 정산 후보 상태 (BE SettlementCandidateStatus) */
export type SettlementCandidateStatus = SettlementCandidate['status']
export const SETTLEMENT_CANDIDATE_STATUS_LABEL: Record<SettlementCandidateStatus, string> = {
  READY: '정산 대기',
  INCLUDED: '정산서 포함',
  EXCLUDED: '제외',
}

/** 처리 단계 (BE SettlementHistoryStage) */
export type SettlementHistoryStage =
  | 'CANDIDATE_CREATE'
  | 'VERIFY' // 원장 재대조 (관리자 불일치 확인도 VERIFY·ADMIN으로 남음)
  | 'JUDGE'
  | 'AGGREGATE'
  | 'PAYOUT'
  | 'HOLD'
  | 'RELEASE'
  | 'EXCLUDE'
export const SETTLEMENT_HISTORY_STAGE_LABEL: Record<SettlementHistoryStage, string> = {
  CANDIDATE_CREATE: '후보 생성',
  VERIFY: '원장 재대조',
  JUDGE: '지급 판별',
  AGGREGATE: '정산서 확정',
  PAYOUT: '지급',
  HOLD: '보류',
  RELEASE: '보류 해제',
  EXCLUDE: '후보 제외',
}
/** 처리 결과 (BE SettlementHistoryResult) */
export type SettlementHistoryResult = 'SUCCEEDED' | 'FAILED' | 'MANUAL_REQUIRED' | 'SKIPPED'
export const SETTLEMENT_HISTORY_RESULT_LABEL: Record<SettlementHistoryResult, string> = {
  SUCCEEDED: '성공',
  FAILED: '실패',
  MANUAL_REQUIRED: '수동 처리 필요',
  SKIPPED: '건너뜀',
}
/** 처리를 시작한 경로 (BE SettlementTrigger) */
export type SettlementTrigger = 'EVENT' | 'MONTHLY_JOB' | 'RETRY_SCHEDULER' | 'ADMIN' | 'LEDGER_RECHECK'
export const SETTLEMENT_TRIGGER_LABEL: Record<SettlementTrigger, string> = {
  EVENT: '이벤트',
  MONTHLY_JOB: '월 정산',
  RETRY_SCHEDULER: '재시도',
  ADMIN: '관리자',
  LEDGER_RECHECK: '원장 재대조',
}

/** BE SettlementHistoryResponse */
export type SettlementHistory = {
  historyId: number
  stage: SettlementHistoryStage
  attemptNo: number
  trigger: SettlementTrigger
  result: SettlementHistoryResult
  errorCode: string | null
  failReason: string | null
  /** 관리자가 적은 사유 (재처리·보류·제외·불일치 확인) */
  adminReason: string | null
  batchExecutionId: number | null
  processedAt: string
}

/** BE SettlementLedgerMismatchConfirmResponse */
export type SettlementLedgerMismatchConfirmResult = {
  settlementId: number
  /** 다른 불일치가 없어 자동 해제(HOLD → READY)된 정산서 수. 남아 있으면 0 */
  releasedCount: number
}

export const getSettlementHistories = (id: number) =>
  api<SettlementHistory[]>(`/api/v1/admin/settlements/${id}/histories`)
/** 사유 필수(300자 이하). 풀리지 않은 원장 불일치가 없으면 409 */
export const confirmLedgerMismatch = (id: number, reason: string) =>
  api<SettlementLedgerMismatchConfirmResult>(`/api/v1/admin/settlements/${id}/ledger-mismatch/confirm`, {
    method: 'POST',
    body: { reason },
  })
export const getSettlementCandidates = (
  query: PageQuery & { sellerId?: number; month?: YearMonth; status?: SettlementCandidateStatus } = {},
) => api<PageResponse<SettlementCandidate>>('/api/v1/admin/settlement-candidates', { query })
/** 정산서에 묶이지 않은 READY 후보만. 사유 필수(300자 이하) */
export const excludeSettlementCandidate = (candidateId: number, reason: string) =>
  api<SettlementCandidate>(`/api/v1/admin/settlement-candidates/${candidateId}/exclude`, {
    method: 'POST',
    body: { reason },
  })

// ── 판매자 ──
export const getMySettlements = (query: PageQuery & { month?: YearMonth; status?: SettlementSellerStatus } = {}) =>
  api<PageResponse<SellerSettlement>>('/api/v1/seller/settlements', { query })
export const getMySettlement = (id: number) => api<SellerSettlementDetail>(`/api/v1/seller/settlements/${id}`)
export const getMyExpectedSettlement = () => api<SettlementExpected>('/api/v1/seller/settlements/expected')

// ── 표시 도우미 ──
/** '2026-09' → '2026년 9월' */
export const fmtMonth = (ym: YearMonth) => `${ym.slice(0, 4)}년 ${Number(ym.slice(5, 7))}월`
