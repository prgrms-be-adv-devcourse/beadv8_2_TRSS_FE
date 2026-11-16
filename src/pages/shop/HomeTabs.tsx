/**
 * 홈 헤더 탭(전체 · 랭킹 · 특가 · 신상 · 기획전 · 이벤트)의 내용. 추천 탭은 Home.tsx의 기존 섹션이에요.
 * 전체 탭만 오른쪽 위에서 정렬을 골라요 (URL 쿼리 sort).
 *
 * TODO(API 미구현): 판매량순·찜 많은순 정렬 — 백엔드 정렬이 없어 '준비 중'으로 막아 뒀어요.
 * TODO(API 미구현): 랭킹 — 랭킹 기준(집계 기간·점수)이 정해지지 않아 최신순으로 자리를 채워요.
 * TODO(API 미구현): 특가 — 할인 중인 상품만 거르는 검색 조건이 없어, 최근 상품을 받아 화면에서 할인 중인 것만 골라요.
 * TODO(API 미구현): 기획전 · 이벤트 — 백엔드에 기획전·이벤트 데이터가 없어 '준비 중' 안내만 보여요.
 */
import { Link, useSearchParams } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import Button from '../../components/ui/Button'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import type { ProductSort, ProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { ExampleNotice, ProductCard, loadProducts, useWishes } from './common'
import styles from './Home.module.css'

export type HomeTab = 'recommend' | 'ranking' | 'sale' | 'new' | 'all' | 'exhibition' | 'event'
/** 데이터가 아직 없어 안내만 보여 주는 탭 */
type PlaceholderTab = 'exhibition' | 'event'
type ProductTab = Exclude<HomeTab, 'recommend' | PlaceholderTab>

export const HOME_TABS: Array<{ key: HomeTab; label: string }> = [
  { key: 'recommend', label: '추천' },
  { key: 'all', label: '전체' },
  { key: 'ranking', label: '랭킹' },
  { key: 'sale', label: '특가' },
  { key: 'new', label: '신상' },
  { key: 'exhibition', label: '기획전' },
  { key: 'event', label: '이벤트' },
]

const PLACEHOLDER: Record<PlaceholderTab, { title: string; empty: string; desc: string }> = {
  exhibition: {
    title: '기획전',
    empty: '진행 중인 기획전이 없어요',
    desc: '주제별로 모은 상품전을 준비하고 있어요. 곧 만나요.',
  },
  event: {
    title: '이벤트',
    empty: '진행 중인 이벤트가 없어요',
    desc: '쿠폰·적립 같은 혜택 이벤트를 준비하고 있어요. 곧 만나요.',
  },
}

type SortOption = { value: string; label: string; disabled?: boolean }
/** 전체 탭 정렬. 판매량·찜은 백엔드 정렬이 생기면 열어요. */
const ALL_SORTS: SortOption[] = [
  { value: 'LATEST', label: '최신순' },
  { value: 'SALES', label: '판매량순 (준비 중)', disabled: true },
  { value: 'WISH', label: '찜 많은순 (준비 중)', disabled: true },
  { value: 'PRICE_ASC', label: '낮은 가격순' },
  { value: 'PRICE_DESC', label: '높은 가격순' },
]

/** 특가: 화면에서 거를 때 받아 오는 최근 상품 수 (백엔드 size 최대 50) */
const SALE_SCAN = 50
const LIST_SIZE = 20

const CONFIG: Record<ProductTab, { title: string; desc: string; size: number }> = {
  ranking: {
    title: '지금 많이 찾는 상품',
    desc: '랭킹 기준을 준비하고 있어요. 지금은 최신 등록순으로 보여요.',
    size: LIST_SIZE,
  },
  sale: { title: '기간 한정 특가', desc: '지금 할인 중인 상품이에요. 할인율이 높은 순서예요.', size: SALE_SCAN },
  new: { title: '새로 들어온 상품', desc: '최근에 등록된 순서예요.', size: LIST_SIZE },
  all: { title: '전체 상품', desc: '판매 중인 모든 상품이에요.', size: LIST_SIZE },
}

/** 추천 외 탭의 내용 */
export function HomeTabList({ tab }: { tab: Exclude<HomeTab, 'recommend'> }) {
  if (tab === 'exhibition' || tab === 'event') return <PlaceholderTabView tab={tab} />
  return <ProductTabList tab={tab} />
}

function PlaceholderTabView({ tab }: { tab: PlaceholderTab }) {
  const { title, empty, desc } = PLACEHOLDER[tab]
  return (
    <section aria-label={title} className={styles.tabSec}>
      <Empty
        title={empty}
        action={
          <Button variant="outline" size="sm" to="/?tab=sale">
            특가 상품 보기
          </Button>
        }
      >
        {desc}
      </Empty>
    </section>
  )
}

function ProductTabList({ tab }: { tab: ProductTab }) {
  const { title, desc, size } = CONFIG[tab]
  const [params, setParams] = useSearchParams()
  const sorts = tab === 'all' ? ALL_SORTS : null
  const sort = sorts?.find((o) => o.value === params.get('sort') && !o.disabled)?.value ?? 'LATEST'
  /** 서버에 보낼 정렬. 전체 탭만 고른 정렬, 나머지는 최신순이에요. */
  const apiSort: ProductSort = tab === 'all' ? (sort as ProductSort) : 'LATEST'
  const res = useApi(() => loadProducts({ sort: apiSort, size }), [tab, apiSort])
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

  const all = res.data?.items ?? []
  const items: ProductSummary[] =
    tab === 'sale'
      ? all.filter((p) => p.salePrice != null).sort((a, b) => (b.discountRate ?? 0) - (a.discountRate ?? 0))
      : all

  return (
    <section aria-label={title} className={styles.tabSec}>
      <div className={`${styles.secPad} ${styles.tabHead}`}>
        <div>
          <h2 className={styles.h2}>{title}</h2>
          <p className={styles.tabDesc}>{desc}</p>
        </div>
        {sorts && (
          <label className={styles.sort}>
            <Icon name="filter" size={16} />
            <span className={styles.sr}>정렬</span>
            <select value={sort} onChange={(e) => changeSort(e.target.value)}>
              {sorts.map((o) => (
                <option key={o.value} value={o.value} disabled={o.disabled}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {res.data?.example && <ExampleNotice />}
      {res.loading && !res.data && <Loading />}
      {res.error && <ErrorView message={res.error} onRetry={res.reload} />}
      {wishes.error && (
        <p role="alert" className={styles.tabDesc}>
          {wishes.error}
        </p>
      )}
      {!res.loading && !res.error && res.data && items.length === 0 && (
        <Empty
          title={tab === 'sale' ? '지금 할인 중인 상품이 없어요' : '아직 상품이 없어요'}
          action={
            <Button variant="outline" size="sm" to="/products">
              전체 상품 보기
            </Button>
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
      {items.length > 0 && tab !== 'sale' && (
        <div className={styles.tabMore}>
          <Link to={tab === 'all' && sort !== 'LATEST' ? `/products?sort=${sort}` : '/products'}>
            {tab === 'all' ? '더 보기 ›' : '전체 상품 보기 ›'}
          </Link>
        </div>
      )}
    </section>
  )
}
