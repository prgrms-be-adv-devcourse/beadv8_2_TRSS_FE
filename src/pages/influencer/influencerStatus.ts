/**
 * 내 인플루언서 신청 상태 (GET /api/v1/influencers/me)
 * 마이·내 정보의 인플루언서 카드, 인플루언서 신청·신청 상태 화면이 함께 쓴다.
 * 화면 확인용으로 ?influencerStatus=PENDING|APPROVED|REJECTED 를 받으면 API 대신 예시 값을 보여 준다.
 */
import { useEffect, useState } from 'react'
import { errorMessage } from '../../lib/api'
import { getMyInfluencer, type InfluencerStatus, type MyInfluencer } from '../../lib/api/influencer'
import { notFoundAsNull } from '../account/util'

/** 신청한 적 없으면 '신청 전' */
export type InfluencerView = '신청 전' | InfluencerStatus

export const isInfluencerStatus = (v?: string | null): v is InfluencerStatus =>
  v === 'PENDING' || v === 'APPROVED' || v === 'REJECTED'

/** 화면 확인용 예시 (?influencerStatus=…) */
export function sampleApplication(status: InfluencerStatus): MyInfluencer {
  const now = new Date().toISOString()
  return {
    influencerId: 0,
    status,
    activityName: '데일리 뷰티 민지',
    snsUrl: 'https://instagram.com/daily.beauty',
    introduction: '지성·트러블 피부를 위한 스킨케어 루틴을 주로 올려요.',
    appliedAt: now,
    decidedAt: status === 'PENDING' ? null : now,
    reason: status === 'REJECTED' ? 'SNS 계정에서 본인 확인이 어려워요. 프로필에 팔레트 활동명을 적어 주세요.' : null,
  }
}

/**
 * 내 인플루언서 신청 정보.
 * app: 불러오는 중 undefined, 신청 전(404) null. 그 밖의 오류는 error에 담고 app은 undefined로 둔다
 */
export function useInfluencerStatus(override?: string | null) {
  const sample = isInfluencerStatus(override) ? sampleApplication(override) : undefined
  const [app, setApp] = useState<MyInfluencer | null | undefined>(sample)
  const [error, setError] = useState('')
  const [seq, setSeq] = useState(0)

  useEffect(() => {
    if (isInfluencerStatus(override)) {
      setApp(sampleApplication(override))
      return
    }
    let alive = true
    setError('')
    getMyInfluencer()
      .then((a) => alive && setApp(a))
      .catch((e) => {
        if (!alive) return
        const notFound = notFoundAsNull(e)
        if (notFound === null) setApp(null)
        else setError(errorMessage(e))
      })
    return () => {
      alive = false
    }
  }, [override, seq])

  const view: InfluencerView | undefined = app === undefined ? undefined : (app?.status ?? '신청 전')
  return { app, view, error, reload: () => setSeq((n) => n + 1) }
}

export const INFLUENCER_META: Record<
  InfluencerView,
  { tag: string; tone: 'neutral' | 'amber' | 'green' | 'red'; text: string; act?: string; to: string }
> = {
  '신청 전': {
    tag: '신청 전',
    tone: 'neutral',
    text: '활동명과 SNS 계정을 내면 관리자가 확인한 뒤 승인해요. 판매자와 함께 할 수 있어요.',
    act: '인플루언서 신청하기',
    to: '/influencer/apply',
  },
  PENDING: { tag: '심사 중', tone: 'amber', text: '관리자가 SNS 계정을 확인하고 있어요.', to: '/influencer/status' },
  APPROVED: {
    tag: '승인됨',
    tone: 'green',
    text: '판매자 협약과 발행받은 쿠폰을 관리할 수 있어요.',
    act: '협약, 쿠폰 보기',
    to: '/influencer/partners',
  },
  REJECTED: {
    tag: '반려됨',
    tone: 'red',
    text: '반려 사유를 확인하고 다시 신청할 수 있어요.',
    act: '반려 사유 보기',
    to: '/influencer/status',
  },
}
