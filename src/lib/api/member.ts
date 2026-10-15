/**
 * 회원·판매자 API (백엔드 담당: 시연)
 *
 * 로그인·로그아웃·토큰 재발급은 lib/auth.ts에 있어요.
 * POST   /api/v1/auth/email/check | email/code | email/verify | signup
 * GET    /api/v1/users/me
 * POST   /api/v1/sellers           판매자 신청
 * GET    /api/v1/sellers/me        내 판매자 신청 상태
 * PATCH  /api/v1/seller/me         판매자 정보 수정 (SELLER)
 * POST   /api/v1/seller/me/withdrawal  판매자 철회 요청 (SELLER)
 * GET    /api/v1/admin/sellers (PageResponse) | /{sellerId}
 * POST   /api/v1/admin/sellers/{sellerId}/approve | reject | withdrawal/approve | withdrawal/reject | sanction
 * GET    /api/v1/admin/users (PageResponse) | /{userId}
 */

import { api, type PageQuery, type PageResponse } from '.'

export type SellerStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'WITHDRAW_REQUESTED' // 본인 철회 요청, 관리자 승인 대기
  | 'WITHDRAWN' // 본인 철회 완료 (재신청 가능)
  | 'SANCTIONED' // 관리자 제재 (재신청 불가)

/** 내 판매자 정보·신청 상태. 계좌번호는 끝 4자리만, 반려·철회 뒤에는 사업자번호가 비어 있다. */
export type MySeller = {
  sellerId: number
  status: SellerStatus
  businessName: string
  businessNumber: string | null
  representativeName: string
  phoneNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
  /** 가장 최근 상태 변경 사유 (반려·철회 요청·철회 거절·제재) */
  reason: string | null
  appliedAt: string
  /** 승인일. 승인 전·반려·재신청 뒤에는 null. 철회 요청·거절로는 바뀌지 않는다 */
  approvedAt: string | null
  /** 아직 정산받지 않은 금액. 0이어야 철회를 요청할 수 있다 */
  unsettledAmount: number
}

/** 입점 신청. 번호류는 하이픈이 있어도 된다. */
export type SellerApplyRequest = {
  businessName: string
  businessNumber: string
  representativeName: string
  phoneNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

export type SellerApplyResponse = { sellerId: number; status: SellerStatus; appliedAt: string }

/** 정보 수정. 바꿀 값만 보낸다. 정산 계좌는 은행·계좌번호·예금주를 함께 보내야 한다. */
export type SellerUpdateRequest = Partial<
  Pick<SellerApplyRequest, 'businessName' | 'phoneNumber' | 'bankName' | 'accountNumber' | 'accountHolder'>
>

/** 다시 신청할 수 있는 상태 */
export const canApply = (status: SellerStatus | null) =>
  status === null || status === 'REJECTED' || status === 'WITHDRAWN'

/** 내 판매자 정보. 신청한 적이 없으면 404(ApiError). */
export function getMySeller() {
  return api<MySeller>('/api/v1/sellers/me')
}

export function applySeller(body: SellerApplyRequest) {
  return api<SellerApplyResponse>('/api/v1/sellers', { method: 'POST', body })
}

export function updateSeller(body: SellerUpdateRequest) {
  return api<MySeller>('/api/v1/seller/me', { method: 'PATCH', body })
}

export function requestSellerWithdrawal(reason: string) {
  return api<MySeller>('/api/v1/seller/me/withdrawal', { method: 'POST', body: { reason } })
}

/** 정산 계좌 은행 선택지 */
export const BANKS = [
  '국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  '농협은행',
  '기업은행',
  'SC제일은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
]

// ── 관리자 판매자 관리 (ADMIN) ───────────────────────────

/** 관리자 판매자 목록 항목. 반려·본인 철회 뒤에는 사업자번호가 비어 있다 */
export type AdminSeller = {
  sellerId: number
  appliedAt: string
  businessName: string
  businessNumber: string | null
  email: string
  status: SellerStatus
}

/** 상태 이력 한 줄 (오래된 순). 스냅샷은 반려·본인 철회로 바뀐 줄에만 있다 */
export type AdminSellerHistory = {
  fromStatus: SellerStatus | null
  toStatus: SellerStatus
  reason: string | null
  changedAt: string
  businessName: string | null
  businessNumber: string | null
  representativeName: string | null
  accountLast4: string | null
}

/** 관리자 판매자 상세. 계좌번호는 끝 4자리만 */
export type AdminSellerDetail = {
  sellerId: number
  memberId: number
  email: string
  name: string
  status: SellerStatus
  businessName: string
  businessNumber: string | null
  representativeName: string
  phoneNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
  appliedAt: string
  histories: AdminSellerHistory[]
}

/** 판매자 목록. 심사 대기 먼저, 그다음 최근 신청순 고정 (sort는 무시된다) */
export function getAdminSellers(query: PageQuery & { status?: SellerStatus } = {}) {
  return api<PageResponse<AdminSeller>>('/api/v1/admin/sellers', { query })
}

export function getAdminSeller(sellerId: number) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}`)
}

/** 입점 승인 (PENDING만). 회원에게 판매자 권한이 생긴다 */
export function approveSeller(sellerId: number) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}/approve`, { method: 'POST' })
}

/** 입점 반려 (PENDING만, 사유 필수) */
export function rejectSeller(sellerId: number, reason: string) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}/reject`, { method: 'POST', body: { reason } })
}

/** 철회 승인 (WITHDRAW_REQUESTED만). 진행 중인 판매 주문이나 미정산 금액이 있으면 409 */
export function approveSellerWithdrawal(sellerId: number) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}/withdrawal/approve`, { method: 'POST' })
}

/** 철회 거절 (WITHDRAW_REQUESTED만, 사유 필수). 다시 판매 중(APPROVED)이 된다 */
export function rejectSellerWithdrawal(sellerId: number, reason: string) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}/withdrawal/reject`, {
    method: 'POST',
    body: { reason },
  })
}

/** 제재 (APPROVED·WITHDRAW_REQUESTED, 사유 필수). 정산 보류, 재신청 불가 */
export function sanctionSeller(sellerId: number, reason: string) {
  return api<AdminSellerDetail>(`/api/v1/admin/sellers/${sellerId}/sanction`, { method: 'POST', body: { reason } })
}
