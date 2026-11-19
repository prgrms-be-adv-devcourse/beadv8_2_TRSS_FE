import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import { usePopularKeywords } from './common'
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

/** 순위 변동은 한 시간 전 순위와 비교해서, 지금 시각 정각 기준 문구로 보여 줘요: "11.10 14:00 기준" */
function trendingAt() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:00 기준`
}

/**
 * 검색 (홈 검색창·검색 아이콘에서 들어와요)
 * - 검색어를 입력하면 상품 목록(/products?q=)으로
 * - 입력 전에는 최근 검색어 · 인기 검색어를 보여줘요
 */
export default function SearchPage() {
  return (
    <AppFrame>
      <SearchView />
    </AppFrame>
  )
}

/**
 * 홈 검색창을 누르면 위에서 내려오는 반 높이 검색 패널
 * - 바깥(어두운 부분)을 누르거나 Esc, 닫기 버튼으로 닫혀요
 */
export function SearchPanel({ onClose }: { onClose: () => void }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      cancelAnimationFrame(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])
  return (
    <div className={`${styles.backdrop} ${shown ? styles.open : ''}`} onClick={onClose}>
      <div className={styles.col}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="검색"
          className={styles.panel}
          onClick={(e) => e.stopPropagation()}
        >
          <SearchView onClose={onClose} />
        </div>
      </div>
    </div>
  )
}

/** 검색 내용 (전체 화면 /search 와 홈 반 높이 패널이 같이 써요) */
function SearchView({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [keyword, setKeyword] = useState('')
  const [recent, setRecent] = useState<string[]>(readRecent)
  const popular = usePopularKeywords()

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
  const back = onClose ?? (() => (window.history.length > 1 ? navigate(-1) : navigate('/')))

  return (
    <>
      <header className={styles.header}>
        <button type="button" aria-label={onClose ? '검색 닫기' : '뒤로'} className={styles.iconBtn} onClick={back}>
          <Icon name={onClose ? 'close' : 'back'} />
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
        {!onClose && (
          <Link to="/" aria-label="홈으로" className={styles.iconBtn}>
            <Icon name="home" />
          </Link>
        )}
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

      {popular.length > 0 && (
        <section aria-labelledby="search-trending" className={`${styles.sec} ${styles.lastSec}`}>
          <div className={styles.secHead}>
            <h2 id="search-trending">인기 검색어</h2>
            <span className={styles.at}>{trendingAt()}</span>
          </div>
          <ol className={styles.trending}>
            {popular.map((t) => (
              <li key={t.keyword}>
                <button type="button" className={styles.trendItem} onClick={() => go(t.keyword)}>
                  <span className={`${styles.rank} ${t.rank <= 3 ? styles.rankTop : ''}`}>{t.rank}</span>
                  <span className={styles.trendWord}>{t.keyword}</span>
                  {t.rankChange == null ? (
                    <span className={styles.new}>NEW</span>
                  ) : t.rankChange > 0 ? (
                    <span className={styles.up} aria-label={`${t.rankChange}계단 상승`}>
                      ▲{t.rankChange}
                    </span>
                  ) : t.rankChange < 0 ? (
                    <span className={styles.down} aria-label={`${-t.rankChange}계단 하락`}>
                      ▼{-t.rankChange}
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
      )}
    </>
  )
}
