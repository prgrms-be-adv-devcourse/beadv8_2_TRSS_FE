import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Tabs, Thumb, won } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../lib/auth'
import { INGREDIENT_LABEL, basisText, getCreatorRecommendations, type IngredientTag } from '../../lib/api/ai'
import { AiTag, Avatar, ExampleNotice, imageOf, loadRecommendations } from './common'
import styles from './Recommend.module.css'

type Tab = 'prod' | 'creator'
const ALL = 'ALL'

/**
 * 맞춤 추천 (상품 · 크리에이터). ?tab=creator 로 크리에이터 탭을 열어요.
 * - 상품: GET /api/v1/ai/recommendations (비회원·설문 전이면 뷰티 최신순)
 * - 크리에이터: GET /api/v1/ai/recommendations/creators (로그인 + 설문 필요)
 * TODO(API 미구현): "관심 없음" 피드백 저장 — 지금은 화면 안에서만 숨겨요
 */
export default function RecommendPage() {
  const { loggedIn } = useAuth()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'creator' ? 'creator' : 'prod'
  const [filter, setFilter] = useState<IngredientTag | typeof ALL>(ALL)
  const [hidden, setHidden] = useState<number[]>([])

  const products = useApi(() => loadRecommendations(30), [loggedIn])
  const creators = useApi(
    () => (tab === 'creator' && loggedIn ? getCreatorRecommendations(20) : Promise.resolve(undefined)),
    [tab, loggedIn],
  )

  const rec = products.data
  const all = rec?.items ?? []
  // 성분 필터: 추천 상품에 들어 있는 내 선호 성분만 보여 줘요
  const tags = [...new Set(all.flatMap((p) => p.matchedIngredients))]
  const shown = all.filter(
    (p) => !hidden.includes(p.productId) && (filter === ALL || p.matchedIngredients.includes(filter)),
  )

  return (
    <AppFrame>
      <PageHeader
        back
        title={
          <>
            맞춤 추천 <AiTag />
          </>
        }
      />

      {rec?.personalized && rec.basis ? (
        <Link to="/survey/result" className={styles.basis}>
          <span>
            <b>{basisText(rec.basis)}</b> 기준이에요
            {rec.basis.avoidedIngredients.length > 0 && (
              <span>{rec.basis.avoidedIngredients.map((t) => INGREDIENT_LABEL[t]).join(' · ')}이 든 상품은 뺐어요</span>
            )}
          </span>
          <span className={styles.change}>바꾸기 ›</span>
        </Link>
      ) : (
        rec && (
          <Link to="/survey" className={styles.basis}>
            <span>
              <b>새로 들어온 뷰티 상품이에요</b>
              <span>뷰티 설문을 하면 내 피부에 맞춰 골라 드려요</span>
            </span>
            <span className={styles.change}>설문하기 ›</span>
          </Link>
        )
      )}

      <div className={styles.tabs}>
        <Tabs
          label="추천 종류"
          items={[
            { value: 'prod', label: '상품' },
            { value: 'creator', label: '크리에이터' },
          ]}
          value={tab}
          onChange={(v) => setParams(v === 'creator' ? { tab: 'creator' } : {}, { replace: true })}
        />
      </div>

      {tab === 'prod' && (
        <>
          {tags.length > 0 && (
            <div role="group" aria-label="성분 필터" className={styles.filters}>
              {[ALL, ...tags].map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={f === filter}
                  className={f === filter ? styles.chipOn : styles.chip}
                  onClick={() => setFilter(f as IngredientTag | typeof ALL)}
                >
                  {f === ALL ? '전체' : INGREDIENT_LABEL[f as IngredientTag]}
                </button>
              ))}
            </div>
          )}
          {rec?.example && <ExampleNotice />}
          {products.loading && !rec && <Loading />}
          {products.error && <ErrorView message={products.error} onRetry={products.reload} />}
          <ul className={styles.list}>
            {shown.map((p) => (
              <li key={p.productId}>
                <Link to={`/product/${p.productId}`} className={styles.img}>
                  <Thumb src={imageOf(p)} width={96} height={96} radius={8} />
                </Link>
                <div className={styles.info}>
                  <Link to={`/product/${p.productId}`} className={styles.link}>
                    {p.categoryName && <span className={styles.brand}>{p.categoryName}</span>}
                    <span className={styles.name}>{p.name}</span>
                    <b className={styles.price}>{won(p.price)}</b>
                  </Link>
                  {p.reason && <span className={styles.why}>{p.reason}</span>}
                  <button type="button" className={styles.hide} onClick={() => setHidden([...hidden, p.productId])}>
                    관심 없음
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {rec && shown.length === 0 && <p className={styles.empty}>이 조건에 맞는 추천 상품이 없어요.</p>}
          {hidden.length > 0 && (
            <p className={styles.hiddenBar}>
              숨긴 상품 {hidden.length}개 · 다음 추천에 반영할게요{' '}
              <button type="button" onClick={() => setHidden([])}>
                되돌리기
              </button>
            </p>
          )}
        </>
      )}

      {tab === 'creator' &&
        (!loggedIn ? (
          <Empty
            title="로그인하면 피부가 비슷한 크리에이터를 볼 수 있어요"
            action={<Button to="/login">로그인</Button>}
          />
        ) : (
          <>
            {creators.loading && !creators.data && <Loading />}
            {creators.error && <ErrorView message={creators.error} onRetry={creators.reload} />}
            {!creators.loading && !creators.error && creators.data === null && (
              <Empty title="뷰티 설문을 먼저 해 주세요" action={<Button to="/survey">설문 시작하기</Button>}>
                피부 타입·고민·선호 성분이 겹치는 크리에이터를 찾아 드려요.
              </Empty>
            )}
            {creators.data?.length === 0 && (
              <Empty title="아직 피부가 비슷한 크리에이터가 없어요">설문한 크리에이터가 늘면 여기에 보여요.</Empty>
            )}
            {(creators.data?.length ?? 0) > 0 && (
              <>
                <p className={styles.creatorLead}>피부 타입 · 고민 · 선호 성분이 많이 겹치는 순서예요</p>
                <ul className={styles.creators}>
                  {creators.data!.map((c) => (
                    <li key={c.influencerId}>
                      {/* TODO(API 미구현): 크리에이터 공개 프로필·pick 목록 — 아직 API·라우트가 없어 이동하지 않아요 */}
                      <div className={styles.creatorHead}>
                        <Avatar initial={c.activityName.slice(0, 1)} size={48} />
                        <span className={styles.creatorText}>
                          <b>{c.activityName}</b>
                          <span>{c.reason}</span>
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ))}
    </AppFrame>
  )
}
