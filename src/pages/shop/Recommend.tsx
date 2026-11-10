import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import PageHeader from '../../components/ui/PageHeader'
import { ErrorView, Loading, Tabs, Thumb, won } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { AiTag, Avatar, ExampleNotice, imageOf, loadProducts } from './common'
import { MOCK_CREATORS, MOCK_PROFILE, MOCK_REC_FILTERS, MOCK_WHY } from './mock'
import styles from './Recommend.module.css'

type Tab = 'prod' | 'creator'

/**
 * 맞춤 추천 (상품 · 크리에이터). ?tab=creator 로 크리에이터 탭을 열어요.
 * TODO(API 미구현): AI 추천 API — 추천 상품·이유·성분 필터·크리에이터가 없어 상품은 최신 상품으로, 나머지는 목업이에요
 * TODO(API 미구현): "관심 없음" 피드백 저장 — 지금은 화면 안에서만 숨겨요
 */
export default function RecommendPage() {
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'creator' ? 'creator' : 'prod'
  const [filter, setFilter] = useState('전체')
  const [hidden, setHidden] = useState<number[]>([])

  const products = useApi(() => loadProducts({ size: 12 }), [])
  const all = (products.data?.items ?? []).map((p, i) => ({ ...p, why: MOCK_WHY[i % MOCK_WHY.length], tags: [MOCK_REC_FILTERS[(i % 4) + 1]] }))
  const shown = all.filter((p) => !hidden.includes(p.productId) && (filter === '전체' || p.tags.includes(filter)))
  const picks = all.slice(0, 3)

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

      <Link to="/survey/result" className={styles.basis}>
        <span>
          <b>{[...MOCK_PROFILE.type, ...MOCK_PROFILE.concern].join(' · ')}</b> 기준이에요
          <span>{MOCK_PROFILE.avoid.join(' · ')}이 든 상품은 뺐어요</span>
        </span>
        <span className={styles.change}>바꾸기 ›</span>
      </Link>

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
          <div role="group" aria-label="성분 필터" className={styles.filters}>
            {MOCK_REC_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={f === filter}
                className={f === filter ? styles.chipOn : styles.chip}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          {products.data?.example && <ExampleNotice />}
          {products.loading && !products.data && <Loading />}
          {products.error && <ErrorView message={products.error} onRetry={products.reload} />}
          <ul className={styles.list}>
            {shown.map((p) => (
              <li key={p.productId}>
                <Link to={`/product/${p.productId}`} className={styles.img}>
                  <Thumb src={imageOf(p)} width={96} height={96} radius={8} />
                </Link>
                <div className={styles.info}>
                  <Link to={`/product/${p.productId}`} className={styles.link}>
                    <span className={styles.brand}>{p.businessName}</span>
                    <span className={styles.name}>{p.name}</span>
                    <b className={styles.price}>{won(p.price)}</b>
                  </Link>
                  <span className={styles.why}>{p.why}</span>
                  <button type="button" className={styles.hide} onClick={() => setHidden([...hidden, p.productId])}>
                    관심 없음
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {products.data && shown.length === 0 && <p className={styles.empty}>이 조건에 맞는 추천 상품이 없어요.</p>}
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

      {tab === 'creator' && (
        <>
          <p className={styles.creatorLead}>피부 타입 · 고민 · 선호 성분이 많이 겹치는 순서예요</p>
          <ul className={styles.creators}>
            {MOCK_CREATORS.map((c) => (
              <li key={c.initial}>
                {/* TODO(API 미구현): 크리에이터 공개 프로필 화면 — 아직 라우트가 없어 이동하지 않아요 */}
                <div className={styles.creatorHead}>
                  <Avatar initial={c.initial} size={48} />
                  <span className={styles.creatorText}>
                    <b>{c.name}</b>
                    <span>{c.match}</span>
                  </span>
                </div>
                <div className={styles.picks}>
                  {picks.map((p) => (
                    <Link key={p.productId} to={`/product/${p.productId}`} aria-label={p.name}>
                      <Thumb src={imageOf(p)} width={72} height={72} radius={8} />
                    </Link>
                  ))}
                  <span className={styles.more}>+{c.picks}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </AppFrame>
  )
}
