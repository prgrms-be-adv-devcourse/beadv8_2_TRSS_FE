import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, Segment, Thumb } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { toPageParam } from '../../lib/api'
import {
  DELIVERY_STATUS_LABEL,
  getLogisticsDeliveries,
  shipDelivery,
  type DeliveryStatus,
  type LogisticsDelivery,
} from '../../lib/api/logistics'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, Pager } from '../admin-finance/parts'
import DeliveryPanel from './DeliveryPanel'
import {
  TrackingForm,
  courierName,
  daysSince,
  isToday,
  itemsSummary,
  mmdd,
  mmddhm,
  needsCheck,
  trackingLabel,
  useLogisticsCounts,
} from './shared'
import s from './Logistics.module.css'

const PAGE_SIZE = 20
type Key = 'ready' | 'shipping' | 'delivered'
const STATUS_OF: Record<Key, DeliveryStatus> = { ready: 'READY', shipping: 'SHIPPED', delivered: 'DELIVERED' }
const PATH_OF: Record<Key, string> = {
  ready: '/logistics/ready',
  shipping: '/logistics/shipping',
  delivered: '/logistics/delivered',
}
const READY_COLS = '.6fr .7fr 2fr 1.5fr 1.9fr'
const SHIPPING_COLS = '.5fr .8fr 1.3fr 1.1fr 1fr .9fr .8fr'
const DELIVERED_COLS = '.6fr .8fr 1.5fr 1fr 1.2fr .6fr'

const TITLE: Record<Key, string> = { ready: '출고 대기', shipping: '배송 중', delivered: '배송 완료' }
const DESC: Record<Key, string> = {
  ready: '결제가 끝난 주문을 포장하고 송장을 등록해요.',
  shipping: '택배사 조회가 계속 안 되거나 오래 걸리는 건은 "확인 필요"로 표시돼요.',
  delivered: '택배사 조회로 배송 완료가 확인된 주문이에요.',
}

/** 물류 · 출고 대기(L1) / 배송 중(L2) / 배송 완료 */
export default function LogisticsDeliveries({ tab }: { tab: Key }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const status = STATUS_OF[tab]
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const list = useApi(
    () => getLogisticsDeliveries({ status, page: toPageParam(page), size: PAGE_SIZE }),
    [status, page],
  )
  const counts = useLogisticsCounts([])
  // 오늘 송장 등록 (출고 대기 KPI)
  // TODO(API 미구현): 물류 탭 건수·오늘 출고 건수 API — 지금은 배송 중 최근 100건에서 오늘 출고한 건을 세요
  const todayShipped = useApi(
    () =>
      tab === 'ready' && desktop
        ? getLogisticsDeliveries({ status: 'SHIPPED', size: 100 }).then(
            (r) => r.items.filter((d) => isToday(d.shippedAt)).length,
          )
        : Promise.resolve(null),
    [tab, desktop],
  )

  useEffect(() => {
    setPage(1)
    setSelectedId(null)
    setKeyword('')
    setNotice('')
  }, [tab])

  // 화면 안에서만 거르는 검색 (BE 목록에 검색 조건이 없어요)
  // TODO(API 미구현): 물류 배송 목록 검색(주문번호·받는 분·송장번호) 파라미터
  const rows = useMemo(() => {
    const items = list.error ? [] : (list.data?.items ?? [])
    const q = keyword.trim().toLowerCase()
    if (!q) return items
    return items.filter((d) =>
      [d.orderNumber, d.receiverName, d.trackingNumber ?? ''].some((v) => v.toLowerCase().includes(q)),
    )
  }, [list.data, list.error, keyword])

  // PC 배송 중·완료: 처음엔 첫 행을 상세로 보여 줘요
  const selected = rows.find((d) => d.deliveryId === selectedId) ?? (desktop && tab !== 'ready' ? rows[0] : undefined)

  function replace(next: LogisticsDelivery) {
    list.setData((prev) =>
      prev
        ? {
            ...prev,
            // 상태가 바뀌면(배송 완료 처리) 이 탭 목록에서 빼요
            items:
              next.status === status
                ? prev.items.map((d) => (d.deliveryId === next.deliveryId ? next : d))
                : prev.items.filter((d) => d.deliveryId !== next.deliveryId),
          }
        : prev,
    )
    if (next.status !== status) counts.reload()
  }

  async function ship(d: LogisticsDelivery, body: Parameters<typeof shipDelivery>[1]) {
    const next = await shipDelivery(d.deliveryId, body)
    setNotice(
      `${d.orderNumber}을 출고했어요. ${next.carrierName ?? ''} ${next.trackingNumber ?? ''} · 구매자에게 발송 알림이 가요.`,
    )
    list.reload()
    counts.reload()
    todayShipped.reload()
  }

  const k = counts.data
  const menuCounts = k ? { ready: k.ready, shipping: k.shipping } : undefined
  const tabs = (['ready', 'shipping', 'delivered'] as Key[]).map((key) => ({
    value: key,
    label: `${TITLE[key]}${key !== 'delivered' && k ? ` ${key === 'ready' ? k.ready : k.shipping}` : ''}`,
  }))

  const state =
    list.loading && !list.data ? (
      <Loading />
    ) : list.error ? (
      <ErrorView message={list.error} onRetry={list.reload} />
    ) : rows.length === 0 ? (
      <Empty title={keyword.trim() ? '검색 결과가 없어요.' : `${TITLE[tab]} 주문이 없어요.`} />
    ) : null

  const searchPlaceholder = tab === 'ready' ? '주문번호나 받는 분' : '주문번호나 송장번호'
  const pager = list.data && list.data.totalPages > 1 && (
    <div className={c.tableFoot}>
      <span>총 {list.data.totalElements}건</span>
      <Pager page={page} totalPages={list.data.totalPages} onChange={setPage} />
    </div>
  )

  const itemLines = (d: LogisticsDelivery) => (
    <span className={s.itemLines}>
      {d.items.map((it) => (
        <span key={it.orderItemId} className={s.itemLine}>
          <Thumb width={36} height={36} radius={6} />
          <span>
            <b>{it.productName}</b>
            <span>
              {it.sellerName} · {it.optionName || '옵션 없음'} · {it.quantity}개
            </span>
          </span>
        </span>
      ))}
    </span>
  )
  const addressOf = (d: LogisticsDelivery) => `${d.address}${d.addressDetail ? `, ${d.addressDetail}` : ''}`

  /* ───────── 모바일 ───────── */
  if (!desktop)
    return (
      <ConsoleShell variant="logistics" active={tab} title="배송 관리" counts={menuCounts}>
        <div className={s.page}>
          <p className={s.lead}>
            {tab === 'ready' ? '주문 하나를 한 상자로 출고해요. 결제가 오래된 주문부터 보여요.' : DESC[tab]}
          </p>
          <Notice>{notice}</Notice>
          {tab !== 'ready' && (
            <label className={c.mobileSearch}>
              <Icon name="search" size={18} />
              <input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </label>
          )}
          {state}
          <div className={s.cards}>
            {rows.map((d) => (
              <article
                key={d.deliveryId}
                className={`${s.card} ${tab !== 'ready' ? s.cardClick : ''}`}
                onClick={tab !== 'ready' ? () => navigate(`/logistics/deliveries/${d.deliveryId}`) : undefined}
              >
                <div className={s.cardHead}>
                  <span className={s.meta}>
                    {tab === 'ready'
                      ? `${mmddhm(d.paidAt)} 결제`
                      : tab === 'shipping'
                        ? `${mmdd(d.shippedAt)} 출고 · ${daysSince(d.shippedAt)}일째`
                        : `${mmdd(d.deliveredAt)} 배송 완료`}{' '}
                    · {d.orderNumber}
                  </span>
                  {tab === 'shipping' && needsCheck(d) ? (
                    <Badge tone="red">확인 필요</Badge>
                  ) : (
                    <Badge tone={tab === 'delivered' ? 'green' : tab === 'shipping' ? 'blue' : 'neutral'}>
                      {DELIVERY_STATUS_LABEL[d.status]}
                    </Badge>
                  )}
                </div>
                {tab === 'ready' ? (
                  <>
                    {itemLines(d)}
                    <p className={s.addrLine}>
                      {d.receiverName} · {d.receiverPhone}
                      <br />
                      {addressOf(d)}
                    </p>
                    {d.requestMessage && <p className={s.request}>요청 · {d.requestMessage}</p>}
                    <TrackingForm
                      idPrefix={`m-${d.deliveryId}`}
                      submitLabel="송장 등록"
                      busyLabel="등록 중…"
                      onSubmit={(body) => ship(d, body)}
                    />
                  </>
                ) : (
                  <>
                    <p className={s.cardTitle}>{itemsSummary(d)}</p>
                    <p className={s.meta}>
                      {courierName(d)} {d.trackingNumber} ·{' '}
                      {tab === 'shipping' ? trackingLabel(d.lastTrackingStatus) : d.receiverName}
                    </p>
                  </>
                )}
              </article>
            ))}
          </div>
          {list.data && <Pager page={page} totalPages={list.data.totalPages} onChange={setPage} />}
        </div>
      </ConsoleShell>
    )

  /* ───────── PC ───────── */
  const toolbar = (
    <div className={c.toolbar}>
      <Segment label="배송 상태" items={tabs} value={tab} onChange={(v) => navigate(PATH_OF[v])} />
      <label className={c.search}>
        <Icon name="search" size={16} />
        <input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </label>
    </div>
  )

  return (
    <ConsoleShell variant="logistics" active={tab} title={TITLE[tab]} description={DESC[tab]} counts={menuCounts}>
      <Notice>{notice}</Notice>
      {tab === 'ready' ? (
        <>
          <div className={c.kpis}>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>출고 대기</p>
              <p className={c.kpiValue}>{k ? `${k.ready}건` : '—'}</p>
              <p className={c.kpiSub}>결제 완료된 주문 · 오래된 순</p>
            </div>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>오늘 송장 등록</p>
              <p className={c.kpiValue}>
                {todayShipped.data !== null && todayShipped.data !== undefined ? `${todayShipped.data}건` : '—'}
              </p>
            </div>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>배송 중</p>
              <p className={c.kpiValue}>{k ? `${k.shipping}건` : '—'}</p>
              <p className={c.kpiSub}>택배사 조회로 배송 완료가 자동 반영돼요</p>
            </div>
          </div>
          {toolbar}
          <div className={c.table} role="table" aria-label="출고 대기 목록">
            <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: READY_COLS }}>
              <span>결제</span>
              <span>주문번호</span>
              <span>상품 (판매자 · 옵션 · 수량)</span>
              <span>받는 분 · 주소</span>
              <span>택배사 · 송장번호</span>
            </div>
            {state}
            {rows.map((d) => (
              <div
                key={d.deliveryId}
                role="row"
                className={`${c.tr} ${s.tallRow}`}
                style={{ gridTemplateColumns: READY_COLS }}
              >
                <span className={c.num}>{mmddhm(d.paidAt)}</span>
                <span className={`${c.num} ${c.ellipsis}`} title={d.orderNumber}>
                  {d.orderNumber}
                </span>
                {itemLines(d)}
                <span className={s.addrCell}>
                  <b>
                    {d.receiverName} · {d.receiverPhone}
                  </b>
                  <span>{addressOf(d)}</span>
                  {d.requestMessage && <span className={s.request}>요청 · {d.requestMessage}</span>}
                </span>
                <TrackingForm
                  compact
                  idPrefix={`pc-${d.deliveryId}`}
                  submitLabel="송장 등록"
                  busyLabel="등록 중…"
                  onSubmit={(body) => ship(d, body)}
                />
              </div>
            ))}
            {pager}
          </div>
          <p className={s.foot}>
            주문 하나에 배송 1건이에요. 여러 판매자 상품이 섞여 있어도 한 상자로 출고해요. 송장을 등록하면 배송 중으로
            바뀌고 구매자에게 발송 알림이 가요.
          </p>
        </>
      ) : (
        <>
          {toolbar}
          <div className={`${c.split} ${s.split380}`}>
            <div className={c.table} role="table" aria-label={`${TITLE[tab]} 목록`}>
              {tab === 'shipping' ? (
                <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: SHIPPING_COLS }}>
                  <span>출고일</span>
                  <span>주문번호</span>
                  <span>상품</span>
                  <span>택배사 · 송장</span>
                  <span>마지막 조회</span>
                  <span>경과</span>
                  <span></span>
                </div>
              ) : (
                <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: DELIVERED_COLS }}>
                  <span>배송 완료</span>
                  <span>주문번호</span>
                  <span>상품</span>
                  <span>받는 분</span>
                  <span>택배사 · 송장</span>
                  <span>출고일</span>
                </div>
              )}
              {state}
              {rows.map((d) => {
                const on = selected?.deliveryId === d.deliveryId
                const rowClass = `${c.tr} ${c.clickable} ${c.num} ${on ? c.selected : ''}`
                if (tab === 'delivered')
                  return (
                    <div
                      key={d.deliveryId}
                      role="row"
                      aria-selected={on}
                      className={rowClass}
                      style={{ gridTemplateColumns: DELIVERED_COLS }}
                      onClick={() => setSelectedId(d.deliveryId)}
                    >
                      <span>{mmdd(d.deliveredAt)}</span>
                      <span className={c.ellipsis}>{d.orderNumber}</span>
                      <span className={c.ellipsis}>{itemsSummary(d)}</span>
                      <span className={c.ellipsis}>{d.receiverName}</span>
                      <span>
                        {courierName(d)}
                        <b className={s.block}>{d.trackingNumber}</b>
                      </span>
                      <span>{mmdd(d.shippedAt)}</span>
                    </div>
                  )
                const check = needsCheck(d)
                return (
                  <div
                    key={d.deliveryId}
                    role="row"
                    aria-selected={on}
                    className={rowClass}
                    style={{ gridTemplateColumns: SHIPPING_COLS }}
                    onClick={() => setSelectedId(d.deliveryId)}
                  >
                    <span>{mmdd(d.shippedAt)}</span>
                    <span className={c.ellipsis}>{d.orderNumber}</span>
                    <span className={c.ellipsis}>{itemsSummary(d)}</span>
                    <span>
                      {courierName(d)}
                      <b className={s.block}>{d.trackingNumber}</b>
                    </span>
                    <span className={check ? s.warnText : ''}>{trackingLabel(d.lastTrackingStatus)}</span>
                    <span>
                      {check ? (
                        <Badge tone="red">{daysSince(d.shippedAt)}일 · 확인 필요</Badge>
                      ) : (
                        `${daysSince(d.shippedAt)}일`
                      )}
                    </span>
                    <span>
                      <Button variant="outline" size="sm" onClick={() => setSelectedId(d.deliveryId)}>
                        송장 수정
                      </Button>
                    </span>
                  </div>
                )
              })}
              {pager}
            </div>
            <section className={c.card} aria-label="배송 상세">
              {selected ? (
                <DeliveryPanel key={selected.deliveryId} delivery={selected} onChanged={replace} onNotice={setNotice} />
              ) : (
                <Empty title="배송을 골라 주세요." />
              )}
            </section>
          </div>
        </>
      )}
    </ConsoleShell>
  )
}
