import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import type { ProductSort, ProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { ExampleNotice, ProductCard, indexCategories, loadCategories, loadProducts, useWishes } from './common'
import styles from './ProductList.module.css'

const SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: 'LATEST', label: '최신순' },
  { value: 'PRICE_ASC', label: '낮은 가격순' },
  { value: 'PRICE_DESC', label: '높은 가격순' },
]
/** 인기 검색어 API가 없어 고정값이에요. */
const POPULAR_KEYWORDS = ['선크림', '쿠션', '세럼', '티셔츠', '스니커즈']
const PAGE_SIZE = 20

/**
 * ③ 상품 목록·검색
 * 조건은 URL 쿼리(q, categoryId, sort, soldOut)에 두어서 뒤로 가기·새로고침해도 유지돼요.
 */
export default function ProductListPage() {
  const [params, setParams] = useSearchParams()
  const keyword = params.get('q') ?? ''
  const categoryId = Number(params.get('categoryId')) || undefined
  const sort = SORTS.find((s) => s.value === params.get('sort'))?.value ?? 'LATEST'
  const excludeSoldOut = params.get('soldOut') !== 'show'

  const update = (next: Record<string, string | undefined>) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        return p
      },
      { replace: true },
    )

  const [input, setInput] = useState(keyword)
  useEffect(() => setInput(keyword), [keyword])
  const [searchOpen, setSearchOpen] = useState(!categoryId)

  const categories = useApi(loadCategories, [])
  const tree = categories.data ?? []
  const byId = indexCategories(tree)
  const selected = categoryId ? byId.get(categoryId) : undefined
  const group = selected ? tree.find((g) => g.categoryId === selected.parentId) : undefined

  // "더 보기"로 다음 페이지를 이어 붙여요. 조건이 바뀌면 1페이지부터
  const key = `${keyword}|${categoryId ?? ''}|${sort}|${excludeSoldOut}`
  const [pager, setPager] = useState({ key, page: 1 })
  const page = pager.key === key ? pager.page : 1
  const res = useApi(
    () => loadProducts({ keyword: keyword || undefined, categoryId, sort, excludeSoldOut, page: page - 1, size: PAGE_SIZE }),
    [key, page],
  )
  const [acc, setAcc] = useState<{ key: string; items: ProductSummary[] }>({ key, items: [] })
  useEffect(() => {
    if (!res.data) return
    const items = res.data.items
    setAcc((prev) => (page === 1 || prev.key !== key ? { key, items } : { key, items: [...prev.items, ...items] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data])
  const items = acc.key === key ? acc.items : []
  const total = res.data?.totalElements ?? 0
  const hasMore = !!res.data && page < res.data.totalPages

  const wishes = useWishes()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    update({ q: input.trim() || undefined })
  }

  const headerTitle = group?.name ?? (keyword ? '검색' : '전체 상품')
  const listTitle = selected ? selected.name : keyword ? `‘${keyword}’ 검색 결과` : '전체 상품'

  return (
    <AppFrame tab="home">
      <PageHeader
        back
        title={headerTitle}
        right={
          <button
            type="button"
            aria-label="검색"
            aria-expanded={searchOpen}
            className={styles.iconBtn}
            onClick={() => setSearchOpen((o) => !o)}
          >
            <Icon name="search" />
          </button>
        }
      />

      {searchOpen && (
        <div className={styles.searchBox}>
          <form role="search" className={styles.search} onSubmit={submit}>
            <Icon name="search" size={18} />
            <input
              aria-label="상품 검색"
              placeholder="찾는 상품 이름을 입력해 주세요"
              value={input}
              maxLength={100}
              autoFocus={!keyword && !categoryId}
              onChange={(e) => setInput(e.target.value)}
            />
            {input && (
              <button type="button" aria-label="검색어 지우기" className={styles.clear} onClick={() => setInput('')}>
                <Icon name="close" size={16} />
              </button>
            )}
          </form>
          {!keyword && (
            <div className={styles.popular}>
              <span>인기 검색어</span>
              {POPULAR_KEYWORDS.map((k) => (
                <button key={k} type="button" onClick={() => update({ q: k })}>
                  {k}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={styles.titleRow}>
        <h2 className={styles.title}>
          {listTitle} {res.data && <span className={styles.count}>{total.toLocaleString('ko-KR')}</span>}
        </h2>
        <label className={styles.sort}>
          <Icon name="filter" size={16} />
          <span className={styles.sr}>정렬</span>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === 'LATEST' ? undefined : e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="group" aria-label="필터" className={styles.chips}>
        {group && (
          <>
            <button
              type="button"
              aria-pressed={categoryId === group.categoryId}
              className={categoryId === group.categoryId ? styles.chipOn : styles.chip}
              onClick={() => update({ categoryId: String(group.categoryId) })}
            >
              전체
            </button>
            {group.children.map((c) => (
              <button
                key={c.categoryId}
                type="button"
                aria-pressed={categoryId === c.categoryId}
                className={categoryId === c.categoryId ? styles.chipOn : styles.chip}
                onClick={() => update({ categoryId: String(c.categoryId) })}
              >
                {c.name}
              </button>
            ))}
          </>
        )}
        {!group &&
          tree.map((g) => (
            <button
              key={g.categoryId}
              type="button"
              aria-pressed={false}
              className={styles.chip}
              onClick={() => update({ categoryId: String(g.categoryId) })}
            >
              {g.name}
            </button>
          ))}
        <button
          type="button"
          aria-pressed={!excludeSoldOut}
          className={!excludeSoldOut ? styles.chipOn : styles.chip}
          onClick={() => update({ soldOut: excludeSoldOut ? 'show' : undefined })}
        >
          품절 포함
        </button>
      </div>

      {res.data?.example && <ExampleNotice />}
      {wishes.error && (
        <p role="alert" className={styles.error}>
          {wishes.error}
        </p>
      )}

      {res.error && page === 1 && <ErrorView message={res.error} onRetry={res.reload} />}
      {res.loading && items.length === 0 && <Loading />}
      {!res.loading && !res.error && res.data && items.length === 0 && (
        <Empty
          title={keyword ? `‘${keyword}’에 맞는 상품이 없어요` : '지금 살 수 있는 상품이 없어요'}
          action={
            <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams())}>
              전체 상품 보기
            </Button>
          }
        >
          {keyword ? '다른 검색어로 찾아보거나 전체 상품을 둘러보세요.' : '품절 상품을 함께 보거나 다른 카테고리에서 찾아보세요.'}
        </Empty>
      )}

      {items.length > 0 && (
        <div className={styles.grid}>
          {items.map((p) => (
            <ProductCard
              key={p.productId}
              p={p}
              wished={wishes.has(p.productId)}
              onWish={() => wishes.toggle(p.productId)}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className={styles.more}>
          <Button
            variant="outline"
            disabled={res.loading}
            onClick={() => setPager({ key, page: page + 1 })}
          >
            {res.loading ? '불러오는 중이에요' : '더 보기'}
          </Button>
        </div>
      )}
      {res.error && page > 1 && <ErrorView message={res.error} onRetry={res.reload} />}
    </AppFrame>
  )
}
