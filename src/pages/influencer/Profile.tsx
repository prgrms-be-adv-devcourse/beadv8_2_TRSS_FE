import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Thumb, won } from '../../components/ui/Misc'
import { MOCK_PROFILE } from './mock'
import s from './influencer.module.css'

/**
 * 크리에이터(인플루언서) 공개 프로필
 * TODO(API 미구현): GET /api/v1/influencers/{influencerId} — 프로필·pick 목록, "나와 비슷한 점"은 AI 추천 API.
 *   지금은 mock.ts의 MOCK_PROFILE을 보여 줘요 (?influencerId= 를 받아 둘 자리만 있어요)
 */
export default function InfluencerProfilePage(_props: { influencerId?: string }) {
  const p = MOCK_PROFILE
  // 피하는 성분이 든 pick은 흐리게, 맨 뒤로
  const picks = [...p.picks].sort((a, b) => Number(!!a.avoid) - Number(!!b.avoid))
  return (
    <AppFrame>
      <PageHeader title="크리에이터" back />
      <section aria-label="프로필" className={s.profile}>
        <span aria-hidden="true" className={s.avatar}>
          {p.activityName.slice(0, 1)}
        </span>
        <p className={s.profileName}>
          {p.activityName} <Badge tone="dark">인플루언서</Badge>
        </p>
        <p className={s.profileIntro}>{p.intro}</p>
        <div className={s.tags}>
          {p.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      <section aria-labelledby="cp-match" className={s.match}>
        <p id="cp-match">
          <span className={s.aiTag}>AI</span>나와 비슷한 점
        </p>
        <ul>
          {p.matches.map((m) => (
            <li key={m}>
              <Icon name="check" size={14} />
              {m}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cp-picks">
        <div className={s.gridHead}>
          <h2 id="cp-picks">pick {picks.length}</h2>
          <span>내 피부에 맞는 순</span>
        </div>
        <div className={s.grid}>
          {picks.map((it) => (
            <Link key={it.productId} to={`/product/${it.productId}`} className={`${s.card} ${it.avoid ? s.dim : ''}`}>
              <span className={s.cardImg}>
                <Thumb src={it.thumbnailUrl} width="100%" height={170} radius={12} />
                {it.badge && <span className={s.cardBadge}>{it.badge}</span>}
              </span>
              <span className={s.cardBrand}>{it.brand}</span>
              <span className={s.cardName}>{it.name}</span>
              <b className={s.cardPrice}>{won(it.price)}</b>
              {it.coupon && <span className={s.cardCoupon}>{it.coupon}</span>}
            </Link>
          ))}
        </div>
        <p className={s.foot}>피하는 성분이 든 pick은 흐리게 표시하고 맨 뒤로 보내요.</p>
      </section>
    </AppFrame>
  )
}
