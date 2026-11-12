import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Overlay'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, won } from '../../components/ui/Misc'
import {
  Dropdown,
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
  downloadSettlementsExcel,
  fmtMonth,
  getRunnableSettlementMonths,
  getSettlementPreview,
  getSettlementRuns,
  getSettlementSummary,
  getSettlements,
  holdSettlement,
  releaseSettlement,
  retrySettlement,
  runSettlement,
  type Settlement,
  type SettlementAdminStatusGroup,
  type SettlementPreview,
  type SettlementRun,
  type YearMonth,
} from '../../lib/api/settlement'
import { monthOptions } from '../../lib/monthRange'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { SETTLEMENT_STATUS } from './settlementMeta'
import { mmddhm, retryHint, sellerName, ym } from './format'
import { Notice, ReasonModal, Row } from './parts'
import SettlementDrawer from './SettlementDrawer'
import s from './AdminFinance.module.css'

const PAGE_SIZE = 20
const PREVIEW_SIZE = 20

/** 상태 탭. ALL = 전체, 나머지는 BE SettlementAdminStatusGroup */
type Tab = 'ALL' | SettlementAdminStatusGroup
const TAB_LABEL: Record<Tab, string> = {
  ALL: '전체',
  ACTION_REQUIRED: '처리 필요',
  SCHEDULED: '지급 예정',
  PAID: '지급 완료',
  ON_HOLD: '보류',
}
const TAB_ORDER: Tab[] = ['ALL', 'ACTION_REQUIRED', 'SCHEDULED', 'PAID', 'ON_HOLD']
const isTab = (v: string | null): v is Tab => TAB_ORDER.some((t) => t === v)
/** 예전 ?status= 링크 → 상태 탭 */
const LEGACY_STATUS_TAB: Record<string, Tab> = {
  READY: 'SCHEDULED',
  PAID: 'PAID',
  FAILED: 'ACTION_REQUIRED',
  MANUAL_REQUIRED: 'ACTION_REQUIRED',
  HOLD: 'ON_HOLD',
}

const COLS = '1.2fr .6fr 1fr .8fr 1fr .9fr 1.4fr .5fr .9fr'
const PREVIEW_COLS = '1.4fr .7fr 1fr 1fr 1fr 1.2fr'

/** 월 정산 Job 실행 상태 → [점 색, 글자] */
const RUN_STATUS: Record<string, [string, string]> = {
  COMPLETED: ['var(--green-ink)', '완료'],
  STARTED: ['var(--amber-ink)', '실행 중'],
  STARTING: ['var(--amber-ink)', '실행 중'],
  FAILED: ['var(--red-ink)', '실행 실패'],
  STOPPED: ['var(--red-ink)', '실행 중단'],
}
const runStatusOf = (r: SettlementRun) => RUN_STATUS[r.status] ?? ['var(--muted)', r.status]
/** '2026-11-10T00:42:10' → '11월 10일' */
const monthDay = (iso: string | null) => (iso ? `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일` : '-')
/** '2026-11-10T00:42:10' → '00:42' */
const hm = (iso: string | null) => (iso ? iso.slice(11, 16) : '-')

/** 사유 칸: 실패면 마지막 실패 원인, 보류면 보류 사유, 지급 완료면 지급 시각 */
const reasonOf = (st: Settlement) => {
  if (st.status === 'MANUAL_REQUIRED' || st.status === 'FAILED') return st.lastFailReason ?? '원인 미상'
  if (st.status === 'HOLD') return st.holdReason ?? ''
  if (st.status === 'PAID') return st.paidAt ? `${mmddhm(st.paidAt)} 지급` : ''
  return ''
}
/** 시도 칸: 지급에 실패한 횟수 (재시도 중, 수동 처리 필요만) */
const triesOf = (st: Settlement) =>
  st.status === 'MANUAL_REQUIRED' || st.status === 'FAILED' ? `${st.retryCount}회` : '-'
/** 재시도 중이면 다음 재시도 시각 안내 (행에 마우스를 올리면 보여요) */
const retryTitle = (st: Settlement) => (st.status === 'FAILED' ? retryHint(st.nextRetryAt) : undefined)

/** 관리자 · 정산 내역 (A6) */
export default function AdminSettlements() {
  const desktop = useIsDesktop()
  const [params] = useSearchParams()
  const thisMonth = ym(new Date())
  const [months] = useState(monthOptions)
  // 기본 조회 기간: 지난달 한 달
  const [period, setPeriod] = useState<Period>(() => initialPeriod('1'))
  const { from, to } = period
  const [sellerInput, setSellerInput] = useState('')
  const [sellerId, setSellerId] = useState<number | undefined>(undefined)
  const [sellerError, setSellerError] = useState('')
  const [tab, setTab] = useState<Tab>(() => {
    const q = params.get('group')
    if (isTab(q)) return q
    // 예전 링크(?status=MANUAL_REQUIRED 등)도 같은 탭으로 열어요
    return LEGACY_STATUS_TAB[params.get('status') ?? ''] ?? 'ALL'
  })
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [runOpen, setRunOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [releasingId, setReleasingId] = useState<number | null>(null)
  /** 지금 받고 있는 엑셀 ('all' = 조회 조건 전체, 정산서 ID = 그 정산서) */
  const [downloading, setDownloading] = useState<string | null>(null)
  // 모달 · 상세
  const [retryTarget, setRetryTarget] = useState<Settlement | null>(null)
  const [holdTarget, setHoldTarget] = useState<Settlement | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailKey, setDetailKey] = useState(0)

  const group = tab === 'ALL' ? undefined : tab

  const runs = useApi(() => getSettlementRuns({ size: 1 }), [])
  const summary = useApi(() => getSettlementSummary({ from, to, sellerId }), [from, to, sellerId])
  const list = useApi(
    () => getSettlements({ from, to, group, sellerId, page: toPageParam(page), size: PAGE_SIZE }),
    [from, to, group, sellerId, page],
  )

  // 조건이 바뀌면 첫 쪽부터, 이전 조건의 목록은 지워요 (새 응답 전까지 다른 조건의 행과 버튼이 보이지 않게)
  useEffect(() => {
    setPage(1)
    list.setData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, tab, sellerId])

  // 지급·보류 해제로 마지막 쪽이 비면 남은 마지막 쪽으로 옮겨요
  useEffect(() => {
    const d = list.data
    if (!list.loading && d && page > 1 && d.items.length === 0 && page > d.totalPages)
      setPage(Math.max(1, d.totalPages))
  }, [list.data, list.loading, page])

  function refresh() {
    list.reload()
    summary.reload()
    setDetailKey((k) => k + 1)
  }
  function say(msg: string) {
    setNotice(msg)
    setActionError('')
  }

  function changePeriod(next: Period) {
    setPeriod(next)
    setNotice('')
    setActionError('')
  }
  /**
   * 판매자 조건을 반영해요. 지금은 판매자 ID(숫자)로만 찾을 수 있어요.
   * TODO(백엔드): 상호명 검색 API가 생기면 글자 입력도 받아요.
   */
  function applySeller() {
    const v = sellerInput.trim()
    setSellerError('')
    if (v === '') return setSellerId(undefined)
    const n = Number(v)
    if (Number.isInteger(n) && n > 0) return setSellerId(n)
    // 이전 판매자 조건이 남으면 입력칸과 다른 판매자의 목록·엑셀이 보여서 조건을 풀어요
    setSellerId(undefined)
    setSellerError('상호명 검색은 아직 지원하지 않아요. 판매자 ID(숫자)로 찾아 주세요.')
  }

  async function confirmRetry(reason: string): Promise<string | void> {
    if (!retryTarget) return
    const t = retryTarget
    const r = await retrySettlement(t.settlementId, reason)
    if (r.status === 'PAID') {
      say(`${sellerName(t)} ${fmtMonth(t.settlementMonth)} 정산을 지급했어요.`)
      runs.reload()
      refresh()
      return
    }
    // 모달의 실패 횟수·마지막 실패 원인도 이번 결과로 바꿔요
    setRetryTarget({
      ...t,
      status: r.status,
      retryCount: r.retryCount,
      lastFailReason: r.lastFailReason,
      nextRetryAt: r.nextRetryAt,
    })
    refresh()
    return r.processed
      ? `다시 실패했어요: ${r.lastFailReason ?? '원인을 알 수 없어요'}`
      : '지금은 다시 실행할 수 없는 상태예요. 목록을 새로고침해 주세요.'
  }

  async function confirmHold(reason: string) {
    if (!holdTarget) return
    await holdSettlement(holdTarget.settlementId, reason)
    say(`${sellerName(holdTarget)} 정산서를 보류했어요.`)
    refresh()
  }

  async function release(target: Settlement) {
    if (releasingId !== null) return // 두 번 누르면 두 번째 요청이 409로 실패해요
    setReleasingId(target.settlementId)
    setNotice('')
    setActionError('')
    try {
      await releaseSettlement(target.settlementId)
      say(`${sellerName(target)} 정산서 보류를 풀었어요. 재시도 스케줄러가 곧 지급해요.`)
      refresh()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setReleasingId(null)
    }
  }

  /** 지급 완료 정산서 엑셀. target이 있으면 그 정산서(판매자 1명, 그 달)만, 없으면 지금 조회 조건 전체 */
  async function downloadExcel(target?: Settlement) {
    if (downloading) return
    setDownloading(target ? String(target.settlementId) : 'all')
    setNotice('')
    setActionError('')
    try {
      if (target) await downloadSettlementsExcel(target.settlementMonth, target.settlementMonth, target.sellerId)
      else await downloadSettlementsExcel(from, to, sellerId)
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setDownloading(null)
    }
  }

  const lastRun = runs.data?.items[0] ?? null
  const items = list.error ? [] : (list.data?.items ?? [])
  const k = summary.data
  const paidCount = k?.paidCount ?? 0
  // 탭 글자는 건수 없이 상태 이름만 (건수는 위 정산 현황, 장애 현황 카드에서 봐요)
  const tabItems = TAB_ORDER.map((t) => ({ value: t, label: TAB_LABEL[t] }))
  /** 장애 현황 카드를 누르면 그 탭으로, 다시 누르면 전체로 */
  const toggleTab = (t: Tab) => setTab((cur) => (cur === t ? 'ALL' : t))

  /** 작업 칸: 사람이 할 일이 있는 행에만 버튼 (재시도 중은 자동 처리, 지급 완료는 엑셀) */
  const actionFor = (row: Settlement) => {
    if (row.status === 'MANUAL_REQUIRED')
      return (
        <Button size="sm" onClick={() => setRetryTarget(row)}>
          재처리
        </Button>
      )
    if (row.status === 'HOLD')
      return (
        <Button variant="outline" size="sm" disabled={releasingId !== null} onClick={() => release(row)}>
          {releasingId === row.settlementId ? '푸는 중…' : '보류 해제'}
        </Button>
      )
    if (row.status === 'FAILED') return <span className={c.sub}>자동 처리 중</span>
    if (row.status === 'PAID')
      return (
        <Button
          variant="outline"
          size="sm"
          disabled={!!downloading}
          aria-label={`${sellerName(row)} ${fmtMonth(row.settlementMonth)} 정산서 엑셀 받기`}
          onClick={() => downloadExcel(row)}
        >
          <Icon name="download" size={14} />
          {downloading === String(row.settlementId) ? '받는 중' : '엑셀'}
        </Button>
      )
    return <span className={c.sub}>—</span>
  }

  const headButtons = (
    <div className={s.headActions}>
      <Button variant="outline" size={desktop ? undefined : 'sm'} onClick={() => setPreviewOpen(true)}>
        이번 달 정산 미리 보기
      </Button>
      <Button variant="dangerOutline" size={desktop ? undefined : 'sm'} onClick={() => setRunOpen(true)}>
        수동 정산하기
      </Button>
    </div>
  )

  const excelButton = (
    <Button
      size={desktop ? undefined : 'sm'}
      disabled={paidCount === 0 || !!downloading}
      aria-busy={downloading === 'all'}
      onClick={() => downloadExcel()}
    >
      <Icon name="download" size={desktop ? 16 : 14} />
      {downloading === 'all' ? '엑셀을 만들고 있어요' : '엑셀 다운로드'}
    </Button>
  )

  const listBody =
    list.loading && items.length === 0 ? (
      <Loading />
    ) : list.error ? (
      <ErrorView message={list.error} onRetry={list.reload} />
    ) : items.length === 0 ? (
      <Empty title="조건에 맞는 정산서가 없어요.">기간이나 상태를 바꿔 보세요.</Empty>
    ) : null

  return (
    <ConsoleShell
      variant="admin"
      active="settlements"
      title="정산 내역"
      description="매월 10일 00:00에 자동 실행되고, 05:00까지 모든 정산서가 지급 완료, 수동 처리 필요, 보류 중 하나가 돼요."
      actions={desktop ? headButtons : undefined}
    >
      <div className={s.page}>
        {!desktop && <div className={s.mobileHead}>{headButtons}</div>}
        <Notice>{notice}</Notice>
        <Notice tone="error">{actionError}</Notice>
        {summary.error && <Notice tone="error">{summary.error}</Notice>}

        <section className={st.section} aria-labelledby="status-title">
          <h2 id="status-title" className={st.sectionTitle}>
            정산 현황
          </h2>
          <div className={st.cards}>
            <StatCard
              label={
                lastRun
                  ? `${monthDay(lastRun.startTime)} 자동 실행 (${fmtMonth(lastRun.targetMonth)} 정산)`
                  : '월 정산 자동 실행'
              }
              value={lastRun ? runStatusOf(lastRun)[1] : runs.error ? '불러오지 못했어요' : '기록 없음'}
              dot={lastRun ? runStatusOf(lastRun)[0] : undefined}
              sub={
                lastRun
                  ? `시작 ${hm(lastRun.startTime)}${lastRun.endTime ? ` · 종료 ${hm(lastRun.endTime)}` : ''}`
                  : '매월 10일 00:00에 실행돼요'
              }
            />
            <StatCard label="지급 완료" value={k ? `${k.paidCount}건` : '—'} />
            <StatCard label="지급 금액" value={k ? won(k.paidAmount) : '—'} />
          </div>
        </section>

        <section className={st.section} aria-labelledby="issue-title">
          <h2 id="issue-title" className={st.sectionTitle}>
            장애 현황
          </h2>
          <div className={st.cards}>
            <StatCard
              label="처리 필요"
              value={k ? `${k.actionRequiredCount}건` : '—'}
              sub={
                k
                  ? `재시도 중 ${k.retryingCount}건, 수동 처리 필요 ${k.manualRequiredCount}건`
                  : '자동 재시도 3회 후 수동 처리'
              }
              alert={!!k && k.actionRequiredCount > 0}
              pressed={tab === 'ACTION_REQUIRED'}
              onClick={() => toggleTab('ACTION_REQUIRED')}
            />
            <StatCard
              label="보류"
              value={k ? `${k.onHoldCount}건` : '—'}
              sub="제재, 원장 불일치 판매자"
              pressed={tab === 'ON_HOLD'}
              onClick={() => toggleTab('ON_HOLD')}
            />
          </div>
        </section>

        <section className={st.section} aria-labelledby="list-title">
          <h2 id="list-title" className={st.sectionTitleLg}>
            월 정산 내역
          </h2>
          <PeriodFilter value={period} quickOptions={['1', '3', '6', '12']} months={months} onChange={changePeriod}>
            <span className={st.inlineFilter}>
              <label htmlFor="seller-filter" className={st.filterLabel}>
                판매자
              </label>
              <input
                id="seller-filter"
                type="search"
                placeholder="상호명 또는 판매자 ID"
                value={sellerInput}
                aria-invalid={!!sellerError}
                aria-describedby={sellerError ? 'seller-filter-help' : undefined}
                onChange={(e) => setSellerInput(e.target.value)}
                onBlur={applySeller}
                onKeyDown={(e) => e.key === 'Enter' && applySeller()}
              />
            </span>
          </PeriodFilter>
          {sellerError && (
            <p id="seller-filter-help" className={`${st.help} ${st.helpError}`}>
              {sellerError}
            </p>
          )}
          <div className={st.toolbarRow}>
            {desktop ? (
              <Segment label="정산서 상태" items={tabItems} value={tab} onChange={setTab} />
            ) : (
              <Chips label="정산서 상태" items={tabItems} value={tab} onChange={setTab} />
            )}
            {excelButton}
          </div>

          {desktop ? (
            <div className={c.table} role="table" aria-label="정산서 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>판매자</span>
                <span>정산월</span>
                <span>판매 대금</span>
                <span>수수료</span>
                <span>지급액</span>
                <span>상태</span>
                <span>사유</span>
                <span className={s.center}>시도</span>
                <span>작업</span>
              </div>
              {listBody}
              {items.map((row) => {
                const [tone, label] = SETTLEMENT_STATUS[row.status] ?? ['neutral', row.status]
                const reason = reasonOf(row)
                return (
                  <div
                    key={row.settlementId}
                    role="row"
                    className={`${c.tr} ${c.clickable} ${c.num} ${row.status === 'MANUAL_REQUIRED' ? s.rowAlert : ''}`}
                    style={{ gridTemplateColumns: COLS }}
                    onClick={() => setDetailId(row.settlementId)}
                  >
                    <span className={`${c.ellipsis} ${c.strong}`}>{sellerName(row)}</span>
                    <span>{Number(row.settlementMonth.slice(5, 7))}월</span>
                    <span>{won(row.totalSalePrice)}</span>
                    <span>{won(row.totalFee)}</span>
                    <span className={c.strong}>{won(row.payoutAmount)}</span>
                    <span>
                      <Badge tone={tone}>{label}</Badge>
                    </span>
                    <span className={c.ellipsis} title={retryTitle(row) ?? reason}>
                      {reason || '—'}
                    </span>
                    <span className={s.center}>{triesOf(row)}</span>
                    <span onClick={(e) => e.stopPropagation()}>{actionFor(row)}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {/* 상태 문구도 카드 목록과 같은 네모 영역 안에 보여요 */}
              {listBody && <div className={s.listStateBox}>{listBody}</div>}
              <div className={s.cards}>
                {items.map((row) => {
                  const [tone, label] = SETTLEMENT_STATUS[row.status] ?? ['neutral', row.status]
                  const reason = reasonOf(row)
                  const manual = row.status === 'MANUAL_REQUIRED'
                  return (
                    <article key={row.settlementId} className={s.cardItem}>
                      <button type="button" className={s.cardOpen} onClick={() => setDetailId(row.settlementId)}>
                        <span className={s.cardHead}>
                          <b>
                            {sellerName(row)} · {Number(row.settlementMonth.slice(5, 7))}월
                          </b>
                          <Badge tone={tone}>{label}</Badge>
                        </span>
                        <span className={s.cardHead}>
                          <span className={manual ? s.metaRed : c.sub}>
                            {reason
                              ? `${reason}${triesOf(row) !== '-' ? ` · ${triesOf(row)}` : ''}`
                              : `판매 ${won(row.totalSalePrice)} · 수수료 ${won(row.totalFee)}`}
                          </span>
                          <b>{won(row.payoutAmount)}</b>
                        </span>
                      </button>
                      <div className={s.cardActions}>{actionFor(row)}</div>
                    </article>
                  )
                })}
              </div>
            </>
          )}
          <PageNumbers page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} size={desktop ? 7 : 5} />
          <p className={s.foot}>
            재시도 중인 건은 자동으로 다시 시도하고, 3회 실패하면 수동 처리로 넘어가요. 행을 누르면 품목과 처리 이력을
            볼 수 있어요. 엑셀에는 지급 완료 정산서만 들어가요.
          </p>
        </section>
      </div>

      {previewOpen && <PreviewSheet month={thisMonth} desktop={desktop} onClose={() => setPreviewOpen(false)} />}

      {runOpen && (
        <ManualRunSheet
          onClose={() => setRunOpen(false)}
          onDone={(msg) => {
            say(msg)
            runs.reload()
            refresh()
          }}
          onError={setActionError}
        />
      )}

      {retryTarget && (
        <ReasonModal
          title={`${sellerName(retryTarget)} ${Number(retryTarget.settlementMonth.slice(5, 7))}월 정산을 다시 실행할까요?`}
          label="다시 실행하는 사유"
          placeholder="예: 판매자가 정산 계좌를 수정해서 다시 지급해요."
          help="입력한 사유는 처리 이력에 남아요. 같은 정산서는 두 번 지급되지 않아요."
          confirmLabel="다시 실행하기"
          onConfirm={confirmRetry}
          onClose={() => setRetryTarget(null)}
        >
          <dl className={s.dlBox}>
            <Row label="받을 금액">{won(retryTarget.payoutAmount)}</Row>
            <Row label="실패 횟수">{retryTarget.retryCount}회</Row>
            <Row label="마지막 실패 원인">{retryTarget.lastFailReason ?? '-'}</Row>
          </dl>
        </ReasonModal>
      )}

      {holdTarget && (
        <ReasonModal
          title={`${sellerName(holdTarget)} 정산서를 보류할까요?`}
          label="보류 사유"
          placeholder="예: 판매자 제재 검토 중이라 지급을 멈춰요."
          help="보류를 풀기 전까지 자동 재시도·지급을 하지 않아요."
          confirmLabel="보류하기"
          danger
          onConfirm={confirmHold}
          onClose={() => setHoldTarget(null)}
        >
          <dl className={s.dlBox}>
            <Row label="정산월">{fmtMonth(holdTarget.settlementMonth)}</Row>
            <Row label="받을 금액">{won(holdTarget.payoutAmount)}</Row>
          </dl>
        </ReasonModal>
      )}

      {detailId !== null && (
        <SettlementDrawer
          key={`${detailId}-${detailKey}`}
          settlementId={detailId}
          onClose={() => setDetailId(null)}
          onRetry={setRetryTarget}
          onHold={setHoldTarget}
          onRelease={release}
          releasing={releasingId !== null}
          onChanged={(msg) => {
            say(msg)
            list.reload()
            summary.reload()
          }}
        />
      )}
    </ConsoleShell>
  )
}

/** 이번 달 정산 미리 보기 팝업 (저장하지 않고 단순 조회) */
function PreviewSheet({ month, desktop, onClose }: { month: YearMonth; desktop: boolean; onClose: () => void }) {
  const preview = useApi(() => getSettlementPreview(month, { size: PREVIEW_SIZE }), [month])
  const data = preview.data
  const title = `${fmtMonth(month)} 정산 미리 보기`
  if (!desktop)
    return (
      <Sheet title={title} onClose={onClose}>
        <MobilePreview
          loading={preview.loading && !data}
          error={preview.error}
          reload={preview.reload}
          data={data}
          title={title}
        />
      </Sheet>
    )
  return (
    <Sheet title={title} onClose={onClose}>
      {data && (
        <p className={c.sub}>
          판매자 {data.sellerCount}명 · 품목 {data.itemCount}건 · 받을 금액 {won(data.payoutAmount)} (저장되지 않는 미리
          보기예요)
        </p>
      )}
      {preview.loading && !data ? (
        <Loading />
      ) : preview.error ? (
        <ErrorView message={preview.error} onRetry={preview.reload} />
      ) : !data || data.sellers.items.length === 0 ? (
        <Empty title="이번 달에 정산할 구매 확정 건이 아직 없어요." />
      ) : (
        <div className={s.innerTable}>
          <div className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: PREVIEW_COLS }}>
            <span>판매자</span>
            <span className={s.right}>대상 주문</span>
            <span className={s.right}>판매 금액</span>
            <span className={s.right}>수수료 10%</span>
            <span className={s.right}>받을 금액</span>
            <span>비고</span>
          </div>
          {data.sellers.items.map((p) => (
            <div key={p.sellerId} className={`${c.tr} ${c.num}`} style={{ gridTemplateColumns: PREVIEW_COLS }}>
              <span className={c.ellipsis}>{sellerName(p)}</span>
              <span className={s.right}>
                {p.itemCount}
                {p.carriedOverCount > 0 && <span className={c.sub}>이월 {p.carriedOverCount}</span>}
              </span>
              <span className={s.right}>{won(p.totalSalePrice)}</span>
              <span className={s.right}>{won(p.totalFee)}</span>
              <span className={`${s.right} ${c.strong}`}>{won(p.payoutAmount)}</span>
              <span className={s.badges}>
                {p.willHold && <Badge tone="amber">보류 예정</Badge>}
                {p.carriedToNextMonth && <Badge>다음 달 이월</Badge>}
                {p.existingSettlementStatus && (
                  <Badge tone={SETTLEMENT_STATUS[p.existingSettlementStatus][0]}>
                    {SETTLEMENT_STATUS[p.existingSettlementStatus][1]}
                  </Badge>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

/**
 * 월 정산 수동 실행 (A6-1). 자동 실행이 실패했거나 실행되지 않은 끝난 달에만 쓰는 최후의 수단이라
 * 그런 달만 고를 수 있고, 원인을 확인했다는 체크를 해야 실행 버튼이 켜져요.
 */
function ManualRunSheet({
  onClose,
  onDone,
  onError,
}: {
  onClose: () => void
  onDone: (msg: string) => void
  onError: (msg: string) => void
}) {
  const runnable = useApi(getRunnableSettlementMonths, [])
  const recent = useApi(() => getSettlementRuns({ size: 3 }), [])
  const [month, setMonth] = useState<YearMonth>('')
  const [checked, setChecked] = useState(false)
  const [running, setRunning] = useState(false)

  const options = runnable.data ?? []
  const selected = month || options[0]?.settlementMonth || ''

  async function run() {
    if (!selected || !checked || running) return
    setRunning(true)
    try {
      // 서버가 Job이 끝날 때까지 기다렸다가 응답해요 (판매자가 많으면 몇 초 걸려요)
      const r = await runSettlement(selected)
      onDone(
        `${fmtMonth(selected)} 정산을 실행했어요. 지급 ${r.paidCount}건, 실패 ${r.failedCount + r.manualRequiredCount}건`,
      )
      onClose()
    } catch (e) {
      // 409-SETTLEMENT_RUNNING, 409-SETTLEMENT_ALREADY_COMPLETED 등 백엔드 문구
      onError(errorMessage(e))
      onClose()
    } finally {
      setRunning(false)
    }
  }

  return (
    <Sheet
      title="월 정산 수동 실행"
      onClose={running ? () => undefined : onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={running}>
            닫기
          </Button>
          <Button variant="danger" onClick={run} disabled={!selected || !checked || running}>
            {running ? '실행 중…' : selected ? `${fmtMonth(selected)} 정산 실행` : '실행할 달이 없어요'}
          </Button>
        </>
      }
    >
      <p className={s.wrapText}>
        매월 10일 00:00 자동 실행이 실패했거나 실행되지 않은 끝난 달에만 써요. 실패한 달은 멈춘 단계부터 이어서
        실행되고, 이미 지급된 정산서는 다시 지급되지 않아요.
      </p>

      <h3 className={s.blockTitle}>최근 실행</h3>
      {recent.loading && !recent.data ? (
        <Loading />
      ) : recent.error ? (
        <ErrorView message={recent.error} onRetry={recent.reload} />
      ) : (recent.data?.items ?? []).length === 0 ? (
        <p className={c.sub}>아직 실행 기록이 없어요.</p>
      ) : (
        <dl className={s.dlBox}>
          {recent.data!.items.map((r) => (
            <Row key={r.jobExecutionId} label={fmtMonth(r.targetMonth)}>
              <span style={{ color: runStatusOf(r)[0] }}>
                {runStatusOf(r)[1]} · {mmddhm(r.startTime)}
              </span>
            </Row>
          ))}
        </dl>
      )}

      {runnable.loading && !runnable.data ? (
        <Loading />
      ) : runnable.error ? (
        <ErrorView message={runnable.error} onRetry={runnable.reload} />
      ) : options.length === 0 ? (
        <Empty title="지금 수동으로 실행할 달이 없어요.">자동 실행이 모두 정상으로 끝났어요.</Empty>
      ) : (
        <>
          {/* label로 감싸면 항목을 누를 때 label이 버튼을 다시 눌러 목록이 다시 열려서 div로 둬요 */}
          <div className={s.fieldLabel}>
            <span aria-hidden="true">실행할 달 (실패했거나 실행되지 않은 달만 보여요)</span>
            <Dropdown
              label="실행할 달"
              value={selected}
              options={options.map((o) => ({
                value: o.settlementMonth,
                label: `${fmtMonth(o.settlementMonth)} · ${o.reason === 'FAILED' ? '실패' : '실행 안 됨'}`,
              }))}
              onChange={setMonth}
            />
          </div>
          <label className={s.checkRow}>
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            실패 원인을 확인했고, 다시 실행해도 된다는 걸 확인했어요
          </label>
        </>
      )}
    </Sheet>
  )
}

/** 모바일 미리 보기 (판매자별 카드) */
function MobilePreview({
  loading,
  error,
  reload,
  data,
  title,
}: {
  loading: boolean
  error: string | null
  reload: () => void
  data: SettlementPreview | null
  title: string
}) {
  return (
    <section className={s.mobileSection}>
      <h2 className={s.blockTitle}>{title}</h2>
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data || data.sellers.items.length === 0 ? (
        <Empty title="이번 달에 정산할 구매 확정 건이 아직 없어요." />
      ) : (
        <>
          <p className={c.sub}>
            판매자 {data.sellerCount}명 · 품목 {data.itemCount}건 · 받을 금액 {won(data.payoutAmount)}
          </p>
          <ul className={s.plainList}>
            {data.sellers.items.map((p) => (
              <li key={p.sellerId}>
                <span className={c.ellipsis}>
                  {sellerName(p)} · {p.itemCount}건{p.willHold ? ' · 보류 예정' : ''}
                </span>
                <b>{won(p.payoutAmount)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
