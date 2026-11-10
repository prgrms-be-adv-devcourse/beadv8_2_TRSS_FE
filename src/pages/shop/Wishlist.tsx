import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { errorMessage } from '../../lib/api'
import { getWishlist, removeWishlist, type WishlistItem } from '../../lib/api/wishlist'
import { useApi } from '../../lib/useApi'
import { HeartButton, imageOf } from './common'
import styles from './Wishlist.module.css'

const PAGE_SIZE = 20
/** 찜은 최대 200개까지 */
const WISH_MAX = 200

/** ⑭ 찜 (최근에 찜한 순) */
export default function WishlistPage() {
  const [page, setPage] = useState(0)
  const res = useApi(() => getWishlist({ page, size: PAGE_SIZE }), [page])
  const [items, setItems] = useState<WishlistItem[]>([])
  const [removed, setRemoved] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!res.data) return
    const next = res.data.items
    setItems((prev) => {
      if (page === 0) return next
      const seen = new Set(prev.map((i) => i.productId))
      return [...prev, ...next.filter((i) => !seen.has(i.productId))]
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data])

  const total = Math.max(0, (res.data?.totalElements ?? 0) - removed)
  const hasMore = !!res.data && page + 1 < res.data.totalPages

  const remove = async (productId: number) => {
    const before = items
    setItems((list) => list.filter((i) => i.productId !== productId))
    setRemoved((n) => n + 1)
    setError('')
    try {
      await removeWishlist(productId)
    } catch (e) {
      setItems(before)
      setRemoved((n) => n - 1)
      setError(errorMessage(e))
    }
  }

  return (
    <AppFrame>
      <PageHeader back="/mypage" title="찜" />

      {res.loading && !res.data && <Loading />}
      {res.error && page === 0 && <ErrorView message={res.error} onRetry={res.reload} />}

      {res.data && (
        <p className={styles.bar}>
          <span>최근에 찜한 순</span>
          <span>
            {total} / {WISH_MAX}개
          </span>
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {res.data && items.length === 0 && (
        <Empty title="찜한 상품이 없어요" action={<Button to="/products" variant="outline" size="sm">상품 둘러보기</Button>}>
          마음에 드는 상품의 하트를 눌러 모아 보세요.
        </Empty>
      )}

      <ul className={styles.grid}>
        {items.map((p) => {
          const blocked = !p.available
          return (
            <li key={p.productId}>
              <div className={styles.imgBox}>
                {blocked ? (
                  <span className={styles.img}>
                    <Thumb src={imageOf(p)} width="100%" height="100%" radius={8} />
                  </span>
                ) : (
                  <Link to={`/product/${p.productId}`} className={styles.img}>
                    <Thumb src={imageOf(p)} width="100%" height="100%" radius={8} />
                  </Link>
                )}
                {blocked ? (
                  <span className={styles.dim}>구매할 수 없는 상품</span>
                ) : (
                  p.soldOut && <span className={styles.dim}>품절</span>
                )}
                <HeartButton on onClick={() => remove(p.productId)} className={styles.heart} />
              </div>
              <p className={`${styles.name} ${blocked ? styles.muted : ''}`}>{p.name}</p>
              <p className={`${styles.price} ${blocked ? styles.muted : ''}`}>{won(p.price)}</p>
              {blocked && (
                <button type="button" className={styles.removeBtn} onClick={() => remove(p.productId)}>
                  찜에서 지우기
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <div className={styles.more}>
          <Button variant="outline" disabled={res.loading} onClick={() => setPage((p) => p + 1)}>
            {res.loading ? '불러오는 중이에요' : '더 보기'}
          </Button>
        </div>
      )}
      {res.error && page > 0 && <ErrorView message={res.error} onRetry={res.reload} />}
    </AppFrame>
  )
}
