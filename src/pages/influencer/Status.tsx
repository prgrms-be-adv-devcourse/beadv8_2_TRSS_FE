import { Navigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon, { type IconName } from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Loading } from '../../components/ui/Misc'
import { fmtDate } from '../account/util'
import { useInfluencerStatus, type InfluencerStatus } from './mock'
import s from './influencer.module.css'

const STATE: Record<
  InfluencerStatus,
  {
    chip: string
    tone: 'amber' | 'green' | 'red' | 'neutral'
    icon: IconName
    title: string
    desc: string
    date: string
    reasonLabel?: string
  }
> = {
  PENDING: {
    chip: '심사 중',
    tone: 'amber',
    icon: 'more',
    title: '신청 내용을 확인하고 있어요',
    desc: '관리자가 SNS 계정을 확인한 뒤 승인 여부를 알려 드려요. 결과는 이 화면과 내 정보에서 볼 수 있어요.',
    date: '신청일',
  },
  APPROVED: {
    chip: '승인됨',
    tone: 'green',
    icon: 'check',
    title: '인플루언서로 승인됐어요',
    desc: '이제 팔레트에서 인플루언서로 활동할 수 있어요.',
    date: '승인일',
  },
  REJECTED: {
    chip: '반려됨',
    tone: 'red',
    icon: 'close',
    title: '신청이 반려됐어요',
    desc: '반려 사유를 확인하고 내용을 고쳐 다시 신청할 수 있어요.',
    date: '반려일',
    reasonLabel: '반려 사유',
  },
  REVOKED: {
    chip: '자격 해제',
    tone: 'neutral',
    icon: 'close',
    title: '인플루언서 자격이 해제됐어요',
    desc: '자격이 해제된 계정은 다시 신청할 수 없어요.',
    date: '해제일',
    reasonLabel: '해제 사유',
  },
}

/**
 * ⑨-3 인플루언서 신청 상태 (PENDING · APPROVED · REJECTED · REVOKED)
 * 화면 확인용: /influencer/status?influencerStatus=REJECTED
 * TODO(API 미구현): GET /api/v1/influencers/me — 지금은 mock.ts의 목업 상태예요
 */
export default function InfluencerStatusPage(props: { influencerStatus?: string }) {
  const { app } = useInfluencerStatus(props.influencerStatus)

  if (app === undefined)
    return (
      <AppFrame>
        <PageHeader title="인플루언서 신청" back="/mypage/profile" />
        <Loading />
      </AppFrame>
    )
  if (app === null) return <Navigate to="/influencer/apply" replace />

  const t = STATE[app.status]
  return (
    <AppFrame
      bottom={
        <BottomBar>
          {app.status === 'REJECTED' ? (
            <Button size="lg" to="/influencer/apply">
              다시 신청하기
            </Button>
          ) : app.status === 'APPROVED' ? (
            <Button size="lg" to="/influencer/picks">
              내 pick 관리하기
            </Button>
          ) : (
            <Button size="lg" variant="outline" to="/mypage/profile">
              내 정보로 돌아가기
            </Button>
          )}
        </BottomBar>
      }
    >
      <PageHeader title="인플루언서 신청" back="/mypage/profile" />
      <section className={s.state}>
        <span aria-hidden="true" className={`${s.stateIcon} ${s[`tone_${t.tone}`]}`}>
          <Icon name={t.icon} size={28} />
        </span>
        <Badge tone={t.tone}>{t.chip}</Badge>
        <h2>{t.title}</h2>
        <p>{t.desc}</p>
      </section>
      {t.reasonLabel && app.reason && (
        <div className={s.reason}>
          <p>{t.reasonLabel}</p>
          <p>{app.reason}</p>
        </div>
      )}
      <dl className={s.dl}>
        <div>
          <dt>활동명</dt>
          <dd>{app.activityName}</dd>
        </div>
        <div>
          <dt>SNS 계정</dt>
          <dd>{app.snsUrl}</dd>
        </div>
        <div>
          <dt>{t.date}</dt>
          <dd>{fmtDate(app.status === 'PENDING' ? app.appliedAt : (app.decidedAt ?? app.appliedAt))}</dd>
        </div>
      </dl>
    </AppFrame>
  )
}
