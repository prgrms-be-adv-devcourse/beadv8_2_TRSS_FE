import { Fragment, useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  fmtMonth,
  getMyExpectedSettlement,
  getMySettlement,
  getMySettlements,
  type SellerSettlement,
  type SellerSettlementDetail,
  type SettlementSellerStatus,
} from '../../lib/api/settlement'
import { useActiveSeller } from '../../lib/activeSeller'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, Pager, fmtMD, fmtMDHM } from './shared'
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

/** '2026-11-10' 또는 '2026-10-10T00:12:00' → '11월 10일' */
const fmtMonthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`

const THIS_YEAR = new Date().getFullYear()
const YEARS = [THIS_YEAR, THIS_YEAR - 1]
const MONTHS = Array.from({ length: 12 }, (_, i) => String(12 - i).padStart(2, '0'))

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
  const [year, setYear] = useState(THIS_YEAR)
  const [month, setMonth] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [notice, setNotice] = useState('')

  const expected = useApi(getMyExpectedSettlement, [])
  const lastPaid = useApi(() => getMySettlements({ status: 'PAID', size: 1 }), [])
  const monthParam = month ? `${year}-${month}` : undefined
  const list = useApi(
    () => getMySettlements({ month: monthParam, page: toPageParam(page), size: PAGE_SIZE }),
    [monthParam, page],
  )
  const { detail, error: detailError } = useDetail(selectedId)

  // '전체 월'이면 백엔드에 연도 조건이 없어 지금 페이지 안에서 연도로 걸러요.
  const items = (list.data?.items ?? []).filter((x) => !!month || x.settlementMonth.startsWith(String(year)))
  const exp = expected.data
  const nextMonth = exp?.months[0]
  const paid = lastPaid.data?.items[0] ?? null
  const changePage = (n: number) => {
    setPage(n)
    setSelectedId(null)
  }
  const toggle = (id: number) => setSelectedId((cur) => (cur === id ? null : id))
  const changeFilter = (fn: () => void) => {
    fn()
    setPage(1)
    setSelectedId(null)
  }

  // TODO(API 미구현): 정산서 엑셀 다운로드 (기간 전체 · 월별) — 백엔드 API가 없어 안내만 띄워요.
  const downloadExcel = (target?: SellerSettlement) =>
    setNotice(
      `${target ? `${fmtMonth(target.settlementMonth)} 정산서` : '고른 기간 정산서'} 엑셀 다운로드는 준비 중이에요.`,
    )

  const cardError = expected.error ?? lastPaid.error

  const detailBlock = (s0: SellerSettlement) => {
    if (selectedId !== s0.settlementId) return null
    if (detailError) return <Notice tone="error">{detailError}</Notice>
    if (!detail) return <Loading label="정산서를 불러오고 있어요" />
    return (
      <div className={s.detail}>
        <p className={s.detailHead}>
          {fmtMonth(detail.settlement.settlementMonth)} 정산서 · 품목 {detail.items.length}개 · 받는 금액{' '}
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
                  {fmtMD(it.confirmedAt)} · 주문 #{it.orderId}
                  {it.carriedOver && ' · 이월'}
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

  let listBody
  if (list.loading && !list.data) listBody = <Loading label="정산서를 불러오고 있어요" />
  else if (list.error) listBody = <ErrorView message={list.error} onRetry={list.reload} />
  else if (items.length === 0)
    listBody = <Empty title="정산서가 없어요">매달 10일에 지난달 구매 확정분으로 만들어져요.</Empty>
  else if (desktop)
    listBody = (
      <div role="table" className={c.table} aria-busy={list.loading}>
        <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
          <span>정산월</span>
          <span>판매 대금</span>
          <span>수수료 10%</span>
          <span>지급액</span>
          <span>상태</span>
          <span>지급일</span>
          <span>정산서</span>
        </div>
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
                <span className={c.num}>{x.paidAt ? fmtMDHM(x.paidAt) : '-'}</span>
                <span onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`${fmtMonth(x.settlementMonth)} 정산서 엑셀 다운로드`}
                    onClick={() => downloadExcel(x)}
                  >
                    <Icon name="download" size={14} />
                    엑셀
                  </Button>
                </span>
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
                      판매 {won(x.totalSalePrice)} · 수수료 {won(x.totalFee)}
                    </span>
                    <span className={s.faint}>지급일 {x.paidAt ? fmtMD(x.paidAt) : '-'}</span>
                  </span>
                  <span className={s.monthPay}>
                    <b>{won(x.payoutAmount)}</b>
                    <Badge tone={TONE[x.status]}>{x.statusLabel}</Badge>
                  </span>
                </button>
                <button
                  type="button"
                  className={s.iconBtn}
                  aria-label={`${fmtMonth(x.settlementMonth)} 정산서 엑셀 다운로드`}
                  onClick={() => downloadExcel(x)}
                >
                  <Icon name="download" size={18} />
                </button>
              </div>
              {detailBlock(x)}
            </li>
          )
        })}
      </ul>
    )

  const filters = (
    <>
      <select
        aria-label="연도"
        className={c.select}
        value={year}
        onChange={(e) => changeFilter(() => setYear(Number(e.target.value)))}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
      <select
        aria-label="월"
        className={c.select}
        value={month}
        onChange={(e) => changeFilter(() => setMonth(e.target.value))}
      >
        <option value="">전체 월</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {Number(m)}월
          </option>
        ))}
      </select>
    </>
  )

  return (
    <ConsoleShell
      variant="seller"
      active="settlements"
      title="정산"
      description="매월 10일에 지난달 구매 확정 금액을 예치금 지갑으로 지급해요. 판매 대금은 상품 쿠폰 할인 후 금액이에요."
    >
      {cardError && (
        <div className={desktop ? s.gapBottom : s.mobileBlock}>
          <Notice tone="error">{cardError}</Notice>
        </div>
      )}
      {desktop ? (
        <>
          <div className={c.kpis}>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>
                {nextMonth ? `${Number(nextMonth.settlementMonth.slice(5, 7))}월 예상 지급액` : '예상 지급액'}
              </p>
              <p className={c.kpiValue}>{won(exp?.payoutAmount)}</p>
              <p className={c.kpiSub}>
                {nextMonth ? `구매 확정 기준 · ${fmtMonthDay(nextMonth.expectedPayDate)} 지급` : '정산 예정 금액이 없어요'}
              </p>
            </div>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>아직 정산받지 않은 금액</p>
              <p className={c.kpiValue}>{seller ? won(seller.unsettledAmount) : '-'}</p>
              <p className={c.kpiSub}>철회·탈퇴 확인에 쓰여요</p>
            </div>
            <div className={c.kpi}>
              <p className={c.kpiLabel}>지난 지급액</p>
              <p className={c.kpiValue}>{won(paid?.payoutAmount)}</p>
              <p className={c.kpiSub}>
                {paid?.paidAt ? `${fmtMonthDay(paid.paidAt)} 예치금으로 지급` : '아직 받은 정산금이 없어요'}
              </p>
            </div>
          </div>
          <div className={c.toolbar}>
            <div className={c.toolGroup}>{filters}</div>
            <Button variant="outline" onClick={() => downloadExcel()}>
              <Icon name="download" size={16} />
              엑셀 다운로드 <span className={s.fileTag}>XLSX</span>
            </Button>
          </div>
          {notice && (
            <div className={s.gapBottom}>
              <Notice tone="info" onClose={() => setNotice('')}>
                {notice}
              </Notice>
            </div>
          )}
          {listBody}
          <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={changePage} />
          <p className={s.footNote}>
            정산서 엑셀에는 정산월의 주문 항목별 판매가·수수료·지급액과 구매 확정일이 들어가요. 위 버튼은 고른 기간
            전체를 한 파일로 받아요.
          </p>
        </>
      ) : (
        <>
          <div className={s.summary}>
            <p className={s.summaryLabel}>이번 달 정산 예정 금액</p>
            <p className={s.summaryValue}>{won(exp?.payoutAmount)}</p>
            <dl className={s.summaryDl}>
              <div>
                <dt>판매 금액</dt>
                <dd>{won(exp?.totalSalePrice)}</dd>
              </div>
              <div>
                <dt>수수료 10%</dt>
                <dd>−{won(exp?.totalFee)}</dd>
              </div>
              <div>
                <dt>지급 예정일</dt>
                <dd>{nextMonth ? fmtMonthDay(nextMonth.expectedPayDate) : '-'}</dd>
              </div>
              <div>
                <dt>아직 정산받지 않은 금액</dt>
                <dd>{seller ? won(seller.unsettledAmount) : '-'}</dd>
              </div>
            </dl>
          </div>
          <section className={s.mSection} aria-labelledby="ms">
            <div className={s.sectionHead}>
              <h2 id="ms" className={s.h2}>
                월별 정산서
              </h2>
              <Button variant="outline" size="sm" onClick={() => downloadExcel()}>
                <Icon name="download" size={14} />
                전체 엑셀
              </Button>
            </div>
            <div className={s.selectRow}>{filters}</div>
            {notice && (
              <Notice tone="info" onClose={() => setNotice('')}>
                {notice}
              </Notice>
            )}
            {listBody}
            <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={changePage} />
          </section>
        </>
      )}
    </ConsoleShell>
  )
}
