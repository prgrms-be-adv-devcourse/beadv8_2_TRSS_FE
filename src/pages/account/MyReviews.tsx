import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Tabs, Thumb } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { errorMessage } from '../../lib/api'
import { getOrder, getOrders } from '../../lib/api/order'
import { deleteReview, getMyReviews, type MyReview } from '../../lib/api/review'
import { useApi } from '../../lib/useApi'
import { fmtMd, usePaged } from './util'
import s from './account.module.css'

type Writable = {
  orderItemId: number
  productId: number
  productName: string
  optionName: string
  quantity: number
  confirmedAt: string | null
  thumbnailUrl: string | null
}

const PAGE = 10

/**
 * 리뷰를 쓸 수 있는 주문 항목 = 구매 확정 주문의 항목 중 아직 리뷰를 쓰지 않은 것
 * TODO(API 미구현): GET /api/v1/reviews/writable — 작성 가능 목록 API가 없어서 최근 구매 확정 주문 20건을 읽어 직접 구해요.
 *   (주문마다 상세를 한 번씩 불러요. 삭제한 리뷰의 주문 항목은 다시 쓸 수 없지만 여기서는 거르지 못해요 → 쓰기 화면에서 409 안내)
 */
async function getWritable(): Promise<Writable[]> {
  const [orders, mine] = await Promise.all([
    getOrders({ statuses: ['CONFIRMED'], size: 20 }),
    getMyReviews({ size: 100 }),
  ])
  const written = new Set(mine.items.map((r) => r.orderItemId))
  const details = await Promise.all(orders.items.map((o) => getOrder(o.orderId).then((d) => ({ o, d }))))
  return details.flatMap(({ o, d }) =>
    d.items
      .filter((it) => !written.has(it.orderItemId))
      .map((it) => ({
        orderItemId: it.orderItemId,
        productId: it.productId,
        productName: it.productName,
        optionName: it.optionName,
        quantity: it.quantity,
        confirmedAt: d.confirmedAt,
        thumbnailUrl: it.productName === o.representativeProductName ? o.thumbnailUrl : null,
      })),
  )
}

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))

/** ⑯ 내 리뷰 (작성 가능 · 내가 쓴 리뷰) */
export default function MyReviewsPage() {
  const [tab, setTab] = useState<'writable' | 'mine'>('writable')
  const writable = useApi(getWritable, [])
  const mine = usePaged((page) => getMyReviews({ page, size: PAGE }), [])
  const [target, setTarget] = useState<MyReview | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [delError, setDelError] = useState('')

  async function remove() {
    if (!target || deleting) return
    setDeleting(true)
    setDelError('')
    try {
      await deleteReview(target.reviewId)
      setTarget(null)
      mine.reload()
    } catch (e) {
      setDelError(errorMessage(e))
    } finally {
      setDeleting(false)
    }
  }

  const wList = writable.data ?? []
  const mList = mine.items
  const mTotal = mine.total ?? 0

  return (
    <AppFrame>
      <PageHeader title="내 리뷰" back="/mypage" />
      <Tabs
        label="내 리뷰"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'writable', label: `작성 가능 ${writable.data ? wList.length : ''}` },
          { value: 'mine', label: `내가 쓴 리뷰 ${mine.loaded ? mTotal : ''}` },
        ]}
      />

      {tab === 'writable' && (
        <section>
          <div className={s.sectionHead}>
            <h2>작성 가능한 리뷰</h2>
            <p>구매 확정한 상품에 리뷰를 쓸 수 있어요.</p>
          </div>
          {writable.loading && !writable.data && <Loading />}
          {writable.error && <ErrorView message={writable.error} onRetry={writable.reload} />}
          {writable.data && wList.length === 0 && (
            <Empty title="쓸 수 있는 리뷰가 없어요">구매 확정한 상품이 생기면 여기에 보여요.</Empty>
          )}
          <ul className={s.list}>
            {wList.map((w) => (
              <li key={w.orderItemId} className={s.reviewRow}>
                <Thumb src={w.thumbnailUrl} width={56} height={56} />
                <span className={s.reviewInfo}>
                  <b>{w.productName}</b>
                  <span>
                    {w.optionName} · {fmtMd(w.confirmedAt)} 구매 확정
                  </span>
                </span>
                {/* 리뷰 쓰기 화면은 상품 정보를 state에서만 읽어요 (pages/shop/ReviewWrite.tsx의 ReviewWriteState) */}
                <Button
                  to={`/reviews/write?orderItemId=${w.orderItemId}`}
                  state={{
                    productName: w.productName,
                    optionName: w.optionName,
                    thumbnailUrl: w.thumbnailUrl,
                    quantity: w.quantity,
                  }}
                  size="sm"
                >
                  리뷰 쓰기
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'mine' && (
        <section>
          <div className={s.sectionHead}>
            <h2>내가 쓴 리뷰</h2>
            <p>리뷰는 고칠 수 없고 삭제만 돼요. 삭제한 주문으로는 다시 쓸 수 없어요.</p>
          </div>
          {mine.loading && !mine.loaded && <Loading />}
          {mine.error && <ErrorView message={mine.error} onRetry={mine.reload} />}
          {mine.loaded && mList.length === 0 && <Empty title="아직 쓴 리뷰가 없어요" />}
          <ul className={s.list}>
            {mList.map((r) => (
              <li key={r.reviewId}>
                <div className={s.reviewRow}>
                  <Link to={`/product/${r.productId}`}>
                    <Thumb src={r.thumbnailUrl} width={48} height={48} />
                  </Link>
                  <span className={s.reviewInfo}>
                    <b>{r.productName ?? '판매가 끝난 상품'}</b>
                    <span>
                      <span className={s.stars} aria-label={`별점 ${r.rating}점`}>
                        {stars(r.rating)}
                      </span>{' '}
                      {fmtMd(r.createdAt)} · {r.optionName}
                    </span>
                  </span>
                </div>
                <p className={s.reviewBody}>{r.content}</p>
                <div className={s.liRight}>
                  <Button variant="outline" size="sm" onClick={() => (setDelError(''), setTarget(r))}>
                    삭제
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {mine.hasMore && (
            <div className={s.more}>
              <Button variant="outline" size="sm" disabled={mine.loading} onClick={mine.loadMore}>
                더 보기
              </Button>
            </div>
          )}
        </section>
      )}

      {target && (
        <Modal
          title="리뷰를 삭제할까요?"
          onClose={() => setTarget(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setTarget(null)}>
                닫기
              </Button>
              <Button variant="danger" disabled={deleting} onClick={remove}>
                삭제하기
              </Button>
            </>
          }
        >
          삭제하면 이 주문 상품에는 리뷰를 다시 쓸 수 없어요.
          {delError && (
            <p role="alert" className={`${s.alert} ${s.cardMsg}`}>
              {delError}
            </p>
          )}
        </Modal>
      )}
    </AppFrame>
  )
}
