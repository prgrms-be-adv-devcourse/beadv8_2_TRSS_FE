import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import type { ProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { ExampleNotice, ProductCard, imageOf, loadProducts, useWishes } from './common'
import { ExhibitionBanner } from './Exhibition'
import { findExhibition, type Exhibition } from './exhibitions'
import styles from './Exhibition.module.css'

const PAGE_SIZE = 20

/** 기획전 상세 (/exhibitions/:id). 배너 + 기획전 검색 조건의 상품 목록, '더 보기'로 다음 페이지를 이어 붙여요. */
export default function ExhibitionDetailPage() {
  const { id } = useParams()
  const exhibition = findExhibition(id)
  return (
    <AppFrame tab="home">
      <PageHeader back title="기획전" />
      {exhibition ? (
        <ExhibitionProducts key={exhibition.id} exhibition={exhibition} />
      ) : (
        <Empty
          title="찾는 기획전이 없어요"
          action={
            <Button variant="outline" size="sm" to="/?tab=exhibition">
              기획전 전체 보기
            </Button>
          }
        >
          기간이 끝났거나 주소가 바뀌었을 수 있어요.
        </Empty>
      )}
    </AppFrame>
  )
}

function ExhibitionProducts({ exhibition }: { exhibition: Exhibition }) {
  const [page, setPage] = useState(0)
  const res = useApi(() => loadProducts({ ...exhibition.query, page, size: PAGE_SIZE }), [page])
  const [items, setItems] = useState<ProductSummary[]>([])
  useEffect(() => {
    if (!res.data) return
    const next = res.data.items
    setItems((prev) => (page === 0 ? next : [...prev, ...next]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.data])
  const total = res.data?.totalElements
  const hasMore = !!res.data && page + 1 < res.data.totalPages
  const wishes = useWishes()

  return (
    <>
      <div className={styles.detailBanner}>
        <ExhibitionBanner exhibition={exhibition} images={items.slice(0, 4).map(imageOf)} headingLevel={2} />
      </div>
      <section aria-labelledby="exhibition-products">
        <div className={styles.titleRow}>
          <h3 id="exhibition-products" className={styles.listTitle}>
            기획전 상품
          </h3>
          {total != null && <span className={styles.listCount}>{total.toLocaleString('ko-KR')}개</span>}
        </div>
        {res.data?.example && <ExampleNotice />}
        {wishes.error && (
          <p role="alert" className={styles.wishError}>
            {wishes.error}
          </p>
        )}
        {res.loading && items.length === 0 && <Loading />}
        {res.error && page === 0 && <ErrorView message={res.error} onRetry={res.reload} />}
        {!res.loading && !res.error && res.data && items.length === 0 && (
          <Empty
            title="지금은 기획전 상품이 없어요"
            action={
              <Button variant="outline" size="sm" to="/?tab=all">
                전체 상품 보기
              </Button>
            }
          />
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
            <Button variant="outline" disabled={res.loading} onClick={() => setPage((n) => n + 1)}>
              {res.loading ? '불러오는 중이에요' : '더 보기'}
            </Button>
          </div>
        )}
        {res.error && page > 0 && <ErrorView message={res.error} onRetry={res.reload} />}
      </section>
    </>
  )
}
