import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import { Chips, Empty, ErrorView, Loading, Segment, Thumb, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import { confirmOrder, isPayable, type OrderStatus } from '../../lib/api/order'
import { orderNotice } from '../../lib/notices/order'
import { ORDER_STATUS, autoConfirmDate, isoDate, mmdd, mmss } from '../../lib/orderStatus'
import { productImage } from '../../lib/products'
import { useApi } from '../../lib/useApi'
import { getOrderList, type OrderSummaryX } from './api'
import { NoticeModal, ymd, type Notice } from './common'
import { MOCK_RETURNS, RETURN_STATUS, type ReturnRecord } from './returns'
import styles from './OrderList.module.css'

type Filter = 'all' | 'pending' | 'paid' | 'confirmed' | 'returns'
/** 상태 필터. 백엔드에 상태를 여러 개 보내면 그중 하나라도 해당하는 주문이 와요. '반품'은 반품 내역 탭(?tab=returns)이에요 */
const FILTERS: Array<{ value: Filter; label: string; statuses: OrderStatus[] }> = [
  { value: 'all', label: '전체', statuses: [] },
  { value: 'pending', label: '결제 대기', statuses: ['CREATED', 'PAYMENT_FAILED'] },
  { value: 'paid', label: '결제 완료', statuses: ['PAID'] },
  { value: 'confirmed', label: '구매 확정', statuses: ['CONFIRMED'] },
  { value: 'returns', label: '반품', statuses: [] },
]
const PERIODS = [
  { value: '1', label: '최근 1개월' },
  { value: '3', label: '3개월' },
  { value: '6', label: '6개월' },
]
const PAGE_SIZE = 10

/** 오늘에서 n개월 전 날짜 (yyyy-MM-dd) */
function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return isoDate(d)
}

/** 결제 대기 주문의 남은 시간을 1초씩 줄여요. 서버가 준 remainingSeconds에서 불러온 뒤 지난 시간만큼 빼요. */
function useElapsedSeconds(items: OrderSummaryX[] | undefined) {
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

/** 주문 내역 (시안 ⑦ OrderList) · 반품 내역 (?tab=returns) */
export default function OrderListPage() {
  const [params, setParams] = useSearchParams()
  const returnsTab = params.get('tab') === 'returns'
  const [filter, setFilter] = useState<Exclude<Filter, 'returns'>>('all')
  const [period, setPeriod] = useState('1')

  const pick = (v: Filter) => {
    if (v === 'returns') setParams({ tab: 'returns' }, { replace: true })
    else {
      setFilter(v)
      if (returnsTab) setParams({}, { replace: true })
    }
  }

  return (
    <AppFrame tab="my">
      <div className={styles.top}>
        <PageHeader title={returnsTab ? '반품 내역' : '주문 내역'} back />
        <Segment label="기간" items={PERIODS} value={period} onChange={setPeriod} />
        <div className={styles.chips}>
          <Chips
            label="상태 필터"
            items={FILTERS.map((x) => ({ value: x.value, label: x.label }))}
            value={returnsTab ? 'returns' : filter}
            onChange={pick}
          />
        </div>
      </div>
      {returnsTab ? <ReturnList /> : <OrderCards key={`${filter}-${period}`} filter={filter} months={Number(period)} />}
    </AppFrame>
  )
}

function OrderCards({ filter, months }: { filter: Filter; months: number }) {
  const [pages, setPages] = useState(1)
  const list = useApi(
    () =>
      getOrderList({
        statuses: FILTERS.find((x) => x.value === filter)?.statuses ?? [],
        from: monthsAgo(months),
        page: 0,
        // 더 보기를 누르면 처음부터 더 많이 받아요 (백엔드 size 최대 100)
        size: Math.min(100, PAGE_SIZE * pages),
      }),
    [filter, months, pages],
  )
  const items = list.data?.items
  const elapsed = useElapsedSeconds(items)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  /** 구매 확정. 실패하면 안내 모달을 띄우고, 끝나면 목록을 다시 불러와요. */
  const runConfirm = async (o: OrderSummaryX) => {
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
  const askConfirm = (o: OrderSummaryX) =>
    setNotice({
      title: '구매를 확정할까요?',
      body: '확정한 뒤에는 반품을 요청할 수 없어요. 결제한 금액은 판매자에게 정산돼요.',
      actions: [{ label: '돌아가기' }, { label: '구매 확정하기', primary: true, onClick: () => runConfirm(o) }],
    })

  if (list.loading && !list.data) return <Loading label="주문 내역을 불러오고 있어요" />
  if (list.error && !list.data) return <ErrorView message={list.error} onRetry={list.reload} />
  if (!items?.length)
    return (
      <Empty
        title="이 기간에 주문이 없어요"
        action={
          <Button to="/" variant="outline">
            쇼핑하러 가기
          </Button>
        }
      />
    )

  const hasMore = (list.data?.totalElements ?? 0) > items.length && items.length < 100

  return (
    <div className={styles.list}>
      {items.map((o) => {
        const st = ORDER_STATUS[o.status]
        const pending = isPayable(o.status)
        const left = Math.max(0, o.remainingSeconds - elapsed)
        const autoAt = o.paidAt ? autoConfirmDate(o.paidAt) : null
        const name =
          o.itemCount > 1 ? `${o.representativeProductName} 외 ${o.itemCount - 1}개` : o.representativeProductName
        const url = `/orders/${o.orderId}`
        let label = st.label
        let note: { text: string; warn?: boolean } | null = null
        if (pending) note = left > 0 ? { text: `${mmss(left)} 남음`, warn: true } : { text: '결제 시간이 지났어요' }
        else if (o.status === 'PAID') {
          if (o.deliveredAt) label = '배송 완료'
          if (autoAt) note = { text: `${mmdd(autoAt)} 자동 확정` }
        } else if (o.status === 'RETURN_REQUESTED') note = { text: '관리자 확인 중' }
        else if (o.status === 'RETURNED') note = { text: '예치금으로 환불됐어요' }
        return (
          <article key={o.orderId} className={styles.card}>
            <div className={styles.cardHead}>
              <span>{ymd(o.orderedAt)}</span>
              <Link to={url}>상세 ›</Link>
            </div>
            <p className={`${styles.status} ${o.status === 'PAID' ? styles.statusGreen : ''}`}>
              {label}
              {note && <span className={note.warn ? styles.warn : styles.note}>{note.text}</span>}
            </p>
            <Link to={url} className={styles.product}>
              <Thumb
                src={o.thumbnailUrl || productImage(o.representativeProductName)}
                width={60}
                height={64}
                radius={6}
              />
              <div>
                <p className={styles.name}>{name}</p>
                <p className={styles.amount}>{won(o.payAmount ?? o.totalPrice)}</p>
              </div>
            </Link>
            {pending && left > 0 && (
              <div className={styles.actions}>
                <Button to={`/checkout?orderId=${o.orderId}`}>결제하기</Button>
              </div>
            )}
            {o.status === 'PAID' && (
              <div className={styles.actions}>
                <Button variant="outline" to={url}>
                  배송 조회
                </Button>
                <Button variant="soft" onClick={() => askConfirm(o)} disabled={busy}>
                  구매 확정하기
                </Button>
              </div>
            )}
          </article>
        )
      })}
      {hasMore && (
        <div className={styles.more}>
          <Button variant="outline" onClick={() => setPages((p) => p + 1)} disabled={list.loading}>
            더 보기
          </Button>
        </div>
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </div>
  )
}

/**
 * 반품 내역
 * TODO(API 미구현): GET /api/v1/returns 내 반품 내역 — 지금은 목업 데이터예요. 반품 요청 화면에서 막 보낸 요청(state.submitted)은 맨 위에 붙여요
 */
function ReturnList() {
  const submitted = (useLocation().state as { submitted?: ReturnRecord } | null)?.submitted
  const list = submitted ? [submitted, ...MOCK_RETURNS] : MOCK_RETURNS
  return (
    <div className={styles.list}>
      {list.map((r) => {
        const st = RETURN_STATUS[r.status]
        return (
          <article key={r.returnId} className={styles.card}>
            <div className={styles.cardHead}>
              <span>{ymd(r.requestedAt)} 요청</span>
              {r.orderId > 0 && <Link to={`/orders/${r.orderId}`}>주문 상세 ›</Link>}
            </div>
            <p className={styles.status}>
              {st.label}
              <span className={styles.note}>{st.note}</span>
            </p>
            <div className={styles.product}>
              <Thumb src={r.img} width={60} height={64} radius={6} />
              <div>
                <p className={styles.name}>
                  {r.itemCount > 1 ? `${r.productName} 외 ${r.itemCount - 1}개` : r.productName}
                </p>
                <p className={styles.amount}>{won(r.refundAmount)}</p>
              </div>
            </div>
            <p className={styles.reason}>
              사유 · {r.reason}
              {r.rejectReason && <span>반려 사유 · {r.rejectReason}</span>}
            </p>
          </article>
        )
      })}
    </div>
  )
}
