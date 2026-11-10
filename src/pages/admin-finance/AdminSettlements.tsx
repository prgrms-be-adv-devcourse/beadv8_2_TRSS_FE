import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Overlay'
import { Badge, Chips, Empty, ErrorView, Loading, Segment, won } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  fmtMonth,
  getSettlementPreview,
  getSettlementRuns,
  getSettlements,
  holdSettlement,
  releaseSettlement,
  retrySettlement,
  runSettlement,
  type Settlement,
  type SettlementPreview,
  type SettlementStatus,
  type YearMonth,
} from '../../lib/api/settlement'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { SETTLEMENT_STATUS, canHold } from './settlementMeta'
import { finishedMonths, mmdd, retryHint, sellerName, ym } from './format'
import { Notice, Pager, ReasonModal, Row } from './parts'
import SettlementDrawer from './SettlementDrawer'
import s from './AdminFinance.module.css'

const PAGE_SIZE = 20
const PREVIEW_SIZE = 20

type Tab = 'ALL' | SettlementStatus
const TABS: { value: Tab; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'READY', label: '지급 대기' },
  { value: 'PAID', label: '지급 완료' },
  { value: 'FAILED', label: '실패' },
  { value: 'MANUAL_REQUIRED', label: '수동 처리 필요' },
  { value: 'HOLD', label: '보류' },
]
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.value === v)

const COLS = '1fr 1fr .8fr 1fr 1fr .4fr 1.2fr .8fr .7fr'
const PREVIEW_COLS = '1.4fr .7fr 1fr 1fr 1fr 1.2fr'

/** 표에 보일 원인: 보류면 보류 사유, 실패면 마지막 실패 원인 (지급 완료·대기는 예전 실패 정보가 남아 있어도 비워요) */
const reasonOf = (st: Settlement) =>
  st.status === 'HOLD'
    ? (st.holdReason ?? '')
    : st.status === 'FAILED' || st.status === 'MANUAL_REQUIRED'
      ? (st.lastFailReason ?? '')
      : ''

/** 관리자 · 월 정산 (A6) */
export default function AdminSettlements() {
  const desktop = useIsDesktop()
  const [params] = useSearchParams()
  const months = finishedMonths()
  const thisMonth = ym(new Date())
  const [month, setMonth] = useState<YearMonth>(months[0])
  const [tab, setTab] = useState<Tab>(() => {
    const q = params.get('status')
    return isTab(q) ? q : 'ALL'
  })
  const [page, setPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [askRun, setAskRun] = useState(false)
  const [running, setRunning] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [releasingId, setReleasingId] = useState<number | null>(null)
  // 모달 · 상세
  const [retryTarget, setRetryTarget] = useState<Settlement | null>(null)
  const [holdTarget, setHoldTarget] = useState<Settlement | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailKey, setDetailKey] = useState(0)

  const status = tab === 'ALL' ? undefined : tab

  const runs = useApi(() => getSettlementRuns({ size: 1 }), [])
  const list = useApi(
    () => getSettlements({ month, status, page: toPageParam(page), size: PAGE_SIZE }),
    [month, status, page],
  )
  // 상태별 건수 (KPI). 건수 API가 없어서 상태별 목록의 totalElements로 세요
  const counts = useApi(async () => {
    const count = (st: SettlementStatus) => getSettlements({ month, status: st, size: 1 }).then((r) => r.totalElements)
    const [paid, failed, manual, hold] = await Promise.all([
      count('PAID'),
      count('FAILED'),
      count('MANUAL_REQUIRED'),
      count('HOLD'),
    ])
    return { paid, failed, manual, hold }
  }, [month])
  const preview = useApi(
    () => (showPreview ? getSettlementPreview(thisMonth, { size: PREVIEW_SIZE }) : Promise.resolve(null)),
    [thisMonth, showPreview],
  )

  // 정산월·탭이 바뀌면 첫 페이지부터, 이전 조건의 목록은 지워요 (새 응답 전까지 다른 탭 행과 버튼이 보이지 않게)
  useEffect(() => {
    setPage(1)
    list.setData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tab])

  // 지급·보류 해제로 마지막 페이지가 비면 남은 마지막 페이지로 옮겨요
  useEffect(() => {
    const d = list.data
    if (!list.loading && d && page > 1 && d.items.length === 0 && page > d.totalPages)
      setPage(Math.max(1, d.totalPages))
  }, [list.data, list.loading, page])

  function refresh() {
    list.reload()
    counts.reload()
    setDetailKey((k) => k + 1)
  }
  function say(msg: string) {
    setNotice(msg)
    setActionError('')
  }

  async function run() {
    if (running) return
    setRunning(true)
    setNotice('')
    setActionError('')
    try {
      // 서버가 Job이 끝날 때까지 기다렸다가 응답해요 (판매자가 많으면 몇 초 걸려요)
      const r = await runSettlement(month)
      setNotice(
        `${fmtMonth(month)} 정산을 실행했어요. 지급 ${r.paidCount}건, 실패 ${r.failedCount + r.manualRequiredCount}건`,
      )
      runs.reload()
      refresh()
    } catch (e) {
      // 409-SETTLEMENT_RUNNING, 409-SETTLEMENT_ALREADY_COMPLETED, 400-SETTLEMENT_MONTH_INVALID 등 백엔드 문구
      setActionError(errorMessage(e))
    } finally {
      setRunning(false)
      setAskRun(false)
    }
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

  async function release(st: Settlement) {
    if (releasingId !== null) return // 두 번 누르면 두 번째 요청이 409로 실패해요
    setReleasingId(st.settlementId)
    setNotice('')
    setActionError('')
    try {
      await releaseSettlement(st.settlementId)
      say(`${sellerName(st)} 정산서 보류를 풀었어요. 재시도 스케줄러가 곧 지급해요.`)
      refresh()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setReleasingId(null)
    }
  }

  function downloadExcel(target?: Settlement) {
    // TODO(API 미구현): 정산 엑셀 다운로드 API — 정산월 전체 / 정산서 1건을 XLSX로 내려받기
    say(
      target
        ? `${sellerName(target)} 정산서 엑셀 파일을 준비하고 있어요. (예시 동작)`
        : `${fmtMonth(month)} 정산 엑셀 파일을 준비하고 있어요. (예시 동작)`,
    )
  }

  const lastRun = runs.data?.items[0] ?? null
  const items = list.error ? [] : (list.data?.items ?? [])
  const k = counts.data

  const actionFor = (st: Settlement, block = false) => {
    if (st.status === 'MANUAL_REQUIRED')
      return (
        <Button size="sm" onClick={() => setRetryTarget(st)}>
          {block ? '다시 실행하기' : '재처리'}
        </Button>
      )
    if (st.status === 'HOLD')
      return (
        <Button variant="outline" size="sm" disabled={releasingId !== null} onClick={() => release(st)}>
          {releasingId === st.settlementId ? '푸는 중…' : '보류 해제'}
        </Button>
      )
    if (st.status === 'FAILED') return <span className={c.sub}>{retryHint(st.nextRetryAt)}</span>
    return null
  }

  const monthSelect = (
    <select
      className={c.select}
      aria-label="정산월"
      value={month}
      onChange={(e) => {
        setMonth(e.target.value)
        setNotice('')
        setActionError('')
      }}
    >
      {months.map((m) => (
        <option key={m} value={m}>
          {fmtMonth(m)}
        </option>
      ))}
    </select>
  )

  const kpis = (
    <div className={`${c.kpis} ${s.kpis}`}>
      <div className={c.kpi}>
        <p className={c.kpiLabel}>{Number(month.slice(5, 7))}월 지급 완료</p>
        <p className={c.kpiValue}>{k ? `${k.paid}건` : '—'}</p>
        <p className={c.kpiSub}>
          {lastRun
            ? `마지막 실행 ${mmdd(lastRun.startTime)} · 지급 ${won(lastRun.payoutTotal)}`
            : runs.error
              ? '실행 기록을 불러오지 못했어요'
              : '실행 기록 없음'}
        </p>
      </div>
      <div className={c.kpi}>
        <p className={c.kpiLabel}>실패 · 수동 처리 필요</p>
        <p className={c.kpiValue}>{k ? `${k.failed + k.manual}건` : '—'}</p>
        <p className={c.kpiSub}>자동 재시도 3회 후 수동 처리</p>
      </div>
      <div className={c.kpi}>
        <p className={c.kpiLabel}>보류</p>
        <p className={c.kpiValue}>{k ? `${k.hold}건` : '—'}</p>
        <p className={c.kpiSub}>제재된 판매자 · 원장 불일치</p>
      </div>
    </div>
  )

  const previewCard = showPreview && (
    <section className={`${c.card} ${s.block}`} aria-labelledby="pv-t">
      <div className={s.blockHead}>
        <h2 id="pv-t" className={s.blockTitle}>
          미리 보기 {fmtMonth(thisMonth)}
        </h2>
        {preview.data && (
          <span className={c.sub}>
            판매자 {preview.data.sellerCount}명 · 품목 {preview.data.itemCount}건 · 받을 금액{' '}
            {won(preview.data.payoutAmount)}
          </span>
        )}
      </div>
      {preview.loading && !preview.data ? (
        <Loading />
      ) : preview.error ? (
        <ErrorView message={preview.error} onRetry={preview.reload} />
      ) : !preview.data || preview.data.sellers.items.length === 0 ? (
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
          {preview.data.sellers.items.map((p) => (
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
    </section>
  )

  const listBody =
    list.loading && items.length === 0 ? (
      <Loading />
    ) : list.error ? (
      <ErrorView message={list.error} onRetry={list.reload} />
    ) : items.length === 0 ? (
      <Empty title="이 정산월에 해당하는 정산서가 없어요." />
    ) : null

  return (
    <ConsoleShell
      variant="admin"
      active="settlements"
      title="월 정산"
      description="매월 10일 00:00에 자동 실행돼요. 수동 실행도 같은 지급 로직을 써서 중복 지급되지 않아요."
    >
      <div className={s.page}>
        <Notice>{notice}</Notice>
        <Notice tone="error">{actionError}</Notice>

        {desktop ? (
          <>
            {kpis}
            <div className={c.toolbar}>
              <div className={c.toolGroup}>
                {monthSelect}
                <Segment label="정산서 상태" items={TABS} value={tab} onChange={setTab} />
              </div>
              <div className={c.toolGroup}>
                <Button variant="ghost" onClick={() => setShowPreview((v) => !v)}>
                  {showPreview ? '미리 보기 닫기' : '이번 달 미리 보기'}
                </Button>
                <Button variant="outline" onClick={() => setAskRun(true)} disabled={running}>
                  {running ? '실행 중…' : '월 정산 수동 실행'}
                </Button>
                <Button variant="outline" onClick={() => downloadExcel()} className={s.excelBtn}>
                  <Icon name="download" size={16} />
                  엑셀 다운로드 <span className={s.xlsx}>XLSX</span>
                </Button>
              </div>
            </div>
            {previewCard}
            <div className={c.table} role="table" aria-label="정산서 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>판매자</span>
                <span>판매 대금</span>
                <span>수수료</span>
                <span>지급액</span>
                <span>상태</span>
                <span>시도</span>
                <span>실패 사유</span>
                <span></span>
                <span>정산서</span>
              </div>
              {listBody}
              {items.map((st) => {
                const [tone, label] = SETTLEMENT_STATUS[st.status] ?? ['neutral', st.status]
                return (
                  <div
                    key={st.settlementId}
                    role="row"
                    className={`${c.tr} ${c.clickable} ${c.num}`}
                    style={{ gridTemplateColumns: COLS }}
                    onClick={() => setDetailId(st.settlementId)}
                  >
                    <span className={`${c.ellipsis} ${c.strong}`}>{sellerName(st)}</span>
                    <span>{won(st.totalSalePrice)}</span>
                    <span>{won(st.totalFee)}</span>
                    <span className={c.strong}>{won(st.payoutAmount)}</span>
                    <span>
                      <Badge tone={tone}>{label}</Badge>
                    </span>
                    <span>{st.status === 'FAILED' || st.status === 'MANUAL_REQUIRED' ? st.retryCount : '—'}</span>
                    <span className={c.ellipsis} title={reasonOf(st)}>
                      {reasonOf(st) || '—'}
                    </span>
                    <span onClick={(e) => e.stopPropagation()}>{actionFor(st)}</span>
                    <span onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${sellerName(st)} 정산서 엑셀 다운로드`}
                        onClick={() => downloadExcel(st)}
                      >
                        <Icon name="download" size={14} />
                        엑셀
                      </Button>
                    </span>
                  </div>
                )
              })}
              {list.data && list.data.totalPages > 1 && (
                <div className={c.tableFoot}>
                  <span>총 {list.data.totalElements}건</span>
                  <Pager page={page} totalPages={list.data.totalPages} onChange={setPage} />
                </div>
              )}
            </div>
            <p className={s.foot}>
              실패한 건은 자동으로 두 번 더 시도하고, 3회 실패하면 수동 처리로 넘어가요. 행을 누르면 품목·처리 이력을 볼
              수 있어요.
            </p>
          </>
        ) : (
          <>
            <div className={s.mobileTools}>
              {monthSelect}
              <Button size="sm" onClick={() => setAskRun(true)} disabled={running}>
                {running ? '실행 중…' : '정산 실행하기'}
              </Button>
              <Button variant="outline" size="sm" aria-label="정산서 엑셀 다운로드" onClick={() => downloadExcel()}>
                <Icon name="download" size={14} />
                엑셀
              </Button>
            </div>
            <Chips label="상태" items={TABS} value={tab} onChange={setTab} />
            <div className={s.mobileKpi}>
              {k && (
                <span>
                  지급 완료 {k.paid} · 실패 {k.failed + k.manual} · 보류 {k.hold}
                </span>
              )}
              <button type="button" className={s.linkBtn} onClick={() => setShowPreview((v) => !v)}>
                {showPreview ? '미리 보기 닫기' : '이번 달 미리 보기'}
              </button>
            </div>
            {showPreview && (
              <MobilePreview
                loading={preview.loading && !preview.data}
                error={preview.error}
                reload={preview.reload}
                data={preview.data}
                title={`미리 보기 ${fmtMonth(thisMonth)}`}
              />
            )}
            {listBody}
            <div className={s.cards}>
              {items.map((st) => {
                const [tone, label] = SETTLEMENT_STATUS[st.status] ?? ['neutral', st.status]
                const failed = st.status === 'FAILED' || st.status === 'MANUAL_REQUIRED'
                return (
                  <article key={st.settlementId} className={s.cardItem} onClick={() => setDetailId(st.settlementId)}>
                    <div className={s.cardHead}>
                      <b>{sellerName(st)}</b>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    <dl className={s.dl}>
                      <Row label="판매 금액">{won(st.totalSalePrice)}</Row>
                      <Row label="수수료 10%">−{won(st.totalFee)}</Row>
                      <Row label="받을 금액">{won(st.payoutAmount)}</Row>
                    </dl>
                    {failed && (
                      <div className={s.failBox}>
                        <b>실패 {st.retryCount}회</b> · 마지막 실패 원인: {st.lastFailReason ?? '-'}
                      </div>
                    )}
                    {st.status === 'HOLD' && st.holdReason && (
                      <div className={s.holdBox}>보류 사유 · {st.holdReason}</div>
                    )}
                    {(canHold(st.status) && failed) || st.status === 'HOLD' ? (
                      <div className={s.cardActions} onClick={(e) => e.stopPropagation()}>
                        {canHold(st.status) && (
                          <Button variant="outline" size="sm" onClick={() => setHoldTarget(st)}>
                            보류
                          </Button>
                        )}
                        {actionFor(st, true)}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
            {list.data && <Pager page={page} totalPages={list.data.totalPages} onChange={setPage} />}
          </>
        )}
      </div>

      {askRun && (
        <Modal
          title={`${fmtMonth(month)} 정산을 실행할까요?`}
          onClose={running ? undefined : () => setAskRun(false)}
          actions={
            <>
              <Button variant="outline" onClick={() => setAskRun(false)} disabled={running}>
                취소
              </Button>
              <Button onClick={run} disabled={running}>
                {running ? '실행 중…' : '실행하기'}
              </Button>
            </>
          }
        >
          지난달 구매 확정분을 판매자별로 모아 지급해요. 실행 중일 때는 다시 실행할 수 없고, 이미 지급한 정산서는 다시
          지급하지 않아요.
        </Modal>
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
            counts.reload()
          }}
        />
      )}
    </ConsoleShell>
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
