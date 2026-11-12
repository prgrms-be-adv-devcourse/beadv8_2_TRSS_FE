import { Fragment, useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import {
  PageNumbers,
  PeriodFilter,
  StatCard,
  initialPeriod,
  settlementStyles as st,
  type Period,
} from '../../components/settlement/SettlementParts'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  downloadMySettlementsExcel,
  fmtMonth,
  getMyExpectedSettlement,
  getMySettlement,
  getMySettlementSummary,
  getMySettlements,
  type SellerSettlement,
  type SellerSettlementDetail,
  type SettlementSellerStatus,
  type YearMonth,
} from '../../lib/api/settlement'
import { useActiveSeller } from '../../lib/activeSeller'
import { useApi } from '../../lib/useApi'
import { dotMonth, lastMonth, monthOptions } from '../../lib/monthRange'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, fmtMD, fmtMDHM } from './shared'
import s from './seller.module.css'

const PAGE_SIZE = 12
const COLS = '1fr 1fr 1fr 1fr .8fr 1fr .8fr'
const ITEM_COLS = '1fr 1fr 1fr 1fr 1fr .8fr'

/** 판매자 정산서 상태 → 배지 색 (글자는 백엔드 statusLabel을 그대로 써요) */
const TONE: Record<SettlementSellerStatus, Tone> = {
  SCHEDULED: 'blue',
  PAID: 'green',
  DELAYED: 'amber',
  ON_HOLD: 'neutral',
}

/** 매월 정산일 (정책: 매월 10일). 지급 예정 정산서의 지급일 안내에 써요 */
const PAY_DAY = 10

/**
 * 지급일 칸: 지급 완료면 지급 시각, 지급 예정이면 다음 달 정산일 예정, 그 밖(지연, 보류)은 지급 전
 * 예) 2026-10 지급 예정 → '11.10 예정'
 */
const paidDateOf = (x: SellerSettlement) => {
  if (x.paidAt) return fmtMDHM(x.paidAt)
  if (x.status !== 'SCHEDULED') return '지급 전'
  const [y, m] = x.settlementMonth.split('-').map(Number)
  const next = new Date(y, m, PAY_DAY)
  return `${String(next.getMonth() + 1).padStart(2, '0')}.${String(PAY_DAY).padStart(2, '0')} 예정`
}

/** '2026-11-10' 또는 '2026-10-10T00:12:00' → '11월 10일' */
const fmtMonthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`

/** 펼친 정산서의 품목 (자세히) */
function useDetail(selectedId: number | null) {
  const [detail, setDetail] = useState<SellerSettlementDetail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    // 다른 행을 열면 이전 상세를 먼저 지워서, 응답 전·실패 때 남의 상세가 보이지 않게
    setDetail(null)
    setError('')
    if (selectedId === null) return
    let alive = true
    getMySettlement(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])
  return { detail, error }
}

/** S5 정산 */
export default function SellerSettlementsPage() {
  const desktop = useIsDesktop()
  const { seller } = useActiveSeller()
  // 기본 조회 기간: 지난달까지 3개월
  const [period, setPeriod] = useState<Period>(() => initialPeriod('3'))
  const { from, to } = period
  const [months] = useState(monthOptions)
  /** 지난달 지급액 카드의 정산월. 조회 기간과 상관없이 항상 지난달이에요 */
  const [prevMonth] = useState(lastMonth)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; text: string } | null>(null)
  /** 지금 받고 있는 엑셀 ('all' = 기간 전체, 'yyyy-MM' = 그 달) */
  const [downloading, setDownloading] = useState<string | null>(null)

  const expected = useApi(getMyExpectedSettlement, [])
  const summary = useApi(() => getMySettlementSummary(from, to), [from, to])
  const prevSummary = useApi(() => getMySettlementSummary(prevMonth, prevMonth), [prevMonth])
  const list = useApi(() => getMySettlements({ from, to, page: toPageParam(page), size: PAGE_SIZE }), [from, to, page])
  const { detail, error: detailError } = useDetail(selectedId)

  const items = list.data?.items ?? []
  const exp = expected.data
  const nextMonth = exp?.months[0]
  const paidCount = summary.data?.paidCount ?? 0
  /** 지난달 정산서가 지급 완료됐을 때만 있어요 */
  const prevPaid = prevSummary.data?.latestPaid ?? null
  const changePage = (n: number) => {
    setPage(n)
    setSelectedId(null)
  }
  const toggle = (id: number) => setSelectedId((cur) => (cur === id ? null : id))

  /** 기간을 바꾸면 첫 쪽부터 다시 봐요 */
  const changePeriod = (next: Period) => {
    setPeriod(next)
    setPage(1)
    setSelectedId(null)
  }

  /** 지급 완료 정산서 엑셀. month를 주면 그 달만, 없으면 고른 기간 전체 */
  const downloadExcel = async (month?: YearMonth) => {
    const key = month ?? 'all'
    if (downloading) return
    setDownloading(key)
    setNotice(null)
    try {
      await downloadMySettlementsExcel(month ?? from, month ?? to)
    } catch (e) {
      setNotice({ tone: 'error', text: errorMessage(e) })
    } finally {
      setDownloading(null)
    }
  }

  const cardError = expected.error ?? prevSummary.error ?? summary.error
  const rangeLabel = `${dotMonth(from)} ~ ${dotMonth(to)}`
  const allButtonLabel = downloading === 'all' ? '엑셀을 만들고 있어요' : '엑셀 다운로드'

  const detailBlock = (s0: SellerSettlement) => {
    if (selectedId !== s0.settlementId) return null
    if (detailError) return <Notice tone="error">{detailError}</Notice>
    if (!detail) return <Loading label="정산서를 불러오고 있어요" />
    return (
      <div className={s.detail}>
        <p className={s.detailHead}>
          {fmtMonth(detail.settlement.settlementMonth)} 정산서, 품목 {detail.items.length}개, 받는 금액{' '}
          <b>{won(detail.settlement.payoutAmount)}</b>
        </p>
        {desktop ? (
          <div role="table" className={s.innerTable}>
            <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: ITEM_COLS }}>
              <span>구매 확정일</span>
              <span>주문</span>
              <span>판매 금액</span>
              <span>수수료</span>
              <span>받는 금액</span>
              <span />
            </div>
            {detail.items.map((it) => (
              <div role="row" key={it.orderItemId} className={c.tr} style={{ gridTemplateColumns: ITEM_COLS }}>
                <span className={c.num}>{fmtMD(it.confirmedAt)}</span>
                <span className={c.num}>#{it.orderId}</span>
                <span className={c.num}>{won(it.salePrice)}</span>
                <span className={c.num}>{won(it.fee)}</span>
                <span className={c.num}>{won(it.payoutAmount)}</span>
                <span>{it.carriedOver && <Badge>{fmtMonth(it.settlementMonth)} 이월</Badge>}</span>
              </div>
            ))}
          </div>
        ) : (
          <ul className={s.detailList}>
            {detail.items.map((it) => (
              <li key={it.orderItemId}>
                <span>
                  {fmtMD(it.confirmedAt)}, 주문 #{it.orderId}
                  {it.carriedOver && ', 이월'}
                </span>
                <b>{won(it.payoutAmount)}</b>
              </li>
            ))}
          </ul>
        )}
        <p className={s.faintLine}>
          이월 표시는 지난달 정산서가 만들어진 뒤에 구매 확정되어 이번 정산서에 들어온 품목이에요.
        </p>
      </div>
    )
  }

  /** 행의 정산서 받기: 지급 완료만 엑셀, 나머지는 금액이 바뀔 수 있어 지급 뒤에 받아요 */
  const rowDownload = (x: SellerSettlement, compact: boolean) => {
    if (x.status !== 'PAID') return <span className={s.faint}>지급 전</span>
    const busy = downloading === x.settlementMonth
    const label = `${fmtMonth(x.settlementMonth)} 정산서 엑셀 받기`
    return compact ? (
      <button
        type="button"
        className={s.iconBtn}
        aria-label={label}
        disabled={!!downloading}
        aria-busy={busy}
        onClick={() => downloadExcel(x.settlementMonth)}
      >
        <Icon name="download" size={18} />
      </button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        aria-label={label}
        disabled={!!downloading}
        onClick={() => downloadExcel(x.settlementMonth)}
      >
        <Icon name="download" size={14} />
        {busy ? '받는 중' : '개별 엑셀 다운로드'}
      </Button>
    )
  }

  const listHead = (
    <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
      <span>정산월</span>
      <span>판매 대금</span>
      <span>수수료 10%</span>
      <span>지급액</span>
      <span>상태</span>
      <span>지급일</span>
      <span>정산서</span>
    </div>
  )

  /** 목록 대신 보여 줄 상태 (불러오는 중, 오류, 빈 목록) */
  let listState = null
  if (list.loading && !list.data) listState = <Loading label="정산서를 불러오고 있어요" />
  else if (list.error) listState = <ErrorView message={list.error} onRetry={list.reload} />
  else if (items.length === 0)
    listState = (
      <Empty title="이 기간에 정산서가 없어요">
        매달 10일에 지난달 구매 확정분으로 만들어져요. 기간을 바꿔 보세요.
      </Empty>
    )

  let listBody
  // 상태 문구도 정산서 목록과 같은 네모 영역 안에 보여요 (PC는 표 머리까지 같이)
  if (listState)
    listBody = desktop ? (
      <div role="table" className={c.table}>
        {listHead}
        {listState}
      </div>
    ) : (
      <div className={s.listStateBox}>{listState}</div>
    )
  else if (desktop)
    listBody = (
      <div role="table" className={c.table} aria-busy={list.loading}>
        {listHead}
        {items.map((x) => {
          const open = selectedId === x.settlementId
          return (
            <Fragment key={x.settlementId}>
              <div
                role="row"
                className={`${c.tr} ${c.clickable} ${open ? c.selected : ''}`}
                style={{ gridTemplateColumns: COLS }}
                onClick={() => toggle(x.settlementId)}
                aria-expanded={open}
              >
                <span className={c.strong}>{fmtMonth(x.settlementMonth)}</span>
                <span className={c.num}>{won(x.totalSalePrice)}</span>
                <span className={c.num}>{won(x.totalFee)}</span>
                <span className={c.num}>
                  <b>{won(x.payoutAmount)}</b>
                </span>
                <span>
                  <Badge tone={TONE[x.status]}>{x.statusLabel}</Badge>
                </span>
                <span className={c.num}>{paidDateOf(x)}</span>
                <span onClick={(e) => e.stopPropagation()}>{rowDownload(x, false)}</span>
              </div>
              {open && <div className={s.detailRow}>{detailBlock(x)}</div>}
            </Fragment>
          )
        })}
      </div>
    )
  else
    listBody = (
      <ul className={s.monthList}>
        {items.map((x) => {
          const open = selectedId === x.settlementId
          return (
            <li key={x.settlementId}>
              <div className={s.monthRow}>
                <button
                  type="button"
                  className={s.monthMain}
                  onClick={() => toggle(x.settlementId)}
                  aria-expanded={open}
                >
                  <span className={s.prodText}>
                    <b>{fmtMonth(x.settlementMonth)}</b>
                    <span className={s.faint}>
                      판매 {won(x.totalSalePrice)}, 수수료 {won(x.totalFee)}
                    </span>
                    <span className={s.faint}>
                      {x.paidAt ? `${fmtMD(x.paidAt)} 지급` : '지급되면 엑셀로 받을 수 있어요'}
                    </span>
                  </span>
                  <span className={s.monthPay}>
                    <b>{won(x.payoutAmount)}</b>
                    <Badge tone={TONE[x.status]}>{x.statusLabel}</Badge>
                  </span>
                </button>
                {rowDownload(x, true)}
              </div>
              {detailBlock(x)}
            </li>
          )
        })}
      </ul>
    )

  const allButton = (size?: 'sm') => (
    <Button
      variant="primary"
      size={size}
      disabled={paidCount === 0 || !!downloading}
      aria-busy={downloading === 'all'}
      onClick={() => downloadExcel()}
    >
      <Icon name="download" size={size ? 14 : 16} />
      {allButtonLabel}
    </Button>
  )

  const noticeBlock = notice && (
    <div className={s.gapBottom}>
      <Notice tone={notice.tone} onClose={() => setNotice(null)}>
        {notice.text}
      </Notice>
    </div>
  )

  return (
    <ConsoleShell
      variant="seller"
      active="settlements"
      title="정산 내역"
      description="매월 10일에 지난달 구매 확정 금액을 예치금 지갑으로 지급해요. 판매 대금은 상품 쿠폰 할인 후 금액이에요."
    >
      <div className={s.settlementPage}>
        {cardError && (
          <div className={s.gapBottom}>
            <Notice tone="error">{cardError}</Notice>
          </div>
        )}

        <section className={st.section} aria-label="지급 요약">
          <div className={st.cards}>
            <StatCard
              label="이번 달 지급 예정액"
              value={won(exp?.payoutAmount)}
              sub={
                nextMonth
                  ? `${fmtMonth(nextMonth.settlementMonth)} 구매 확정 기준, ${fmtMonthDay(nextMonth.expectedPayDate)} 지급 예정`
                  : '정산 예정 금액이 없어요'
              }
            />
            <StatCard
              label="지난 달 지급액"
              value={won(prevPaid?.payoutAmount)}
              sub={
                prevPaid?.paidAt
                  ? `${fmtMonth(prevMonth)} 정산, ${fmtMonthDay(prevPaid.paidAt)} 예치금으로 지급`
                  : '직전 달 지급 내역이 없어요'
              }
            />
          </div>
          {!desktop && seller && (
            <p className={s.faintLine}>
              아직 정산받지 않은 금액 {won(seller.unsettledAmount)} (철회, 탈퇴 확인에 쓰여요)
            </p>
          )}
        </section>

        <section className={st.section} aria-labelledby="settlement-search">
          <h2 id="settlement-search" className={st.sectionTitle}>
            정산 조회
          </h2>
          <div className={st.toolbarRow}>
            <PeriodFilter value={period} quickOptions={['3', '6', '12']} months={months} onChange={changePeriod} />
            {allButton(desktop ? undefined : 'sm')}
          </div>
          <StatCard
            label={`지급 완료액 (${rangeLabel}, 총 ${paidCount}건 지급 완료)`}
            value={won(summary.data?.paidAmount)}
          />
          {noticeBlock}
          {listBody}
          <PageNumbers
            page={page}
            totalPages={list.data?.totalPages ?? 0}
            onChange={changePage}
            size={desktop ? 7 : 5}
          />
          <p className={s.footNote}>
            엑셀에는 지급 완료된 정산서의 주문 항목별 판매가, 수수료, 지급액과 구매 확정 시각이 들어가요. 1개월 단위로
            최대 12개월까지 한 파일로 받을 수 있고, 행의 엑셀 버튼은 그 달만 받아요.
          </p>
        </section>
      </div>
    </ConsoleShell>
  )
}
