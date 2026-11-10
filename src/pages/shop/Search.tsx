import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import { ErrorView, Loading } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { categoryIcon } from '../../lib/products'
import { loadCategories } from './common'
import { MOCK_TRENDING } from './mock'
import styles from './Search.module.css'

const RECENT_KEY = 'palette.recentSearches'
const RECENT_MAX = 10

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, RECENT_MAX) : []
  } catch {
    return []
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)는 최근 검색어 없이 동작
  }
}

/** 지금 시각 정각 기준 문구: "11.10 14:00 기준" */
function trendingAt() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:00 기준`
}

/**
 * 검색 (홈 검색창·검색 아이콘에서 들어와요)
 * - 검색어를 입력하면 상품 목록(/products?q=)으로
 * - 입력 전에는 최근 검색어 · 인기 급상승 검색어 · 카테고리를 보여줘요
 */
export default function SearchPage() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [recent, setRecent] = useState<string[]>(readRecent)
  const categories = useApi(loadCategories, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const go = (q: string) => {
    const word = q.trim()
    if (!word) return
    const next = [word, ...recent.filter((r) => r !== word)].slice(0, RECENT_MAX)
    setRecent(next)
    writeRecent(next)
    navigate(`/products?q=${encodeURIComponent(word)}`)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    go(keyword)
  }
  const removeRecent = (word: string) => {
    const next = recent.filter((r) => r !== word)
    setRecent(next)
    writeRecent(next)
  }
  const clearRecent = () => {
    setRecent([])
    writeRecent([])
  }
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))

  return (
    <AppFrame>
      <header className={styles.header}>
        <button type="button" aria-label="뒤로" className={styles.iconBtn} onClick={back}>
          <Icon name="back" />
        </button>
        <h1 className="sr-only">검색</h1>
        <form role="search" onSubmit={submit} className={styles.form}>
          <label className={styles.field}>
            <Icon name="search" size={18} strokeWidth={2} />
            <input
              ref={inputRef}
              type="search"
              enterKeyHint="search"
              aria-label="상품 검색"
              placeholder="브랜드나 상품을 검색해 보세요"
              maxLength={100}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button type="button" aria-label="검색어 지우기" className={styles.clear} onClick={() => setKeyword('')}>
                <Icon name="close" size={14} strokeWidth={2.4} />
              </button>
            )}
          </label>
        </form>
      </header>

      {recent.length > 0 && (
        <section aria-labelledby="search-recent" className={styles.sec}>
          <div className={styles.secHead}>
            <h2 id="search-recent">최근 검색어</h2>
            <button type="button" className={styles.textBtn} onClick={clearRecent}>
              전체 삭제
            </button>
          </div>
          <ul className={styles.recent}>
            {recent.map((r) => (
              <li key={r} className={styles.recentChip}>
                <button type="button" className={styles.recentWord} onClick={() => go(r)}>
                  {r}
                </button>
                <button
                  type="button"
                  aria-label={`${r} 삭제`}
                  className={styles.recentDel}
                  onClick={() => removeRecent(r)}
                >
                  <Icon name="close" size={12} strokeWidth={2.4} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="search-trending" className={styles.sec}>
        <div className={styles.secHead}>
          <h2 id="search-trending">인기 급상승 검색어</h2>
          <span className={styles.at}>{trendingAt()}</span>
        </div>
        {/* TODO(API 미구현): GET /api/v1/search/trending — 인기 급상승 검색어(순위·변동). 지금은 목업 */}
        <ol className={styles.trending}>
          {MOCK_TRENDING.map((t, i) => (
            <li key={t.word}>
              <button type="button" className={styles.trendItem} onClick={() => go(t.word)}>
                <span className={`${styles.rank} ${i < 3 ? styles.rankTop : ''}`}>{i + 1}</span>
                <span className={styles.trendWord}>{t.word}</span>
                {t.change === 'new' ? (
                  <span className={styles.new}>NEW</span>
                ) : t.change > 0 ? (
                  <span className={styles.up} aria-label={`${t.change}계단 상승`}>
                    ▲{t.change}
                  </span>
                ) : t.change < 0 ? (
                  <span className={styles.down} aria-label={`${-t.change}계단 하락`}>
                    ▼{-t.change}
                  </span>
                ) : (
                  <span className={styles.same} aria-label="변동 없음">
                    –
                  </span>
                )}
              </button>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="search-category" className={`${styles.sec} ${styles.lastSec}`}>
        <div className={styles.secHead}>
          <h2 id="search-category">카테고리</h2>
          <Link to="/category" className={styles.textBtn}>
            전체 보기 ›
          </Link>
        </div>
        {categories.loading && !categories.data && <Loading />}
        {categories.error && <ErrorView message={categories.error} onRetry={categories.reload} />}
        {(categories.data ?? []).map((g) => (
          <div key={g.categoryId} className={styles.group}>
            <Link to={`/products?categoryId=${g.categoryId}`} className={styles.groupName}>
              {g.name}
              <Icon name="chevron" size={14} strokeWidth={2} />
            </Link>
            <div className={styles.cats}>
              {g.children.map((c) => (
                <Link key={c.categoryId} to={`/products?categoryId=${c.categoryId}`} className={styles.cat}>
                  <span className={styles.catIcon}>
                    <img src={categoryIcon(c.name, g.name)} alt="" />
                  </span>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </section>
    </AppFrame>
  )
}
