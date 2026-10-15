/**
 * 판매자 API
 *
 * - /api/v1/sellers/**  : 로그인한 회원 누구나 (입점 신청, 내 신청 상태 조회)
 * - /api/v1/seller/**   : 승인된 판매자(SELLER)만 (정보 수정, 철회 요청)
 */
import { api } from './api'

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
  statusChangedAt: string | null
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
  'KB국민은행',
  '신한은행',
  '우리은행',
  '하나은행',
  'NH농협은행',
  'IBK기업은행',
  'SC제일은행',
  '카카오뱅크',
  '토스뱅크',
  '케이뱅크',
]
