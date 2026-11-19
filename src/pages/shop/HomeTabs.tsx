/**
 * 홈 헤더 탭(전체 · 랭킹 · 특가 · 신상 · 기획전)의 내용. 추천 탭은 Home.tsx의 기존 섹션이에요.
 * 전체 탭만 오른쪽 위에서 정렬을 골라요 (URL 쿼리 sort).
 * - 랭킹: 인기순(POPULAR, 찜·별점·최근 30일 판매량)
 * - 특가: 지금 할인 중인 상품만(discounted=true), 할인율 높은순(DISCOUNT_RATE)
 * - 신상: 최신순
 * - 기획전: 프론트에서 큐레이션한 기획전 카드 목록 (exhibitions.ts · Exhibition.tsx, TRSS-343)
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import type { ProductSort, ProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { ExampleNotice, ProductCard, loadProducts, useWishes } from './common'
import { ExhibitionTabView } from './Exhibition'
import styles from './Home.module.css'

export type HomeTab = 'recommend' | 'ranking' | 'sale' | 'new' | 'all' | 'exhibition'
type ProductTab = Exclude<HomeTab, 'recommend' | 'exhibition'>

export const HOME_TABS: Array<{ key: HomeTab; label: string }> = [
  { key: 'recommend', label: '추천' },
  { key: 'all', label: '전체' },
  { key: 'ranking', label: '랭킹' },
  { key: 'sale', label: '특가' },
  { key: 'new', label: '신상' },
  { key: 'exhibition', label: '기획전' },
]

/** 전체 탭 정렬 */
const ALL_SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: 'LATEST', label: '최신순' },
  { value: 'SALES', label: '판매량순' },
  { value: 'WISH', label: '찜 많은순' },
  { value: 'PRICE_ASC', label: '낮은 가격순' },
  { value: 'PRICE_DESC', label: '높은 가격순' },
]

const LIST_SIZE = 20

// 랭킹: 찜·별점·최근 30일 판매량을 합친 순위 · 특가: 할인 중인 상품을 할인율 높은 순
const CONFIG: Record<ProductTab, { title: string; sort: ProductSort; discounted?: boolean }> = {
  ranking: { title: '지금 많이 찾는 상품', sort: 'POPULAR' },
  sale: { title: '기간 한정 특가', sort: 'DISCOUNT_RATE', discounted: true },
  new: { title: '새로 들어온 상품', sort: 'LATEST' },
  all: { title: '전체 상품', sort: 'LATEST' },
}

/** 추천 외 탭의 내용 */
export function HomeTabList({ tab }: { tab: Exclude<HomeTab, 'recommend'> }) {
  if (tab === 'exhibition') return <ExhibitionTabView />
  return <ProductTabList tab={tab} />
}

function ProductTabList({ tab }: { tab: ProductTab }) {
  const { title, sort: tabSort, discounted } = CONFIG[tab]
  const [params, setParams] = useSearchParams()
  const sorts = tab === 'all' ? ALL_SORTS : null
  /** 서버에 보낼 정렬. 전체 탭은 고른 정렬, 나머지는 탭마다 정해진 정렬이에요. */
  const sort: ProductSort = sorts?.find((o) => o.value === params.get('sort'))?.value ?? tabSort
  // '더 보기'는 이 자리에서 다음 페이지를 이어 붙여요. 탭·정렬이 바뀌면 1페이지부터예요.
  const key = `${tab}|${sort}`
  const [pager, setPager] = useState({ key, page: 0 })
  const page = pager.key === key ? pager.page : 0
  const res = useApi(() => loadProducts({ sort, discounted, size: LIST_SIZE, page }), [key, page])
  const [acc, setAcc] = useState<{ key: string; items: ProductSummary[] }>({ key, items: [] })
  useEffect(() => {
    if (!res.data) return
    const next = res.data.items
    setAcc((prev) => (page === 0 || prev.key !== key ? { key, items: next } : { key, items: [...prev.items, ...next] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data])
  const hasMore = !!res.data && page + 1 < res.data.totalPages
  const changeSort = (v: string) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        if (v === 'LATEST') p.delete('sort')
        else p.set('sort', v)
        return p
      },
      { replace: true },
    )
  const wishes = useWishes()

  const items = acc.key === key ? acc.items : []

  return (
    <section aria-label={title} className={styles.tabSec}>
      <div className={`${styles.secPad} ${styles.tabHead}`}>
        <h2 className={styles.h2}>{title}</h2>
        {sorts && (
          <label className={styles.sort}>
            <Icon name="filter" size={16} />
            <span className={styles.sr}>정렬</span>
            <select value={sort} onChange={(e) => changeSort(e.target.value)}>
              {sorts.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {res.data?.example && <ExampleNotice />}
      {res.loading && items.length === 0 && <Loading />}
      {res.error && page === 0 && <ErrorView message={res.error} onRetry={res.reload} />}
      {wishes.error && (
        <p role="alert" className={styles.tabDesc}>
          {wishes.error}
        </p>
      )}
      {!res.loading && !res.error && res.data && items.length === 0 && (
        <Empty
          title={tab === 'sale' ? '지금 할인 중인 상품이 없어요' : '아직 상품이 없어요'}
          action={
            tab !== 'all' && (
              <Button variant="outline" size="sm" to="/?tab=all">
                전체 상품 보기
              </Button>
            )
          }
        />
      )}
      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((p, i) => (
            <ProductCard
              key={p.productId}
              p={p}
              wished={wishes.has(p.productId)}
              onWish={() => wishes.toggle(p.productId)}
              badge={tab === 'ranking' ? <span className={styles.rank}>{i + 1}</span> : undefined}
            />
          ))}
        </div>
      )}
      {hasMore && (
        <div className={styles.tabMore}>
          <Button variant="outline" disabled={res.loading} onClick={() => setPager({ key, page: page + 1 })}>
            {res.loading ? '불러오는 중이에요' : '더 보기'}
          </Button>
        </div>
      )}
      {res.error && page > 0 && <ErrorView message={res.error} onRetry={res.reload} />}
    </section>
  )
}
