import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, Thumb, won } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  deleteProduct,
  getSellerProductCounts,
  getSellerProducts,
  type ProductDisplayStatus,
  type SellerProductSummary,
} from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, PRODUCT_STATUS, Pager, STOPPED_BY, fmtMD, useQueryState } from './shared'
import s from './seller.module.css'

const PAGE_SIZE = 20
const COLS = '2.2fr 1.1fr 1.2fr .8fr .6fr 1fr 1.6fr'

type TabKey = 'all' | ProductDisplayStatus
const TABS: Array<[TabKey, string, 'all' | 'onSale' | 'soldOut' | 'stopped']> = [
  ['all', '전체', 'all'],
  ['ON_SALE', '판매중', 'onSale'],
  ['SOLD_OUT', '품절', 'soldOut'],
  ['STOPPED', '판매 중지', 'stopped'],
]

/** 정렬. 백엔드는 최신 등록순만 줘서 지금 페이지 안에서만 다시 정렬해요. */
type Sort = 'latest' | 'priceDesc' | 'stockAsc'
const SORTS: Array<[Sort, string]> = [
  ['latest', '최신 등록순'],
  ['priceDesc', '가격 높은순'],
  ['stockAsc', '재고 적은순'],
]

/** S1 상품 관리 */
export default function SellerProductsPage() {
  const desktop = useIsDesktop()
  const location = useLocation()
  const { params, update, page } = useQueryState()
  const tab = (TABS.find((t) => t[0] === params.get('status'))?.[0] ?? 'all') as TabKey
  const status = tab === 'all' ? undefined : tab
  const keyword = params.get('q') ?? ''
  const sort = (SORTS.find((x) => x[0] === params.get('sort'))?.[0] ?? 'latest') as Sort

  const [input, setInput] = useState(keyword)
  useEffect(() => setInput(keyword), [keyword])

  const list = useApi(
    () => getSellerProducts({ status, keyword: keyword || undefined, page: toPageParam(page), size: PAGE_SIZE }),
    [status, keyword, page],
  )
  const counts = useApi(() => getSellerProductCounts(keyword || undefined), [keyword])

  // 등록·수정·중지 요청 화면에서 돌아오면 그 결과 문구를 보여줘요.
  const [done, setDone] = useState(() => (location.state as { done?: string } | null)?.done ?? '')
  const [deleting, setDeleting] = useState<SellerProductSummary | null>(null)
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')

  async function confirmDelete() {
    if (!deleting || pending) return
    setPending(true)
    setActionError('')
    try {
      await deleteProduct(deleting.productId)
      setDone(`‘${deleting.name}’을(를) 삭제했어요.`)
      setDeleting(null)
      list.reload()
      counts.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    update({ q: input.trim() || undefined })
  }

  const items = [...(list.data?.items ?? [])]
  if (sort === 'priceDesc') items.sort((a, b) => b.price - a.price)
  if (sort === 'stockAsc') items.sort((a, b) => a.stock - b.stock)

  const cnt = counts.data
  const tabItems = TABS.map(([value, label, key]) => ({
    value,
    label: cnt ? `${label} ${cnt[key].toLocaleString('ko-KR')}` : label,
  }))
  const pickTab = (v: TabKey) => update({ status: v === 'all' ? undefined : v })
  const emptyText = keyword
    ? `‘${keyword}’에 맞는 상품이 없어요.`
    : status
      ? '이 상태의 상품이 없어요.'
      : '아직 등록한 상품이 없어요.'

  const stopTo = (p: SellerProductSummary) => `/seller/products/${p.productId}/stop`
  const editTo = (p: SellerProductSummary) => `/seller/products/${p.productId}/edit`
  const stockTo = (p: SellerProductSummary) => `/seller/stock?productId=${p.productId}`
  const canAct = (p: SellerProductSummary) => p.status !== 'STOPPED' && !p.stopRequestPending

  const body = (() => {
    if (list.loading && !list.data) return <Loading label="상품을 불러오고 있어요" />
    if (list.error) return <ErrorView message={`상품 목록을 불러오지 못했어요. ${list.error}`} onRetry={list.reload} />
    if (items.length === 0)
      return (
        <Empty
          title={emptyText}
          action={
            !keyword && !status ? (
              <Button to="/seller/products/new" size="sm">
                상품 등록하기
              </Button>
            ) : undefined
          }
        />
      )
    if (desktop)
      return (
        <div role="table" className={c.table} aria-busy={list.loading}>
          <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
            <span>상품</span>
            <span>카테고리</span>
            <span>옵션</span>
            <span>가격</span>
            <span>재고</span>
            <span>상태</span>
            <span>관리</span>
          </div>
          {items.map((p) => {
            const [label, tone] = PRODUCT_STATUS[p.status]
            return (
              <div role="row" key={p.productId} className={c.tr} style={{ gridTemplateColumns: COLS }}>
                <span className={s.prod}>
                  <Thumb src={p.thumbnailUrl} width={40} height={44} radius={6} />
                  <span className={s.prodText}>
                    <b className={c.ellipsis}>{p.name}</b>
                    <span className={c.sub}>등록 {fmtMD(p.createdAt)}</span>
                  </span>
                </span>
                <span className={c.ellipsis}>{p.categoryName}</span>
                {/* TODO(API 미구현): 옵션 그룹 구조 — 지금은 상품마다 기본 옵션 1개라 '옵션 없음'으로 보여요 */}
                <span>옵션 없음</span>
                <span className={c.num}>{won(p.price)}</span>
                <span className={`${c.num} ${p.stock === 0 ? s.danger : ''}`}>{p.stock}개</span>
                <span className={s.badges}>
                  {p.stopRequestPending ? <Badge tone="amber">중지 요청 심사 중</Badge> : <Badge tone={tone}>{label}</Badge>}
                </span>
                <span className={c.actions}>
                  {p.status === 'STOPPED' ? (
                    <span className={s.faint} title={p.stoppedReason ?? undefined}>
                      {p.stoppedBy ? STOPPED_BY[p.stoppedBy] : '수정·삭제 불가'}
                    </span>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" to={editTo(p)}>
                        수정
                      </Button>
                      <Button variant="outline" size="sm" to={stockTo(p)}>
                        재고
                      </Button>
                      {canAct(p) && (
                        <>
                          <Button variant="dangerOutline" size="sm" to={stopTo(p)} state={{ product: p }}>
                            판매 중지 요청
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleting(p)}>
                            삭제
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )
    return (
      <ul className={c.list} aria-busy={list.loading}>
        {items.map((p) => {
          const [label, tone] = PRODUCT_STATUS[p.status]
          return (
            <li key={p.productId} className={c.li}>
              <Thumb src={p.thumbnailUrl} width={64} height={70} />
              <div className={c.liBody}>
                <div className={s.liHead}>
                  {p.stopRequestPending ? <Badge tone="amber">중지 요청 심사 중</Badge> : <Badge tone={tone}>{label}</Badge>}
                  <span className={s.faint}>{p.categoryName}</span>
                </div>
                <p className={c.liTitle}>{p.name}</p>
                <p className={c.liMeta}>
                  <b className={s.ink}>{won(p.price)}</b> · 재고 {p.stock}개
                </p>
                {p.status === 'STOPPED' && (
                  <p className={s.faintLine}>
                    {p.stoppedBy ? STOPPED_BY[p.stoppedBy] : '판매가 중지됐어요.'}
                    {p.stoppedReason && ` 사유: ${p.stoppedReason}`}
                  </p>
                )}
                {canAct(p) && (
                  <div className={s.inlineLinks}>
                    <Link to={stopTo(p)} state={{ product: p }} className={s.dangerLink}>
                      판매 중지 요청
                    </Link>
                    <button type="button" className={s.textBtn} onClick={() => setDeleting(p)}>
                      삭제
                    </button>
                  </div>
                )}
              </div>
              {p.status !== 'STOPPED' && (
                <Link to={editTo(p)} aria-label={`${p.name} 수정`} className={s.rowIcon}>
                  <Icon name="edit" size={20} />
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    )
  })()

  return (
    <ConsoleShell
      variant="seller"
      active="products"
      title="상품 관리"
      actions={
        <Button to="/seller/products/new">
          <Icon name="plus" size={16} />
          상품 등록
        </Button>
      }
    >
      {desktop ? (
        <div className={c.toolbar}>
          <Segment items={tabItems} value={tab} onChange={pickTab} label="상품 상태" />
          <div className={c.toolGroup}>
            <form role="search" onSubmit={submitSearch} className={c.search}>
              <Icon name="search" size={16} />
              <input
                aria-label="상품명 검색"
                placeholder="상품명 검색"
                value={input}
                maxLength={100}
                onChange={(e) => setInput(e.target.value)}
              />
            </form>
            <select
              aria-label="정렬"
              className={c.select}
              value={sort}
              onChange={(e) => update({ sort: e.target.value === 'latest' ? undefined : e.target.value }, true)}
            >
              {SORTS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <form role="search" onSubmit={submitSearch} className={c.mobileSearch}>
            <Icon name="search" size={18} />
            <input
              type="search"
              aria-label="상품명 검색"
              placeholder="상품명으로 찾기"
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
          <div className={s.chipRow}>
            <Chips items={tabItems} value={tab} onChange={pickTab} label="상품 상태" />
          </div>
        </>
      )}
      {done && (
        <div className={desktop ? s.gapBottom : s.mobileBlock}>
          <Notice onClose={() => setDone('')}>{done}</Notice>
        </div>
      )}
      {body}
      <Pager
        page={page}
        totalPages={list.data?.totalPages ?? 0}
        onChange={(n) => update({ page: n > 1 ? String(n) : undefined }, true)}
      />
      {!desktop && (
        <Button to="/seller/products/new" size="lg" className={c.fab}>
          <Icon name="plus" size={18} />
          상품 등록
        </Button>
      )}
      {deleting && (
        <Modal
          title="상품을 삭제할까요?"
          onClose={() => !pending && setDeleting(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>
                닫기
              </Button>
              <Button variant="danger" onClick={confirmDelete} disabled={pending}>
                {pending ? '삭제하는 중' : '삭제하기'}
              </Button>
            </>
          }
        >
          <p className={s.modalLead}>{deleting.name}</p>
          <p>삭제한 상품은 목록과 구매자 화면에서 사라지고 되돌릴 수 없어요. 이미 받은 주문에는 영향이 없어요.</p>
          {actionError && <Notice tone="error">{actionError}</Notice>}
        </Modal>
      )}
    </ConsoleShell>
  )
}
