/**
 * 홈 추천 탭의 탐색 섹션 (공개 API만 써요)
 * - 위쪽(HomeExploreTop): 지금 뜨는 랭킹 TOP 5 · 오늘의 특가
 * - 아래쪽(HomeCategoryBest): 카테고리별 베스트
 * 비로그인은 위쪽 → 새로 들어온 뷰티 → 아래쪽 순서, 로그인은 개인화 섹션들 아래에 둬요.
 * 각 섹션은 요청이 실패하거나 결과가 비면 그 섹션만 숨겨요.
 * 개발 데이터가 적어서, 앞 섹션에 나온 상품은 뒤 섹션에서 빼요 (랭킹 → 특가 → 새로 들어온 뷰티 → 카테고리 베스트).
 */
import { useState } from 'react'
import type { ProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { MiniCard, SectionHead, loadCategories, loadProducts } from './common'
import styles from './Home.module.css'

const RANKING_SIZE = 5
/** 특가·카테고리 베스트는 앞 섹션과 겹치는 상품을 빼고 이만큼까지 보여 줘요 */
const ROW_SIZE = 8
/** 카테고리 베스트는 앞 섹션과 겹치는 상품을 빼야 해서 넉넉히 받아요 */
const BEST_FETCH_SIZE = 30

/** 실패하면 null (섹션만 숨겨요) */
const loadOrNull = (q: Parameters<typeof loadProducts>[0]) =>
  loadProducts(q).then(
    (r) => r.items,
    () => null,
  )

/** 랭킹 · 특가 데이터. 새로 들어온 뷰티·카테고리 베스트에서 겹침을 빼려고 Home에서 한 번만 불러요. */
export function useHomeExplore() {
  const ranking = useApi(() => loadOrNull({ sort: 'POPULAR', size: RANKING_SIZE }), []).data ?? []
  const saleAll =
    useApi(() => loadOrNull({ discounted: true, sort: 'DISCOUNT_RATE', size: ROW_SIZE + RANKING_SIZE }), []).data ?? []
  const rankIds = new Set(ranking.map((p) => p.productId))
  const sale = saleAll.filter((p) => !rankIds.has(p.productId)).slice(0, ROW_SIZE)
  return { ranking, sale, shownIds: [...rankIds, ...sale.map((p) => p.productId)] }
}

export type HomeExploreData = ReturnType<typeof useHomeExplore>

export function HomeExploreTop({ data }: { data: HomeExploreData }) {
  return (
    <>
      {data.ranking.length > 0 && (
        <section aria-label="지금 뜨는 랭킹" className={styles.sec}>
          <SectionHead title="지금 뜨는 랭킹" desc="찜·별점·판매량을 합친 순위예요" more={{ to: '/?tab=ranking' }} />
          <ol className={`${styles.row} ${styles.plainList}`}>
            {data.ranking.map((p, i) => (
              <li key={p.productId} className={styles.rankItem}>
                <MiniCard p={p} />
                <span aria-hidden="true" className={styles.rank}>
                  {i + 1}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      {data.sale.length > 0 && (
        <section aria-label="오늘의 특가" className={styles.sec}>
          <SectionHead title="오늘의 특가" desc="할인율 높은 순이에요" more={{ to: '/?tab=sale' }} />
          <div className={styles.row}>
            {data.sale.map((p) => (
              <span key={p.productId} className={styles.rankItem}>
                <MiniCard p={p} />
                {p.discountRate != null && (
                  <span aria-hidden="true" className={styles.saleBadge}>
                    {p.discountRate}%
                  </span>
                )}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

/** 카테고리별 베스트. 카테고리 목록을 받기 전·실패면 숨겨요 */
export function HomeCategoryBest({ excludeIds }: { excludeIds: number[] }) {
  const tree = useApi(() => loadCategories().catch(() => null), []).data ?? []
  return tree.length > 0 ? <CategoryBest groups={tree} excludeIds={excludeIds} /> : null
}

/** 대분류 탭 + 그 대분류의 인기순 상품 */
function CategoryBest({ groups, excludeIds }: { groups: Array<{ categoryId: number; name: string }>; excludeIds: number[] }) {
  const [picked, setPicked] = useState(groups[0].categoryId)
  const res = useApi(
    (): Promise<ProductSummary[] | null> =>
      loadOrNull({ categoryId: picked, sort: 'POPULAR', size: BEST_FETCH_SIZE }),
    [picked],
  )
  // 첫 대분류가 실패하면 섹션을 숨겨요. 탭을 바꾼 뒤 실패·빈 결과는 안내만 보여 줘요
  if (res.data === null && picked === groups[0].categoryId) return null
  const exclude = new Set(excludeIds)
  const items = (res.data ?? []).filter((p) => !exclude.has(p.productId)).slice(0, ROW_SIZE)
  const cur = groups.find((g) => g.categoryId === picked)
  return (
    <section aria-label="카테고리별 베스트" className={`${styles.sec} ${styles.divided}`}>
      <SectionHead title="카테고리별 베스트" more={{ to: `/products?categoryId=${picked}` }} />
      <div role="tablist" aria-label="대분류" className={styles.chipRow}>
        {groups.map((g) => (
          <button
            key={g.categoryId}
            type="button"
            role="tab"
            aria-selected={g.categoryId === picked}
            className={`${styles.qchip} ${g.categoryId === picked ? styles.qon : ''}`}
            onClick={() => setPicked(g.categoryId)}
          >
            {g.name}
          </button>
        ))}
      </div>
      {res.data && items.length === 0 ? (
        <p className={`${styles.secPad} ${styles.tabDesc}`}>{cur?.name}에서 더 보여 줄 상품이 없어요.</p>
      ) : (
        <div role="tabpanel" aria-label={`${cur?.name} 베스트`} className={styles.row}>
          {items.map((p) => (
            <MiniCard key={p.productId} p={p} />
          ))}
        </div>
      )}
    </section>
  )
}
