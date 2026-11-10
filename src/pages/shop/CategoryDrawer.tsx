import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { ErrorView, Loading } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { loadCategories } from './common'
import styles from './CategoryDrawer.module.css'

/**
 * 홈 검색창 왼쪽 버튼으로 여는 카테고리 사이드바
 * - 왼쪽에서 밀려 나와요 (구매자 컬럼 폭 안에서)
 * - 왼쪽은 대분류, 오른쪽은 고른 대분류의 소분류 목록
 * - 바깥을 누르거나 Esc, 닫기 버튼으로 닫혀요
 */
export default function CategoryDrawer({ onClose }: { onClose: () => void }) {
  const categories = useApi(loadCategories, [])
  const tree = categories.data ?? []
  const [picked, setPicked] = useState<number | null>(null)
  const cur = tree.find((g) => g.categoryId === picked) ?? tree[0]
  const closeRef = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
    const t = requestAnimationFrame(() => setShown(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // 사이드바가 열려 있는 동안 뒤 화면은 스크롤되지 않게
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
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="cat-drawer-title"
          className={styles.panel}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.head}>
            <h2 id="cat-drawer-title">카테고리</h2>
            <button ref={closeRef} type="button" aria-label="닫기" className={styles.close} onClick={onClose}>
              <Icon name="close" />
            </button>
          </div>

          {categories.loading && !categories.data && <Loading />}
          {categories.error && <ErrorView message={categories.error} onRetry={categories.reload} />}

          {cur && (
            <div className={styles.body}>
              <nav aria-label="대분류" className={styles.groups}>
                {tree.map((g) => (
                  <button
                    key={g.categoryId}
                    type="button"
                    aria-current={g.categoryId === cur.categoryId ? 'true' : undefined}
                    className={`${styles.group} ${g.categoryId === cur.categoryId ? styles.groupOn : ''}`}
                    onClick={() => setPicked(g.categoryId)}
                  >
                    {g.name}
                  </button>
                ))}
              </nav>
              <ul aria-label={`${cur.name} 소분류`} className={styles.subs}>
                <li>
                  <Link to={`/products?categoryId=${cur.categoryId}`} className={`${styles.sub} ${styles.all}`}>
                    {cur.name} 전체
                    <Icon name="chevron" size={14} strokeWidth={2} />
                  </Link>
                </li>
                {cur.children.map((c) => (
                  <li key={c.categoryId}>
                    <Link to={`/products?categoryId=${c.categoryId}`} className={styles.sub}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.foot}>
            <Link to="/products?sort=LATEST" className={styles.footLink}>
              신상품
            </Link>
            <Link to="/wishlist" className={styles.footLink}>
              찜 목록
            </Link>
            <Link to="/recommend" className={styles.footLink}>
              맞춤 추천
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}
