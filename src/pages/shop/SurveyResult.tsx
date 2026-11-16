import { Link, useLocation } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import {
  BEAUTY_CATEGORY_LABEL,
  INGREDIENT_LABEL,
  SKIN_CONCERN_LABEL,
  SKIN_TYPE_LABEL,
  getCreatorRecommendations,
  getMySurvey,
  getProductRecommendations,
  shortDate,
  type BeautyProfile,
} from '../../lib/api/ai'
import { Avatar, MiniCard, SectionHead } from './common'
import styles from './Survey.module.css'

/**
 * 내 뷰티 프로필 (설문 결과)
 * - 설문을 막 마쳤으면 저장 응답(state.profile), 아니면 GET /api/v1/ai/survey/me
 * - 비슷한 크리에이터: GET /api/v1/ai/recommendations/creators, 맞춤 상품: GET /api/v1/ai/recommendations
 */
export default function SurveyResultPage() {
  const state = useLocation().state as { profile?: BeautyProfile; saved?: boolean } | null
  const loaded = useApi(() => (state?.profile ? Promise.resolve(state.profile) : getMySurvey()), [])
  const profile = loaded.data
  const creators = useApi(() => (profile ? getCreatorRecommendations(3) : Promise.resolve(null)), [profile])
  const products = useApi(() => (profile ? getProductRecommendations(4) : Promise.resolve(null)), [profile])
  const join = (v: string[]) => (v.length ? v.join(', ') : '선택 안 함')

  return (
    <AppFrame
      bottom={
        profile && (
          <BottomBar>
            <Button to="/recommend">맞춤 추천 보기</Button>
          </BottomBar>
        )
      }
    >
      <PageHeader
        back="/mypage"
        title="내 뷰티 프로필"
        right={
          profile && (
            <Link to="/survey/questions" state={{ profile }} className={styles.edit}>
              수정
            </Link>
          )
        }
      />

      {loaded.loading && !loaded.data && <Loading />}
      {loaded.error && <ErrorView message={loaded.error} onRetry={loaded.reload} />}
      {!loaded.loading && !loaded.error && !profile && (
        <Empty title="아직 뷰티 설문을 하지 않았어요" action={<Button to="/survey">설문 시작하기</Button>}>
          피부 타입과 성분 취향을 알려주시면 맞춤 상품과 크리에이터를 골라 드려요.
        </Empty>
      )}

      {profile && (
        <>
          {state?.saved && (
            <p role="status" className={styles.saved}>
              설문을 저장했어요. 추천에 바로 반영할게요.
            </p>
          )}

          <section aria-labelledby="skin" className={styles.card}>
            <div className={styles.cardHead}>
              <h2 id="skin">내 피부 정보</h2>
              <span>{shortDate(profile.updatedAt)} 업데이트</span>
            </div>
            <dl className={styles.dl}>
              <div>
                <dt>피부 타입</dt>
                <dd>{SKIN_TYPE_LABEL[profile.skinType]}</dd>
              </div>
              <div>
                <dt>피부 고민</dt>
                <dd>{join(profile.concerns.map((c) => SKIN_CONCERN_LABEL[c]))}</dd>
              </div>
              <div>
                <dt>선호 성분</dt>
                <dd>{join(profile.preferredIngredients.map((t) => INGREDIENT_LABEL[t]))}</dd>
              </div>
              <div>
                <dt>피하는 성분</dt>
                <dd>
                  {profile.avoidedIngredients.length
                    ? profile.avoidedIngredients.map((t) => INGREDIENT_LABEL[t]).join(', ')
                    : '없어요'}
                  {profile.avoidedIngredients.length > 0 && <span>이 성분이 든 상품은 추천에서 빠져요</span>}
                </dd>
              </div>
              <div>
                <dt>관심 카테고리</dt>
                <dd>{join(profile.interestCategories.map((c) => BEAUTY_CATEGORY_LABEL[c]))}</dd>
              </div>
            </dl>
          </section>

          {(creators.data?.length ?? 0) > 0 && (
            <section aria-label="나와 피부가 비슷한 크리에이터" className={styles.block}>
              <SectionHead
                title="나와 피부가 비슷한 크리에이터"
                ai
                desc="피부 타입과 고민이 겹치는 순서예요"
                more={{ to: '/recommend?tab=creator' }}
              />
              <ul className={styles.creatorList}>
                {creators.data!.map((c) => (
                  <li key={c.influencerId}>
                    <Link to="/recommend?tab=creator">
                      <Avatar initial={c.activityName.slice(0, 1)} size={44} />
                      <span className={styles.creatorText}>
                        <b>{c.activityName}</b>
                        <span>{c.reason}</span>
                      </span>
                      <span className={styles.creatorPicks}>›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(products.data?.items.length ?? 0) > 0 && (
            <section aria-label="내 피부 맞춤 상품" className={styles.block}>
              <SectionHead title="내 피부 맞춤 상품" ai more={{ to: '/recommend' }} />
              <div className={styles.row}>
                {products.data!.items.map((p) => (
                  <MiniCard key={p.productId} p={p} why={p.reason ?? undefined} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </AppFrame>
  )
}
