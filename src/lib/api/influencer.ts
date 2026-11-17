/**
 * 인플루언서 신청 API (member-service)
 *
 * POST /api/v1/influencers     인플루언서 신청. 반려된 뒤에는 같은 API로 다시 신청
 * GET  /api/v1/influencers/me  내 신청 정보. 신청한 적이 없으면 404
 *
 * 409 INFLUENCER_ALREADY_APPLIED(진행 중인 신청이 있음), 409 INFLUENCER_STATE_INVALID(지금 상태에서는 처리 불가)
 */

import { api } from '.'

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
