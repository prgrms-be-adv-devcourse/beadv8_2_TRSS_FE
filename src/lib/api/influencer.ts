/**
 * 인플루언서 신청 API (member-service)
 *
 * POST /api/v1/influencers     인플루언서 신청. 반려된 뒤에는 같은 API로 다시 신청
 * GET  /api/v1/influencers/me  내 신청 정보. 신청한 적이 없으면 404
 * GET  /api/v1/influencers/{influencerId}  공개 프로필. 승인된 인플루언서만, 아니면 404
 * GET  /api/v1/seller/influencers?keyword=&page&size  협약 요청할 승인된 인플루언서 검색 (판매 중 판매자만, 아니면 403)
 * GET  /api/v1/admin/influencers?status= (목록 + 탭별 건수) | /{influencerId} (상세)   (ADMIN)
 * POST /api/v1/admin/influencers/{influencerId}/approve | reject                     (ADMIN, 심사 중만)
 *
 * 409 INFLUENCER_ALREADY_APPLIED(진행 중인 신청이 있음), 409 INFLUENCER_STATE_INVALID(지금 상태에서는 처리 불가)
 */

import { api, type PageQuery, type PageResponse } from '.'

/** 심사 중·승인·반려 (반려되면 다시 신청할 수 있다) */
export type InfluencerStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type MyInfluencer = {
  influencerId: number
  status: InfluencerStatus
  activityName: string
  snsUrl: string
  introduction: string
  appliedAt: string
  /** 승인일·반려일. 심사 중이면 null */
  decidedAt: string | null
  /** 반려 사유. 그 밖의 상태면 null */
  reason: string | null
}

/** activityName 30자, snsUrl http(s):// 시작 500자, introduction 500자 (모두 필수) */
export type InfluencerApplyRequest = {
  activityName: string
  snsUrl: string
  introduction: string
}

export function getMyInfluencer() {
  return api<MyInfluencer>('/api/v1/influencers/me')
}

export function applyInfluencer(body: InfluencerApplyRequest) {
  return api<MyInfluencer>('/api/v1/influencers', { method: 'POST', body })
}

// ── 공개 프로필 · 판매자 검색 ───────────────────────────

/** BE InfluencerProfileResponse. 승인된 인플루언서의 공개 정보 */
export type InfluencerProfile = {
  influencerId: number
  activityName: string
  introduction: string | null
}

export function getInfluencerProfile(influencerId: number) {
  return api<InfluencerProfile>(`/api/v1/influencers/${influencerId}`)
}

/** 판매자가 협약을 요청할 승인된 인플루언서 검색. keyword는 활동명 기준, 비우면 전체 */
export function searchInfluencers(query: PageQuery & { keyword?: string } = {}) {
  return api<PageResponse<InfluencerProfile>>('/api/v1/seller/influencers', { query })
}

// ── 관리자 인플루언서 심사 (ADMIN) ───────────────────────

/** 관리자 목록 한 줄 */
export type AdminInfluencer = {
  influencerId: number
  memberId: number
  email: string
  activityName: string
  snsUrl: string
  status: InfluencerStatus
  appliedAt: string
}

export type AdminInfluencerHistory = {
  /** 처음 신청이면 null */
  fromStatus: InfluencerStatus | null
  toStatus: InfluencerStatus
  reason: string | null
  changedAt: string
}

export type AdminInfluencerDetail = {
  influencerId: number
  memberId: number
  email: string
  name: string
  status: InfluencerStatus
  activityName: string
  snsUrl: string
  introduction: string
  appliedAt: string
  /** 승인일·반려일. 심사 중이면 null */
  decidedAt: string | null
  /** 가장 최근 이력의 사유 (반려) */
  reason: string | null
  /** 오래된 순 */
  histories: AdminInfluencerHistory[]
}

/** 탭별 건수. status 필터와 관계없이 전체 기준 */
export type AdminInfluencerCounts = { all: number; pending: number; approved: number; rejected: number }

/** 심사 중을 먼저, 그다음 최근 신청순 (정렬 고정) */
export function getAdminInfluencers(query: PageQuery & { status?: InfluencerStatus } = {}) {
  return api<{ influencers: PageResponse<AdminInfluencer>; counts: AdminInfluencerCounts }>(
    '/api/v1/admin/influencers',
    { query },
  )
}

export function getAdminInfluencer(influencerId: number) {
  return api<AdminInfluencerDetail>(`/api/v1/admin/influencers/${influencerId}`)
}

/** 승인 (심사 중만) */
export function approveInfluencer(influencerId: number) {
  return api<AdminInfluencerDetail>(`/api/v1/admin/influencers/${influencerId}/approve`, { method: 'POST' })
}

/** 반려 (심사 중만, 사유 필수). 반려된 회원은 다시 신청할 수 있다 */
export function rejectInfluencer(influencerId: number, reason: string) {
  return api<AdminInfluencerDetail>(`/api/v1/admin/influencers/${influencerId}/reject`, {
    method: 'POST',
    body: { reason },
  })
}
