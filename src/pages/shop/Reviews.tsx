import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { errorMessage } from '../../lib/api'
import {
  REVIEW_SORT_LABEL,
  deleteReview,
  getMyReviews,
  getProductReviews,
  getReviewSummary,
  type ProductReview,
  type ReviewSort,
} from '../../lib/api/review'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import { Stars } from './common'
import styles from './Reviews.module.css'

const PAGE_SIZE = 20
const SORTS = Object.keys(REVIEW_SORT_LABEL) as ReviewSort[]
const fmtDate = (iso: string) => iso.slice(0, 10).replace(/-/g, '.')

/** ④-1 상품 리뷰 목록 */
export default function ReviewsPage() {
  const { productId: idParam } = useParams()
  const productId = Number(idParam)
  const { loggedIn } = useAuth()
  const [sort, setSort] = useState<ReviewSort>('LATEST')

  const summary = useApi(() => getReviewSummary(productId), [productId])

  // "더 보기"로 다음 페이지를 이어 붙여요. 정렬이 바뀌면 1페이지부터
  const key = `${productId}|${sort}`
  const [pager, setPager] = useState({ key, page: 0 })
  const page = pager.key === key ? pager.page : 0
  const list = useApi(() => getProductReviews(productId, { sort, page, size: PAGE_SIZE }), [key, page])
  const [acc, setAcc] = useState<{ key: string; items: ProductReview[] }>({ key, items: [] })
  useEffect(() => {
    if (!list.data) return
    const items = list.data.items
    setAcc((prev) => (page === 0 || prev.key !== key ? { key, items } : { key, items: [...prev.items, ...items] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data])
  const items = acc.key === key ? acc.items : []
  const hasMore = !!list.data && page + 1 < list.data.totalPages

  // 상품 리뷰 응답에 "내 리뷰" 표시가 없어서, 내 리뷰 목록(최근 100개)의 reviewId로 맞춰요.
  const mine = useApi(
    () => (loggedIn ? getMyReviews({ size: 100 }).then((r) => new Set(r.items.map((i) => i.reviewId))) : Promise.resolve(new Set<number>())),
    [loggedIn],
  )
  const [removing, setRemoving] = useState<ProductReview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const remove = async () => {
    if (!removing) return
    setBusy(true)
    setError('')
    try {
      await deleteReview(removing.reviewId)
      setAcc((prev) => ({ ...prev, items: prev.items.filter((r) => r.reviewId !== removing.reviewId) }))
      setRemoving(null)
      summary.reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const s = summary.data
  const count = s?.reviewCount ?? 0

  return (
    <AppFrame
      bottom={
        <BottomBar note="리뷰는 구매 확정한 주문에서 쓸 수 있어요">
          <Button to="/orders">리뷰 쓰기</Button>
        </BottomBar>
      }
    >
      <PageHeader back={`/product/${productId}`} title={`리뷰 ${count.toLocaleString('ko-KR')}`} />

      {summary.error && <ErrorView message={summary.error} onRetry={summary.reload} />}
      {s && (
        <section aria-label="평점 요약" className={styles.summary}>
          <div className={styles.avg}>
            <p className={styles.avgNum}>{s.averageRating.toFixed(1)}</p>
            <Stars value={s.averageRating} size={15} />
            <p className={styles.avgCount}>{count.toLocaleString('ko-KR')}개 리뷰</p>
          </div>
          <ul className={styles.dist}>
            {[5, 4, 3, 2, 1].map((star) => {
              const n = s.ratingCounts[star] ?? 0
              return (
                <li key={star}>
                  <span>{star}</span>
                  <span className={styles.track}>
                    <span style={{ width: `${count ? Math.max(2, Math.round((n / count) * 100)) : 0}%` }} />
                  </span>
                  <span className={styles.distCount}>{n}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div role="group" aria-label="정렬" className={styles.sorts}>
        {SORTS.map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={v === sort}
            className={v === sort ? styles.chipOn : styles.chip}
            onClick={() => setSort(v)}
          >
            {REVIEW_SORT_LABEL[v]}
          </button>
        ))}
      </div>

      {list.loading && items.length === 0 && <Loading />}
      {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.data && items.length === 0 && (
        <Empty title="아직 리뷰가 없어요">구매 확정한 분들의 리뷰가 여기에 보여요.</Empty>
      )}

      <ul className={styles.list}>
        {items.map((r) => (
          <li key={r.reviewId}>
            <div className={styles.head}>
              <span aria-hidden="true" className={styles.initial}>
                {r.reviewerName.charAt(0)}
              </span>
              <div className={styles.who}>
                <p className={styles.name}>{r.reviewerName}</p>
                <p className={styles.meta}>
                  {fmtDate(r.createdAt)} · {r.optionName}
                </p>
              </div>
              <Stars value={r.rating} size={13} />
            </div>
            {mine.data?.has(r.reviewId) && (
              <div className={styles.mine}>
                <span>내가 쓴 리뷰 · 고칠 수 없고 삭제만 돼요</span>
                <button type="button" onClick={() => setRemoving(r)}>
                  삭제
                </button>
              </div>
            )}
            <p className={styles.text}>{r.content}</p>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className={styles.more}>
          <Button variant="outline" disabled={list.loading} onClick={() => setPager({ key, page: page + 1 })}>
            {list.loading ? '불러오는 중이에요' : '더 보기'}
          </Button>
        </div>
      )}

      {removing && (
        <Modal
          title="리뷰를 삭제할까요?"
          onClose={() => !busy && setRemoving(null)}
          actions={
            <>
              <Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>
                취소
              </Button>
              <Button variant="danger" disabled={busy} onClick={remove}>
                {busy ? '삭제 중이에요' : '삭제'}
              </Button>
            </>
          }
        >
          삭제하면 이 주문으로 다시 리뷰를 쓸 수 없어요.
          {error && <p className={styles.error}>{error}</p>}
        </Modal>
      )}
    </AppFrame>
  )
}
