import AppFrame from '../../components/ui/AppFrame'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty, ErrorView, Loading } from '../../components/ui/Misc'
import { getInfluencerProfile } from '../../lib/api/influencer'
import { useApi } from '../../lib/useApi'
import { notFoundAsNull } from '../account/util'
import s from './influencer.module.css'

/**
 * 크리에이터(인플루언서) 공개 프로필 (?influencerId=)
 * GET /api/v1/influencers/{influencerId} — 활동명·소개만 와요. 승인되지 않았거나 없는 인플루언서면 404
 */
export default function InfluencerProfilePage({ influencerId }: { influencerId?: string }) {
  const id = Number(influencerId)
  const valid = !!influencerId && Number.isInteger(id) && id > 0
  // 404는 null로 받아 안내 화면을 보여 줘요
  const profile = useApi(async () => {
    if (!valid) return null
    try {
      return await getInfluencerProfile(id)
    } catch (e) {
      if (notFoundAsNull(e) === null) return null
      throw e
    }
  }, [id, valid])

  let body
  if (!valid) body = <Empty title="크리에이터를 찾을 수 없어요">주소에 크리에이터 번호가 없거나 올바르지 않아요.</Empty>
  else if (profile.loading && !profile.data) body = <Loading label="프로필을 불러오고 있어요" />
  else if (profile.error) body = <ErrorView message={profile.error} onRetry={profile.reload} />
  else if (!profile.data)
    body = <Empty title="크리에이터를 찾을 수 없어요">승인되지 않았거나 더 이상 활동하지 않는 크리에이터예요.</Empty>
  else {
    const p = profile.data
    body = (
      <section aria-label="프로필" className={s.profile}>
        <span aria-hidden="true" className={s.avatar}>
          {p.activityName.slice(0, 1)}
        </span>
        <p className={s.profileName}>
          {p.activityName} <Badge tone="dark">인플루언서</Badge>
        </p>
        {p.introduction && <p className={s.profileIntro}>{p.introduction}</p>}
      </section>
    )
  }

  return (
    <AppFrame>
      <PageHeader title="크리에이터" back />
      {body}
    </AppFrame>
  )
}
