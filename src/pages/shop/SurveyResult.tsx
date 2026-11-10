import { Link, useLocation } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { useApi } from '../../lib/useApi'
import { Avatar, MiniCard, SectionHead, loadProducts } from './common'
import { MOCK_CREATORS, MOCK_PROFILE, MOCK_WHY, type BeautyProfile } from './mock'
import styles from './Survey.module.css'

/** 내 뷰티 프로필 (설문 결과) */
export default function SurveyResultPage() {
  const state = useLocation().state as { profile?: BeautyProfile; saved?: boolean } | null
  // TODO(API 미구현): GET /ai/survey/me — 설문을 막 마쳤으면 그 답, 아니면 목업 프로필
  const profile = state?.profile ?? MOCK_PROFILE
  // TODO(API 미구현): AI 맞춤 상품 추천 — 지금은 최신 상품으로 채워요
  const products = useApi(() => loadProducts({ size: 4 }), [])
  const join = (v: string[]) => (v.length ? v.join(', ') : '선택 안 함')

  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button to="/">홈에서 추천 보기</Button>
        </BottomBar>
      }
    >
      <PageHeader
        back="/mypage"
        title="내 뷰티 프로필"
        right={
          <Link to="/survey/questions" state={{ profile }} className={styles.edit}>
            수정
          </Link>
        }
      />

      {state?.saved && (
        <p role="status" className={styles.saved}>
          설문을 마쳤어요. 추천에 바로 반영할게요.
        </p>
      )}

      <section aria-labelledby="skin" className={styles.card}>
        <div className={styles.cardHead}>
          <h2 id="skin">내 피부 정보</h2>
          <span>{profile.updatedAt} 업데이트</span>
        </div>
        <dl className={styles.dl}>
          <div>
            <dt>피부 타입</dt>
            <dd>{join(profile.type)}</dd>
          </div>
          <div>
            <dt>피부 고민</dt>
            <dd>{join(profile.concern)}</dd>
          </div>
          <div>
            <dt>선호 성분</dt>
            <dd>{join(profile.like)}</dd>
          </div>
          <div>
            <dt>피하는 성분</dt>
            <dd>
              {join(profile.avoid)}
              {profile.avoid.length > 0 && <span>이 성분이 든 상품은 추천에서 빠져요</span>}
            </dd>
          </div>
          <div>
            <dt>관심 카테고리</dt>
            <dd>{join(profile.cat)}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="나와 피부가 비슷한 크리에이터" className={styles.block}>
        {/* TODO(API 미구현): AI 크리에이터 추천 */}
        <SectionHead
          title="나와 피부가 비슷한 크리에이터"
          ai
          desc="피부 타입과 고민이 겹치는 순서예요"
          more={{ to: '/recommend?tab=creator' }}
        />
        <ul className={styles.creatorList}>
          {MOCK_CREATORS.slice(0, 3).map((c) => (
            <li key={c.initial}>
              <Link to="/recommend?tab=creator">
                <Avatar initial={c.initial} size={44} />
                <span className={styles.creatorText}>
                  <b>{c.name}</b>
                  <span>{c.match}</span>
                </span>
                <span className={styles.creatorPicks}>pick {c.picks} ›</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(products.data?.items.length ?? 0) > 0 && (
        <section aria-label="내 피부 맞춤 상품" className={styles.block}>
          <SectionHead title="내 피부 맞춤 상품" ai more={{ to: '/recommend' }} />
          <div className={styles.row}>
            {products.data!.items.map((p, i) => (
              <MiniCard key={p.productId} p={p} why={MOCK_WHY[i % MOCK_WHY.length]} />
            ))}
          </div>
        </section>
      )}
    </AppFrame>
  )
}
