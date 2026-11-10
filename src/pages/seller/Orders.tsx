import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, Thumb, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { toPageParam } from '../../lib/api'
import { getSellerOrderItems, type SellerOrderStatus } from '../../lib/api/order'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Pager, fmtMDHM, monthsAgo, useQueryState } from './shared'
import s from './seller.module.css'

const PAGE_SIZE = 20
const COLS = '.8fr .9fr 2.2fr .4fr .8fr .9fr .9fr'

const STATUS: Record<SellerOrderStatus, [string, Tone]> = {
  PAID: ['결제 완료', 'green'],
  CONFIRMED: ['구매 확정', 'neutral'],
  RETURN_REQUESTED: ['반품 요청', 'blue'],
  RETURNED: ['반품 완료', 'neutral'],
}
const STATUS_ORDER: SellerOrderStatus[] = ['PAID', 'CONFIRMED', 'RETURN_REQUESTED', 'RETURNED']

/**
 * 배송 상태. 판매자 주문 항목 응답에 배송 상태가 없어서, 구매 확정·반품은 배송이 끝난 주문이라 '배송 완료'로 보여요.
 * TODO(API 미구현): 판매자 주문 항목의 배송 상태(발송 대기·배송 중·배송 완료) — 결제 완료 주문은 '-'로 둬요.
 */
const deliveryOf = (status: SellerOrderStatus): [string, Tone] | null =>
  status === 'PAID' ? null : ['배송 완료', 'neutral']

/** 기간 선택지 [쿼리 값, 이름, 몇 개월 전부터 (null이면 전체)] */
const PERIODS: Array<[string, string, number | null]> = [
  ['1m', '최근 1개월', 1],
  ['3m', '최근 3개월', 3],
  ['all', '전체 기간', null],
]
const DEFAULT_PERIOD = '1m'

/** S4 주문 (본인 상품이 들어간 주문 항목, 조회만) */
export default function SellerOrdersPage() {
  const desktop = useIsDesktop()
  const { params, update, page } = useQueryState()
  const status = STATUS_ORDER.find((x) => x === params.get('status'))
  const period = PERIODS.find((p) => p[0] === params.get('period')) ?? PERIODS.find((p) => p[0] === DEFAULT_PERIOD)!
  const keyword = params.get('q') ?? ''

  const [input, setInput] = useState(keyword)
  useEffect(() => setInput(keyword), [keyword])

  const from = period[2] != null ? monthsAgo(period[2]) : undefined
  const list = useApi(
    () =>
      getSellerOrderItems({ status, from, keyword: keyword || undefined, page: toPageParam(page), size: PAGE_SIZE }),
    [status, from, keyword, page],
  )
  const items = list.data?.items ?? []
  const filtered = !!status || !!keyword || period[0] !== 'all'
  const emptyText = keyword
    ? `‘${keyword}’에 맞는 주문 항목이 없어요.`
    : filtered
      ? '이 조건에 맞는 주문 항목이 없어요. 기간이나 상태를 바꿔 보세요.'
      : '아직 들어온 주문이 없어요.'

  const submitSearch = (e: FormEvent) => {
    e.preventDefault()
    update({ q: input.trim() || undefined })
  }
  // 기본 옵션 하나뿐인 상품은 옵션 이름을 따로 보여주지 않아요.
  const optionOf = (name: string) => (name && name !== '기본' ? name : '')

  const selects = (
    <>
      <select
        aria-label="기간"
        className={c.select}
        value={period[0]}
        onChange={(e) => update({ period: e.target.value === DEFAULT_PERIOD ? undefined : e.target.value })}
      >
        {PERIODS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <select
        aria-label="주문 상태"
        className={c.select}
        value={status ?? ''}
        onChange={(e) => update({ status: e.target.value || undefined })}
      >
        <option value="">모든 주문 상태</option>
        {STATUS_ORDER.map((x) => (
          <option key={x} value={x}>
            {STATUS[x][0]}
          </option>
        ))}
      </select>
    </>
  )

  let body
  if (list.loading && !list.data) body = <Loading label="주문 항목을 불러오고 있어요" />
  else if (list.error) body = <ErrorView message={list.error} onRetry={list.reload} />
  else if (items.length === 0) body = <Empty title={emptyText} />
  else if (desktop)
    body = (
      <div role="table" className={c.table} aria-busy={list.loading}>
        <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
          <span>주문일</span>
          <span>주문번호</span>
          <span>상품 · 옵션</span>
          <span>수량</span>
          <span>금액</span>
          <span>주문 상태</span>
          <span>배송 상태</span>
        </div>
        {items.map((it) => {
          const [label, tone] = STATUS[it.status] ?? [it.status, 'neutral']
          const delivery = deliveryOf(it.status)
          return (
            <div role="row" key={it.orderItemId} className={c.tr} style={{ gridTemplateColumns: COLS }}>
              <span className={c.num}>{fmtMDHM(it.orderedAt)}</span>
              <span className={`${c.num} ${c.ellipsis}`}>{it.orderNumber}</span>
              <span className={s.prod}>
                {/* TODO(API 미구현): 판매자 주문 항목 응답에 상품 이미지가 없어 자리표시로 보여요 */}
                <Thumb width={36} height={40} radius={6} />
                <span className={s.prodText}>
                  <Link to={`/product/${it.productId}`} className={`${c.ellipsis} ${s.ink}`}>
                    <b>{it.productName}</b>
                  </Link>
                  {optionOf(it.optionName) && <span className={c.sub}>{optionOf(it.optionName)}</span>}
                </span>
              </span>
              <span className={c.num}>{it.quantity}</span>
              <span className={c.num}>{won(it.lineAmount)}</span>
              <span>
                <Badge tone={tone}>{label}</Badge>
              </span>
              <span>{delivery ? <Badge tone={delivery[1]}>{delivery[0]}</Badge> : <span className={s.faint}>-</span>}</span>
            </div>
          )
        })}
      </div>
    )
  else
    body = (
      <div className={s.cards} aria-busy={list.loading}>
        {items.map((it) => {
          const [label, tone] = STATUS[it.status] ?? [it.status, 'neutral']
          const opt = optionOf(it.optionName)
          return (
            <article key={it.orderItemId} className={s.orderCard}>
              <div className={s.orderCardHead}>
                <span className={s.faint}>
                  {fmtMDHM(it.orderedAt)} · {it.orderNumber}
                </span>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <div className={s.prod}>
                <Thumb width={56} height={60} />
                <div className={s.prodText}>
                  <Link to={`/product/${it.productId}`} className={s.ink}>
                    <b className={c.ellipsis}>{it.productName}</b>
                  </Link>
                  <span className={c.liMeta}>
                    {opt && `${opt} · `}
                    {it.quantity}개 · <b className={s.ink}>{won(it.lineAmount)}</b>
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    )

  return (
    <ConsoleShell
      variant="seller"
      active="orders"
      title={desktop ? '주문' : '주문 항목'}
      description="배송은 플랫폼 물류 담당자가 주문 단위로 한 번에 출고해요. 배송 상태는 조회만 할 수 있어요."
    >
      {desktop ? (
        <div className={c.toolbar}>
          <div className={c.toolGroup}>{selects}</div>
          <form role="search" onSubmit={submitSearch} className={c.search}>
            <Icon name="search" size={16} />
            <input
              aria-label="주문번호나 상품명"
              placeholder="주문번호나 상품명"
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
        </div>
      ) : (
        <div className={s.mobileTools}>
          <form role="search" onSubmit={submitSearch} className={`${c.mobileSearch} ${s.flush}`}>
            <Icon name="search" size={18} />
            <input
              type="search"
              aria-label="검색"
              placeholder="주문번호나 상품명"
              value={input}
              maxLength={100}
              onChange={(e) => setInput(e.target.value)}
            />
          </form>
          <div className={s.selectRow}>{selects}</div>
        </div>
      )}
      {body}
      <Pager
        page={page}
        totalPages={list.data?.totalPages ?? 0}
        onChange={(n) => update({ page: n > 1 ? String(n) : undefined }, true)}
      />
    </ConsoleShell>
  )
}
