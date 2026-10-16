import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCategories, searchProducts, type CategoryNode } from '../lib/api/product'
import { EXAMPLE_CATEGORIES, isServerUnreachable, searchExampleProducts } from '../lib/exampleProducts'
import { categoryIcon } from '../lib/products'
import styles from './CategoryMenu.module.css'

/** 마우스가 메뉴 밖으로 나간 뒤 닫히기까지 (대각선으로 옮길 때 깜빡이지 않게) */
const CLOSE_DELAY = 150

// 카테고리 트리와 소분류별 상품 수는 페이지를 옮겨도 다시 부르지 않도록 모듈에 보관해요.
let treeCache: Promise<CategoryNode[]> | null = null
const countCache = new Map<number, Promise<number>>()

function loadTree() {
  treeCache ??= getCategories().catch((e) => {
    treeCache = null
    if (isServerUnreachable(e)) return EXAMPLE_CATEGORIES
    throw e
  })
  return treeCache
}

/**
 * 소분류의 상품 수. 카테고리 API에 개수가 없어서 상품 검색의 totalElements로 세요. (품절 포함)
 * 백엔드 카테고리 트리에 productCount가 생기면 이 함수만 바꾸면 돼요.
 */
function loadCount(categoryId: number) {
  let p = countCache.get(categoryId)
  if (!p) {
    const query = { categoryId, size: 1, excludeSoldOut: false }
    p = searchProducts(query)
      .then((r) => r.totalElements)
      .catch((e) => {
        countCache.delete(categoryId)
        if (isServerUnreachable(e)) return searchExampleProducts(query).totalElements
        throw e
      })
    countCache.set(categoryId, p)
  }
  return p
}

/** 헤더의 "전체 카테고리" 메뉴. 마우스를 올리거나 누르면 대분류·소분류 패널이 열려요. */
export default function CategoryMenu() {
  const [tree, setTree] = useState<CategoryNode[]>([])
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [counts, setCounts] = useState<Record<number, number>>({})
  const closeTimer = useRef<number | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    loadTree()
      .then((t) => alive && setTree(t))
      .catch(() => {}) // 카테고리를 못 불러오면 패널만 비어 보여요
    return () => {
      alive = false
    }
  }, [])

  const active = tree.find((g) => g.categoryId === activeId) ?? tree[0]

  // 패널이 열리고 대분류가 정해지면 그 소분류들의 상품 수를 불러와요.
  useEffect(() => {
    if (!open || !active) return
    let alive = true
    for (const c of active.children) {
      if (counts[c.categoryId] !== undefined) continue
      loadCount(c.categoryId)
        .then((n) => alive && setCounts((s) => ({ ...s, [c.categoryId]: n })))
        .catch(() => {})
    }
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active?.categoryId])

  // Esc로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hideSoon = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY)
  }
  const close = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
      onBlur={(e) => {
        // 메뉴 밖으로 포커스가 나가면 닫아요 (키보드 사용)
        if (!rootRef.current?.contains(e.relatedTarget as Node)) close()
      }}
    >
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOn : ''}`}
        aria-expanded={open}
        aria-controls="category-panel"
        onClick={() => (open ? close() : show())}
        onFocus={show}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        전체 카테고리
      </button>

      {open && tree.length > 0 && active && (
        <div id="category-panel" className={styles.panel}>
          <ul className={styles.groups} role="list">
            {tree.map((g) => {
              const on = g.categoryId === active.categoryId
              return (
                <li key={g.categoryId}>
                  <Link
                    to={`/?category=${g.categoryId}`}
                    className={`${styles.group} ${on ? styles.groupOn : ''}`}
                    aria-current={on ? 'true' : undefined}
                    onMouseEnter={() => setActiveId(g.categoryId)}
                    onFocus={() => setActiveId(g.categoryId)}
                    onClick={close}
                  >
                    {g.name}
                    <span aria-hidden="true" className={styles.chevron}>
                      ›
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className={styles.body}>
            <h2 className={styles.title}>{active.name}</h2>
            <ul className={styles.grid} role="list">
              {active.children.map((c) => {
                const n = counts[c.categoryId]
                const empty = n === 0
                return (
                  <li key={c.categoryId}>
                    <Link to={`/?category=${c.categoryId}`} className={styles.card} onClick={close}>
                      <span className={styles.icon}>
                        <img src={categoryIcon(c.name, active.name)} alt="" />
                      </span>
                      <span className={styles.cardText}>
                        <span className={styles.cardName}>{c.name}</span>
                        <span className={styles.cardSub}>
                          {n === undefined ? ' ' : empty ? '준비 중' : `상품 ${n.toLocaleString('ko-KR')}개`}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>

            <div className={styles.banner}>
              <div>
                <strong className={styles.bannerTitle}>{active.name} 전체 보기</strong>
                <p className={styles.bannerSub}>{active.name}의 모든 상품을 최신순으로 모아봤어요</p>
              </div>
              <Link to={`/?category=${active.categoryId}`} className={styles.bannerBtn} onClick={close}>
                보러 가기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
