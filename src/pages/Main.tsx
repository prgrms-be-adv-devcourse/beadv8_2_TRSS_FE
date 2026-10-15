import { Link, useSearchParams } from 'react-router-dom'
import { makeCx, won } from '../lib/ui'
import styles from './Main.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useEffect, useState, type FormEvent } from 'react'
import { toPageParam } from '../lib/api'
import {
  getCategories,
  searchProducts,
  type CategoryNode,
  type ProductSearchQuery,
  type ProductSort,
} from '../lib/api/product'
import { useApi } from '../lib/useApi'
import { categoryIcon } from '../lib/products'
import { EXAMPLE_CATEGORIES, isServerUnreachable, searchExampleProducts } from '../lib/exampleProducts'

const SORTS: Array<{ value: ProductSort; label: string }> = [
  { value: 'LATEST', label: '최신순' },
  { value: 'PRICE_ASC', label: '낮은 가격순' },
  { value: 'PRICE_DESC', label: '높은 가격순' },
]
/** 인기 검색어 API가 없어 고정값이에요. */
const POPULAR_KEYWORDS = ['선크림', '쿠션', '세럼', '티셔츠', '스니커즈']
const PAGE_SIZE = 20
/** 페이지 번호를 한 번에 몇 개까지 보여줄지 */
const PAGE_WINDOW = 5

const cx = makeCx(styles)

/** 카테고리 ID → 이름과 대분류. 대분류는 자기 자신이 대분류예요. */
function indexCategories(tree: CategoryNode[]) {
  const byId = new Map<number, { name: string; parentId: number; parentName: string }>()
  for (const g of tree) {
    byId.set(g.categoryId, { name: g.name, parentId: g.categoryId, parentName: g.name })
    for (const c of g.children) byId.set(c.categoryId, { name: c.name, parentId: g.categoryId, parentName: g.name })
  }
  return byId
}

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * 검색 조건은 URL 쿼리(q, category, sort, soldOut, page)에 두어서 뒤로 가기·새로고침해도 유지돼요.
 */
function useMainView() {
  const [params, setParams] = useSearchParams()
  const keyword = params.get('q') ?? ''
  const categoryId = Number(params.get('category')) || undefined
  const sort = SORTS.find((s) => s.value === params.get('sort'))?.value ?? 'LATEST'
  const excludeSoldOut = params.get('soldOut') !== 'show'
  const page = Math.max(1, Number(params.get('page')) || 1)

  /** 쿼리 일부를 바꿔요. 값이 없으면 지우고, 조건이 바뀌면 1페이지로 돌아가요. */
  const update = (next: Record<string, string | undefined>, keepPage = false) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v)
        else p.delete(k)
      }
      if (!keepPage) p.delete('page')
      return p
    })
  }

  const [input, setInput] = useState(keyword)
  useEffect(() => setInput(keyword), [keyword])

  // 백엔드에 닿지 못하면 프론트 전용 예시 데이터로 대신 보여줘요. (lib/exampleProducts.ts)
  const categories = useApi(
    () => getCategories().catch((e) => (isServerUnreachable(e) ? EXAMPLE_CATEGORIES : Promise.reject(e))),
    [],
  )
  const products = useApi(() => {
    const query: ProductSearchQuery = {
      keyword: keyword || undefined,
      categoryId,
      sort,
      excludeSoldOut,
      page: toPageParam(page),
      size: PAGE_SIZE,
    }
    return searchProducts(query).then(
      (r) => ({ ...r, example: false }),
      (e) => (isServerUnreachable(e) ? { ...searchExampleProducts(query), example: true } : Promise.reject(e)),
    )
  }, [keyword, categoryId, sort, excludeSoldOut, page])

  const tree = categories.data ?? []
  const categoryById = indexCategories(tree)
  const selected = categoryId ? categoryById.get(categoryId) : undefined
  const selectedParentId = selected?.parentId

  /** 소분류가 펼쳐진 대분류. 한 번에 하나만 펼쳐요. */
  const [openId, setOpenId] = useState<number | null>(null)
  // 고른 카테고리의 대분류가 바뀌면(뒤로 가기·새로고침 포함) 그 대분류를 펼쳐요.
  useEffect(() => setOpenId(selectedParentId ?? null), [selectedParentId])

  const parents = tree.map((g) => ({
    id: g.categoryId,
    name: g.name,
    icon: categoryIcon(g.name),
    on: selectedParentId === g.categoryId,
    open: openId === g.categoryId,
    /** 펼쳐져 있으면 접고, 아니면 펼치면서 그 대분류 전체를 보여줘요. 이미 그 대분류 안을 보고 있으면 펼치기만 해요. */
    toggle: () => {
      if (openId === g.categoryId) return setOpenId(null)
      setOpenId(g.categoryId)
      if (selectedParentId !== g.categoryId) update({ category: String(g.categoryId) })
    },
  }))

  const openGroup = tree.find((g) => g.categoryId === openId)
  const subs = openGroup && {
    label: openGroup.name,
    items: [{ categoryId: openGroup.categoryId, name: `${openGroup.name} 전체` }, ...openGroup.children].map((c) => ({
      id: c.categoryId,
      name: c.name,
      icon: categoryIcon(c.categoryId === openGroup.categoryId ? openGroup.name : c.name, openGroup.name),
      on: c.categoryId === categoryId,
      pick: () => update({ category: String(c.categoryId) }),
    })),
  }

  const result = products.data
  const items = (result?.items ?? []).map((p) => {
    const cat = categoryById.get(p.categoryId)
    return {
      id: p.productId,
      shop: p.businessName,
      name: p.name,
      // 이미지 기능 전까지 thumbnailUrl이 없어서 카테고리 대표 아이콘을 보여줘요.
      img: p.thumbnailUrl ?? categoryIcon(cat?.name ?? '', cat?.parentName),
      icon: !p.thumbnailUrl,
      price: won(p.price),
      soldOut: p.soldOut,
      remaining: p.remainingStock,
    }
  })

  const totalPages = result?.totalPages ?? 0
  const start = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1))
  const pageNumbers = Array.from(
    { length: Math.max(0, Math.min(PAGE_WINDOW, totalPages - start + 1)) },
    (_, i) => start + i,
  )
  const goPage = (n: number) => {
    update({ page: n > 1 ? String(n) : undefined }, true)
    window.scrollTo(0, 0)
  }

  const view = {
    input,
    changeInput: (e: { target: { value: string } }) => setInput(e.target.value),
    submitSearch: (e: FormEvent) => {
      e.preventDefault()
      update({ q: input.trim() || undefined })
    },
    popular: POPULAR_KEYWORDS.map((k) => ({ label: k, pick: () => update({ q: k }) })),
    parents,
    subs,
    allOn: !categoryId,
    pickAll: () => update({ category: undefined }),
    title: selected?.name ?? (keyword ? `‘${keyword}’ 검색 결과` : '전체 상품'),
    count: result?.totalElements ?? 0,
    hideSoldOut: excludeSoldOut,
    toggleSold: () => update({ soldOut: excludeSoldOut ? 'show' : undefined }),
    sorts: SORTS.map((s) => ({
      label: s.label,
      on: s.value === sort,
      cls: s.value === sort ? 'btn btn-on' : 'btn',
      pick: () => update({ sort: s.value === 'LATEST' ? undefined : s.value }),
    })),
    items,
    example: !!result?.example,
    loading: products.loading,
    firstLoad: products.loading && !result,
    error: products.error,
    retry: products.reload,
    empty: !products.loading && !products.error && !!result && items.length === 0,
    emptyTitle: keyword ? `‘${keyword}’에 맞는 상품이 없어요` : '이 카테고리에는 지금 살 수 있는 상품이 없어요',
    emptySub: keyword
      ? '다른 검색어로 찾아보거나 전체 상품을 둘러보세요.'
      : '품절 상품을 함께 보거나 전체 카테고리에서 찾아보세요.',
    resetAll: () => setParams(new URLSearchParams()),
    showPager: totalPages > 1,
    pages: pageNumbers.map((n) => ({ n, on: n === page, go: () => goPage(n) })),
    hasPrev: page > 1,
    hasNext: page < totalPages,
    prev: () => goPage(page - 1),
    next: () => goPage(page + 1),
  }
  return view
}

/** 상품 목록 */
export default function MainPage() {
  const view = useMainView()
  const {
    allOn,
    changeInput,
    count,
    empty,
    emptySub,
    emptyTitle,
    error,
    example,
    firstLoad,
    hasNext,
    hasPrev,
    hideSoldOut,
    input,
    items,
    loading,
    next,
    pages,
    parents,
    pickAll,
    popular,
    prev,
    resetAll,
    retry,
    showPager,
    sorts,
    subs,
    submitSearch,
    title,
    toggleSold,
  } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader compact />
        <section
          aria-label="검색과 카테고리"
          className={cx('disc')}
          style={{ borderBottom: '1px solid #E8E8ED', backgroundColor: '#ffffff', width: '100%' }}
        >
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              padding: '28px 24px 28px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            <div className={cx('panel2')}>
              <form className={cx('search')} role="search" onSubmit={submitSearch}>
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5F5F6A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
                <input
                  aria-label="상품 검색"
                  placeholder="찾는 상품 이름을 입력해 주세요"
                  value={input}
                  onChange={changeInput}
                  maxLength={100}
                />
                <button type="submit" style={{ backgroundColor: '#26262c' }}>
                  검색
                </button>
              </form>
              <div className={cx('pop')}>
                <span className={cx('pop-label')}>인기 검색어</span>
                {popular.map((k) => (
                  <button type="button" className={cx('kw')} onClick={k.pick} key={k.label}>
                    {k.label}
                  </button>
                ))}
              </div>
              <div className={cx('cats')}>
                <div className={cx('cat-row')} role="group" aria-label="카테고리">
                  <button className={cx('cat all', allOn && 'cat-on')} onClick={pickAll} aria-pressed={allOn}>
                    <span className={cx('ico')}>ALL</span>
                    <span>전체</span>
                  </button>
                  {parents.map((g) => (
                    <button
                      className={cx('cat', g.on && 'cat-on')}
                      onClick={g.toggle}
                      aria-expanded={g.open}
                      aria-controls="subcats"
                      key={g.id}
                    >
                      <span className={cx('ico')}>
                        <img src={g.icon} alt="" />
                      </span>
                      <span className={cx('cat-name')}>
                        {g.name}
                        <svg
                          className={cx('chev', g.open && 'chev-open')}
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
                {subs && (
                  <div className={cx('subcats')} id="subcats" role="group" aria-label={`${subs.label} 소분류`}>
                    {subs.items.map((c) => (
                      <button
                        className={cx('cat subcat', c.on && 'cat-on')}
                        onClick={c.pick}
                        aria-pressed={c.on}
                        key={c.id}
                      >
                        <span className={cx('ico')}>
                          <img src={c.icon} alt="" />
                        </span>
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        <main
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '32px 24px 56px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px 24px',
            }}
          >
            <h1
              style={{
                margin: '0',
                fontSize: '30px',
                fontWeight: '700',
                letterSpacing: '-0.8px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
              }}
            >
              {title}
              {!firstLoad && !error && (
                <span className={cx('num')} style={{ fontSize: '16px', fontWeight: '500', color: '#5F5F6A' }}>
                  {count.toLocaleString('ko-KR')}개
                </span>
              )}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px' }}>
              <label className={cx('tog')}>
                <input type="checkbox" checked={hideSoldOut} onChange={toggleSold} />
                품절 상품 빼고 보기
              </label>
              <div role="group" aria-label="정렬" style={{ display: 'flex', gap: '2px' }}>
                {sorts.map((s) => (
                  <button
                    className={cx(s.cls)}
                    onClick={s.pick}
                    aria-pressed={s.on}
                    style={{ fontSize: '14px', minHeight: '40px' }}
                    key={s.label}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {example && (
            <p className={cx('example')} role="status">
              백엔드 서버에 연결되지 않아 <strong>프론트 예시 상품</strong>을 보여주고 있어요. 서버를 켜면 실제 상품이
              보여요.
            </p>
          )}
          {error && (
            <div className={cx('notice')} role="alert">
              <strong style={{ fontSize: '17px', fontWeight: '700' }}>상품을 불러오지 못했어요</strong>
              <span className={cx('sub')}>{error}</span>
              <button className={cx('btn btn-on')} onClick={retry}>
                다시 시도
              </button>
            </div>
          )}
          {firstLoad && (
            <div className={cx('notice')} aria-live="polite">
              <span className={cx('sub')}>상품을 불러오고 있어요</span>
            </div>
          )}
          {empty && (
            <div className={cx('notice')}>
              <strong style={{ fontSize: '17px', fontWeight: '700' }}>{emptyTitle}</strong>
              <span className={cx('sub')}>{emptySub}</span>
              <button className={cx('btn btn-on')} onClick={resetAll}>
                전체 상품 보기
              </button>
            </div>
          )}
          {!error && (
            <div
              aria-busy={loading}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                gap: '32px 20px',
                opacity: loading ? 0.5 : 1,
                transition: 'opacity .2s',
              }}
            >
              {items.map((p) => (
                <Link className={cx('card')} to={`/product/${p.id}`} key={p.id}>
                  <div className={cx('tile')}>
                    <img src={p.img} alt="" className={cx(p.icon ? 'tile-icon' : 'tile-img')} />
                    {p.remaining != null && (
                      <span className={cx('chip c-low')} style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        {p.remaining}개 남았어요
                      </span>
                    )}
                    {p.soldOut && (
                      <div
                        style={{
                          position: 'absolute',
                          inset: '0',
                          background: 'rgba(255,255,255,.66)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          className={cx('chip c-mute')}
                          style={{ fontSize: '13px', minHeight: '28px', padding: '0 12px' }}
                        >
                          품절
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={cx('label')}>
                    <span className={cx('sub')} style={{ fontWeight: '500' }}>
                      {p.shop}
                    </span>
                    <span style={{ fontSize: '15px', lineHeight: '1.45', minHeight: '44px' }}>{p.name}</span>
                    <strong
                      className={cx('num')}
                      style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.3px', paddingTop: '4px' }}
                    >
                      {p.price}원
                    </strong>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {showPager && !error && (
            <nav
              aria-label="페이지"
              style={{ display: 'flex', justifyContent: 'center', gap: '4px', paddingTop: '16px' }}
            >
              <button className={cx('btn')} onClick={prev} disabled={!hasPrev} aria-label="이전 페이지">
                ‹
              </button>
              {pages.map((pg) => (
                <button
                  className={cx(pg.on ? 'btn btn-on' : 'btn')}
                  onClick={pg.go}
                  aria-current={pg.on ? 'page' : undefined}
                  key={pg.n}
                >
                  {pg.n}
                </button>
              ))}
              <button className={cx('btn')} onClick={next} disabled={!hasNext} aria-label="다음 페이지">
                ›
              </button>
            </nav>
          )}
        </main>
      </div>
    </div>
  )
}
