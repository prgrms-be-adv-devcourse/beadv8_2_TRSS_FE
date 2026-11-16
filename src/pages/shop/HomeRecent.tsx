/**
 * 홈 추천 탭의 "최근 본 상품" 섹션
 * - 위: 최근 본 상품 썸네일 (최대 RECENT_SHOWN개). 하나를 고르면 그 상품이 기준이 돼요.
 * - 아래: 기준 상품 이름으로 검색한 관련도순 상품 SIMILAR_SHOWN개 (이미 본 상품은 빼요).
 *   검색 결과가 모자라면 같은 카테고리 상품으로 채워요. (ES가 꺼져 DB 검색이 되면 이름이 거의 같은 상품만 나와서 이 경우가 많아요)
 * 최근 본 상품이 없으면 대신 "지금 많이 찾는 상품"(인기 상품)을 보여 줘요.
 *
 * TODO(API 미구현): 함께 본 상품 추천 — 조회 기록 기반 추천 API가 없어 상품 이름 관련도로 대신해요.
 * TODO(API 미구현): 인기 상품 — 판매량·찜 기준 정렬이 없어 랭킹 탭과 같이 최신순으로 채워요.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Thumb } from '../../components/ui/Misc'
import { useRecentViewed } from '../../lib/recentViewed'
import { useApi } from '../../lib/useApi'
import type { ProductSummary } from '../../lib/api/product'
import { MiniCard, SectionHead, imageOf, loadProducts } from './common'
import styles from './Home.module.css'

const RECENT_SHOWN = 6
const SIMILAR_SHOWN = 6
const POPULAR_SHOWN = 6
/** 검색어 최대 길이 (GET /products keyword) */
const KEYWORD_MAX = 100
/** 이미 본 상품을 빼고도 채울 수 있게 넉넉히 받아요 */
const FETCH_SIZE = SIMILAR_SHOWN + RECENT_SHOWN

type Similar = { related: ProductSummary[]; sameCategory: ProductSummary[] }

export default function HomeRecent() {
  const recent = useRecentViewed().slice(0, RECENT_SHOWN)
  const [basisId, setBasisId] = useState<number | null>(null)
  const basis = recent.find((r) => r.productId === basisId) ?? recent[0]

  // 최근 본 상품이 있으면 기준 상품 이름으로 관련도순 검색 + 같은 카테고리, 없으면 인기 상품을 불러와요.
  const similar = useApi(async (): Promise<Similar | null> => {
    if (!basis) return null
    const [related, sameCategory] = await Promise.all([
      loadProducts({ keyword: basis.name.slice(0, KEYWORD_MAX), sort: 'RELEVANCE', size: FETCH_SIZE }),
      loadProducts({ categoryId: basis.categoryId, size: FETCH_SIZE }),
    ])
    return { related: related.items, sameCategory: sameCategory.items }
  }, [basis?.productId, basis?.categoryId])
  const popularRes = useApi(
    () => (basis ? Promise.resolve(null) : loadProducts({ sort: 'LATEST', size: POPULAR_SHOWN })),
    [!basis],
  )
  if (!basis) {
    const popular = popularRes.data?.items ?? []
    if (popular.length === 0) return null
    return (
      <section aria-label="지금 많이 찾는 상품" className={`${styles.sec} ${styles.divided}`}>
        <SectionHead
          title="지금 많이 찾는 상품"
          desc="상품을 둘러보면 최근 본 상품과 비슷한 상품을 여기서 보여 드려요"
          more={{ to: '/?tab=ranking', label: '랭킹 보기' }}
        />
        <div className={styles.row}>
          {popular.map((p) => (
            <MiniCard key={p.productId} p={p} />
          ))}
        </div>
      </section>
    )
  }

  // 관련도순 → 같은 카테고리 순으로 이어 붙이고, 이미 본 상품·겹치는 상품은 빼요.
  const seen = new Set(recent.map((r) => r.productId))
  const related = (similar.data?.related ?? []).filter((p) => !seen.has(p.productId))
  const picked = new Set(related.map((p) => p.productId))
  const filler = (similar.data?.sameCategory ?? []).filter((p) => !seen.has(p.productId) && !picked.has(p.productId))
  const fresh = [...related, ...filler].slice(0, SIMILAR_SHOWN)
  // 새로 보여 줄 상품이 없으면 최근 본 상품을 그대로 다시 보여 줘요.
  const cards = fresh.length > 0 ? fresh : recent
  const descText =
    fresh.length === 0
      ? ' · 최근 본 상품이에요'
      : related.length > 0
        ? ' 기준 · 관련도 높은 순이에요'
        : ' 기준 · 같은 카테고리 상품이에요'

  return (
    <section aria-label="최근 본 상품과 비슷해요" className={`${styles.sec} ${styles.divided}`}>
      <div className={styles.secPad}>
        <h2 className={styles.h2}>최근 본 상품과 비슷해요</h2>
        <div className={styles.recent} role="group" aria-label="기준으로 할 최근 본 상품">
          <span>최근 본</span>
          {recent.map((r) => {
            const on = r.productId === basis.productId
            return (
              <button
                key={r.productId}
                type="button"
                aria-pressed={on}
                aria-label={`${r.name} 기준으로 보기`}
                className={`${styles.recentThumb} ${on ? styles.recentOn : ''}`}
                onClick={() => setBasisId(r.productId)}
              >
                <Thumb src={imageOf(r)} width={36} height={36} radius={8} />
              </button>
            )
          })}
        </div>
        <p className={styles.tabDesc}>
          <Link to={`/product/${basis.productId}`} className={styles.recentName}>
            {basis.name}
          </Link>
          {descText}
        </p>
      </div>
      <div className={styles.row}>
        {cards.map((p) => (
          <MiniCard key={p.productId} p={p} />
        ))}
      </div>
    </section>
  )
}
