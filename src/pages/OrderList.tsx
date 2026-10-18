import { Link } from 'react-router-dom'
import { makeCx, css, NOTICE, won } from '../lib/ui'
import styles from './OrderList.module.css'
import BuyerHeader from '../components/BuyerHeader'
import Pager from '../components/Pager'
import NoticeModal, { type Notice } from '../components/NoticeModal'

import { useEffect, useState } from 'react'
import { toPageParam } from '../lib/api'
import { confirmOrder, getOrders, isPayable, type OrderStatus, type OrderSummary } from '../lib/api/order'
import { orderNotice } from '../lib/notices/order'
import { ORDER_STATUS, autoConfirmDate, isoDate, mmdd, mmss } from '../lib/orderStatus'
import { productImage } from '../lib/products'
import { useApi } from '../lib/useApi'

/** 상태 필터. 백엔드에 상태를 여러 개 보내면 그중 하나라도 해당하는 주문이 와요. */
const FILTERS: Array<{ label: string; statuses: OrderStatus[] }> = [
  { label: '전체', statuses: [] },
  { label: '결제 대기', statuses: ['CREATED', 'PAYMENT_FAILED'] },
  { label: '결제 완료', statuses: ['PAID'] },
  { label: '반품', statuses: ['RETURN_REQUESTED', 'RETURNED'] },
  { label: '구매 확정', statuses: ['CONFIRMED'] },
  { label: '취소', statuses: ['CANCELED'] },
]
const PERIODS = [
  { label: '최근 1개월', months: 1 },
  { label: '최근 3개월', months: 3 },
  { label: '최근 6개월', months: 6 },
]
const PAGE_SIZE = 10

const ON =
  'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #26262C;background:#26262C;color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer'
const OFF =
  'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #D5D5DD;background:#fff;color:#45454F;font:inherit;font-size:14px;cursor:pointer'
const SMALL_BTN = { minHeight: '36px', fontSize: '13px', padding: '0 12px' }

const cx = makeCx(styles)

/** 오늘에서 n개월 전 날짜 (yyyy-MM-dd) */
function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return isoDate(d)
}

/** 결제 대기 주문의 남은 시간을 1초씩 줄여요. 서버가 준 remainingSeconds에서 불러온 뒤 지난 시간만큼 빼요. */
function useElapsedSeconds(items: OrderSummary[] | undefined) {
  const [loadedAt, setLoadedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = Date.now()
    setLoadedAt(t)
    setNow(t)
  }, [items])
  const ticking = !!items?.some((o) => o.remainingSeconds > 0)
  useEffect(() => {
    if (!ticking) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [ticking])
  return Math.floor((now - loadedAt) / 1000)
}

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useOrderListView() {
  const [filter, setFilter] = useState(0)
  const [period, setPeriod] = useState(0)
  const [page, setPage] = useState(1)
  const list = useApi(
    () =>
      getOrders({
        statuses: FILTERS[filter].statuses,
        from: monthsAgo(PERIODS[period].months),
        page: toPageParam(page),
        size: PAGE_SIZE,
      }),
    [filter, period, page],
  )
  const items = list.data?.items
  const elapsed = useElapsedSeconds(items)

  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  /** 구매 확정. 실패하면 안내 모달을 띄우고, 끝나면 목록을 다시 불러와요. */
  const runConfirm = async (o: OrderSummary) => {
    if (busy) return
    setBusy(true)
    try {
      await confirmOrder(o.orderId)
    } catch (e) {
      setNotice(orderNotice(e, { status: o.status }))
    } finally {
      setBusy(false)
      list.reload()
    }
  }

  const rows = (items ?? []).map((o) => {
    const st = ORDER_STATUS[o.status]
    const pending = isPayable(o.status)
    const left = Math.max(0, o.remainingSeconds - elapsed)
    const autoAt = o.paidAt ? autoConfirmDate(o.paidAt) : null
    const name =
      o.itemCount > 1 ? `${o.representativeProductName} 외 ${o.itemCount - 1}개` : o.representativeProductName

    let note: { text: string; warn?: boolean } | null = null
    if (pending) note = left > 0 ? { text: `${mmss(left)} 남음`, warn: true } : { text: '결제 시간이 지났어요' }
    else if (o.status === 'PAID' && autoAt) note = { text: `${mmdd(autoAt)} 자동 확정` }
    else if (o.status === 'RETURN_REQUESTED') note = { text: '관리자 확인 중' }
    else if (o.status === 'RETURNED') note = { text: '예치금으로 환불됐어요' }

    return {
      key: o.orderId,
      url: `/orders/${o.orderId}`,
      orderNumber: o.orderNumber,
      date: `${mmdd(new Date(o.orderedAt))} 주문`,
      name,
      img: o.thumbnailUrl || productImage(o.representativeProductName),
      amount: won(o.totalPrice),
      label: st.label,
      chip: st.chip,
      note,
      /** 결제 대기이고 시간이 남았으면 '결제하기' */
      payUrl: pending && left > 0 ? `/checkout?orderId=${o.orderId}` : '',
      /** 결제 완료면 '구매 확정하기' */
      confirm:
        o.status === 'PAID'
          ? () =>
              setNotice({
                title: '구매를 확정할까요?',
                body: '확정한 뒤에는 반품을 요청할 수 없어요. 결제한 금액은 판매자에게 정산돼요.',
                actions: [
                  { label: '돌아가기' },
                  { label: '구매 확정하기', primary: true, onClick: () => runConfirm(o) },
                ],
              })
          : null,
    }
  })

  const view = {
    filters: FILTERS.map((f, i) => ({
      label: f.label,
      on: filter === i,
      style: filter === i ? ON : OFF,
      pick: () => {
        setFilter(i)
        setPage(1)
      },
    })),
    period,
    periods: PERIODS.map((p) => p.label),
    changePeriod: (i: number) => {
      setPeriod(i)
      setPage(1)
    },
    loading: list.loading && !list.data,
    error: list.error,
    empty: !!list.data && list.data.items.length === 0,
    rows,
    busy,
    page,
    totalPages: list.data?.totalPages ?? 0,
    setPage,
    notice,
    closeNotice: () => setNotice(null),
  }
  return view
}

/** 주문 내역 */
export default function OrderListPage() {
  const view = useOrderListView()
  const { filters, rows, busy } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="orders" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '28px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문 내역</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {filters.map((f) => (
              <button onClick={f.pick} aria-pressed={f.on} style={css(f.style)} key={f.label}>
                {f.label}
              </button>
            ))}
            <select
              className={cx('in')}
              aria-label="기간"
              style={{ marginLeft: 'auto' }}
              value={view.period}
              onChange={(e) => view.changePeriod(Number(e.target.value))}
            >
              {view.periods.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          {view.error && (
            <p role="alert" style={NOTICE}>
              {view.error}
            </p>
          )}
          {view.loading && <p className={cx('sub')}>주문 내역을 불러오고 있어요.</p>}
          {view.empty && (
            <section
              className={cx('panel')}
              style={{
                padding: '56px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <span>이 기간에 해당하는 주문이 없어요.</span>
              <Link className={cx('btn btn-p')} to="/">
                쇼핑하러 가기
              </Link>
            </section>
          )}
          {rows.length > 0 && (
            <section className={cx('panel')}>
              {rows.map((r) => (
                <article
                  key={r.key}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px 20px',
                    alignItems: 'center',
                    padding: '20px 24px',
                    borderTop: '1px solid #E8E8ED',
                  }}
                >
                  <div
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '6px',
                      background: '#F1F1F4',
                      overflow: 'hidden',
                      flex: 'none',
                    }}
                  >
                    {r.img && (
                      <img
                        src={r.img}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    )}
                  </div>
                  <div
                    style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}
                  >
                    <span className={cx('sub num')}>
                      {r.date}{' '}
                      <Link to={r.url} style={{ color: '#5F5F6A' }}>
                        {r.orderNumber}
                      </Link>
                    </span>
                    <Link to={r.url} style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                      {r.name}
                    </Link>
                    <strong className={cx('num')} style={{ fontWeight: '700' }}>
                      {r.amount}원
                    </strong>
                  </div>
                  <div
                    style={{
                      flex: '0 1 220px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span className={cx(`chip ${r.chip}`)}>{r.label}</span>
                    {r.note &&
                      (r.note.warn ? (
                        <span className={cx('num')} style={{ color: '#A33A1F', fontWeight: '700' }}>
                          {r.note.text}
                        </span>
                      ) : (
                        <span className={cx('sub')}>{r.note.text}</span>
                      ))}
                  </div>
                  <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}>
                    {r.payUrl && (
                      <Link className={cx('btn btn-p')} to={r.payUrl} style={SMALL_BTN}>
                        결제하기
                      </Link>
                    )}
                    {r.confirm && (
                      <button className={cx('btn')} onClick={r.confirm} disabled={busy} style={SMALL_BTN}>
                        구매 확정하기
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
          <Pager page={view.page} totalPages={view.totalPages} onChange={view.setPage} buttonClassName={cx('btn')} />
        </div>
      </div>
      <NoticeModal notice={view.notice} onClose={view.closeNotice} />
    </div>
  )
}
