import { useEffect, useState, type ChangeEvent } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import {
  fmtMonth,
  getSettlementPreview,
  getSettlementRuns,
  getSettlements,
  releaseSettlement,
  retrySettlement,
  runSettlement,
  type Settlement,
  type SettlementStatus,
  type YearMonth,
} from '../lib/api/settlement'
import { SMALL_BTN, SMALL_BTN_ON } from '../lib/admin'
import { useApi } from '../lib/useApi'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './AdminSettlements.module.css'
import AdminLayout from '../components/AdminLayout'
import Pager from '../components/Pager'

const cx = makeCx(styles)

const PAGE_SIZE = 20
const PREVIEW_SIZE = 20

/** 정산서 상태 [칩 색, 칩 글자] */
const STATUS: Record<SettlementStatus, [string, string]> = {
  READY: ['c-mute', '지급 대기'],
  PAID: ['c-ok', '지급 완료'],
  FAILED: ['c-blue', '재시도 중'],
  MANUAL_REQUIRED: ['c-low', '수동 필요'],
  HOLD: ['c-mute', '보류'],
}

/** 정산서 탭 4개 */
const TABS: Array<{ label: string; status?: SettlementStatus }> = [
  { label: '전체' },
  { label: '실패', status: 'FAILED' },
  { label: '수동 필요', status: 'MANUAL_REQUIRED' },
  { label: '보류', status: 'HOLD' },
]

/** Date → 'yyyy-MM' (브라우저 현지 시각 = KST 기준) */
const ym = (d: Date): YearMonth => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

/** 끝난 달 n개 (이번 달 제외). 오늘이 10월이면 9월, 8월, … */
const finishedMonths = (n = 6) => {
  const now = new Date()
  return Array.from({ length: n }, (_, i) => ym(new Date(now.getFullYear(), now.getMonth() - 1 - i, 1)))
}

/** '2026-10-10T00:12:00' → '10월 10일' */
const fmtMonthDay = (iso: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '-' : `${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 다음 재시도 일시 → '10분 뒤 다시 시도' (지났으면 '곧 다시 시도') */
const retryHint = (iso: string | null) => {
  if (!iso) return ''
  const minutes = Math.ceil((new Date(iso).getTime() - Date.now()) / 60000)
  if (Number.isNaN(minutes)) return ''
  if (minutes <= 0) return '곧 다시 시도'
  if (minutes < 60) return `${minutes}분 뒤 다시 시도`
  return `${Math.floor(minutes / 60)}시간 ${minutes % 60}분 뒤 다시 시도`
}

/** 판매자 이름. BE가 아직 businessName을 안 주면(이전 버전) 판매자 ID로 대신 보여 줘요 */
const sellerName = (s: { businessName: string | null; sellerId: number }) =>
  s.businessName?.trim() ? s.businessName : `판매자 #${s.sellerId}`

/** 정산월 선택·실행, 요약 카드, 미리 보기, 정산서 목록, 재실행 모달 */
function useAdminSettlementsView() {
  const months = finishedMonths()
  const thisMonth = ym(new Date())
  const [month, setMonth] = useState<YearMonth>(months[0])
  const [tab, setTab] = useState(0)
  const [page, setPage] = useState(1)
  const [running, setRunning] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  // 재실행 모달
  const [target, setTarget] = useState<Settlement | null>(null)
  const [reason, setReason] = useState('')
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [releasingId, setReleasingId] = useState<number | null>(null)

  const status = TABS[tab].status

  const runs = useApi(() => getSettlementRuns({ size: 1 }), [])
  const preview = useApi(() => getSettlementPreview(thisMonth, { size: PREVIEW_SIZE }), [thisMonth])
  const list = useApi(
    () => getSettlements({ month, status, page: toPageParam(page), size: PAGE_SIZE }),
    [month, status, page],
  )

  // 정산월·탭이 바뀌면 첫 페이지부터, 이전 조건의 목록은 지워요 (새 응답 전까지 다른 탭 행과 버튼이 보이지 않게)
  useEffect(() => {
    setPage(1)
    list.setData(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, tab])

  // 지급·보류 해제로 마지막 페이지가 비면 남은 마지막 페이지로 옮겨요 (페이지 버튼이 사라져 빈 페이지에 갇히지 않게)
  useEffect(() => {
    const d = list.data
    if (!list.loading && d && page > 1 && d.items.length === 0 && page > d.totalPages)
      setPage(Math.max(1, d.totalPages))
  }, [list.data, list.loading, page])

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
      list.reload()
    } catch (e) {
      // 409-SETTLEMENT_RUNNING, 409-SETTLEMENT_ALREADY_COMPLETED, 400-SETTLEMENT_MONTH_INVALID 등 백엔드 문구
      setActionError(errorMessage(e))
    } finally {
      setRunning(false)
    }
  }

  async function confirmRetry() {
    if (!target || !reason.trim() || retrying) return
    setRetrying(true)
    setRetryError('')
    try {
      const r = await retrySettlement(target.settlementId, reason.trim())
      if (r.status === 'PAID') {
        setTarget(null)
        setNotice(`${sellerName(target)} ${fmtMonth(target.settlementMonth)} 정산을 지급했어요.`)
        list.reload()
        runs.reload()
      } else {
        // 모달의 실패 횟수·마지막 실패 원인도 이번 결과로 바꿔요
        setTarget({
          ...target,
          status: r.status,
          retryCount: r.retryCount,
          lastFailReason: r.lastFailReason,
          nextRetryAt: r.nextRetryAt,
        })
        setRetryError(
          r.processed
            ? `다시 실패했어요: ${r.lastFailReason ?? '원인을 알 수 없어요'}`
            : '지금은 다시 실행할 수 없는 상태예요. 목록을 새로고침해 주세요.',
        )
        list.reload()
      }
    } catch (e) {
      setRetryError(errorMessage(e))
    } finally {
      setRetrying(false)
    }
  }

  async function release(s: Settlement) {
    if (releasingId !== null) return // 두 번 누르면 두 번째 요청이 409로 실패해요
    setReleasingId(s.settlementId)
    setNotice('')
    setActionError('')
    try {
      await releaseSettlement(s.settlementId)
      setNotice(`${sellerName(s)} 정산서 보류를 풀었어요. 재시도 스케줄러가 곧 지급해요.`)
      list.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setReleasingId(null)
    }
  }

  const lastRun = runs.data?.items[0] ?? null
  // 목록을 못 불러왔으면 이전 행을 보여 주지 않아요
  const items = list.error ? [] : (list.data?.items ?? [])
  const previewSellers = preview.data?.sellers.items ?? []

  return {
    // 정산월·실행
    months,
    month,
    changeMonth: (e: ChangeEvent<HTMLSelectElement>) => setMonth(e.target.value),
    run,
    running,
    notice,
    actionError,
    // 카드
    lastRunDay: lastRun ? fmtMonthDay(lastRun.startTime) : '-',
    successFail: lastRun ? `${lastRun.paidCount}건 / ${lastRun.failedCount + lastRun.manualRequiredCount}건` : '-',
    payoutTotal: lastRun ? `${won(lastRun.payoutTotal)}원` : '-',
    feeTotal: lastRun ? `${won(lastRun.feeTotal)}원` : '-',
    runsError: runs.error,
    // 미리 보기
    previewTitle: `미리 보기 ${fmtMonth(thisMonth)}`,
    previewSellers,
    previewLoading: preview.loading && previewSellers.length === 0,
    previewEmpty: !preview.loading && !preview.error && previewSellers.length === 0,
    previewError: preview.error,
    // 정산서
    tabs: TABS.map((t, i) => ({ label: t.label, on: tab === i, pick: () => setTab(i) })),
    items,
    listLoading: list.loading && items.length === 0,
    listEmpty: !list.loading && !list.error && items.length === 0,
    listError: list.error,
    page,
    setPage,
    totalPages: list.data?.totalPages ?? 0,
    release,
    releasingId,
    // 재실행 모달
    target,
    openRetry: (s: Settlement) => {
      setReason('')
      setRetryError('')
      setTarget(s)
    },
    closeRetry: () => setTarget(null),
    reason,
    changeReason: (e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value),
    noReason: !reason.trim(),
    retrying,
    retryError,
    confirmRetry,
  }
}

/** 관리자 · 월 정산 */
export default function AdminSettlementsPage() {
  const v = useAdminSettlementsView()
  const t = v.target
  return (
    <div className={styles.page}>
      <AdminLayout active="월 정산" minHeight={1240}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>월 정산</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className={cx('in')} aria-label="정산월" value={v.month} onChange={v.changeMonth}>
              {v.months.map((m) => (
                <option key={m} value={m}>
                  {fmtMonth(m)}
                </option>
              ))}
            </select>
            <button className={cx('btn btn-p')} onClick={v.run} disabled={v.running}>
              {v.running ? '실행 중…' : '정산 실행하기'}
            </button>
          </div>
        </div>
        <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
          매달 10일 0시에 지난달 구매 확정분을 자동으로 정산해요. 실행 중일 때는 다시 실행할 수 없고, 실패한 건은
          자동으로 두 번 더 시도하고, 3회 실패하면 수동 처리로 넘어가요.
        </p>
        {v.notice && (
          <p role="status" className={cx('sub')} style={{ margin: '0', fontWeight: '700', color: '#1C6B47' }}>
            {v.notice}
          </p>
        )}
        {v.actionError && (
          <p role="alert" style={NOTICE}>
            {v.actionError}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '16px' }}>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              마지막 실행
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              {v.lastRunDay}
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              성공과 실패
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              {v.successFail}
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              지급한 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              {v.payoutTotal}
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              수수료
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              {v.feeTotal}
            </div>
          </section>
        </div>
        {v.runsError && (
          <p role="alert" style={NOTICE}>
            {v.runsError}
          </p>
        )}
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>{v.previewTitle}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'right' }}>대상 주문</th>
                  <th style={{ textAlign: 'right' }}>판매 금액</th>
                  <th style={{ textAlign: 'right' }}>수수료 10%</th>
                  <th style={{ textAlign: 'right' }}>받을 금액</th>
                </tr>
              </thead>
              <tbody>
                {v.previewLoading && (
                  <tr>
                    <td colSpan={5} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      불러오는 중이에요.
                    </td>
                  </tr>
                )}
                {v.previewEmpty && (
                  <tr>
                    <td colSpan={5} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      이번 달에 정산할 구매 확정 건이 아직 없어요.
                    </td>
                  </tr>
                )}
                {v.previewSellers.map((p) => (
                  <tr key={p.sellerId}>
                    <td style={{ textAlign: 'left' }}>{sellerName(p)}</td>
                    <td style={{ textAlign: 'right' }}>{p.itemCount}</td>
                    <td style={{ textAlign: 'right' }}>{won(p.totalSalePrice)}원</td>
                    <td style={{ textAlign: 'right' }}>{won(p.totalFee)}원</td>
                    <td style={{ textAlign: 'right' }}>{won(p.payoutAmount)}원</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {v.previewError && (
            <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
              {v.previewError}
            </p>
          )}
        </section>
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>정산서</h2>
            <div role="tablist" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {v.tabs.map((tb) => (
                <button
                  key={tb.label}
                  role="tab"
                  aria-selected={tb.on}
                  className={cx('btn')}
                  style={tb.on ? SMALL_BTN_ON : SMALL_BTN}
                  onClick={tb.pick}
                >
                  {tb.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>정산월</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'right' }}>받을 금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'left' }}>실패 횟수</th>
                  <th style={{ textAlign: 'left' }}>원인</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {v.listLoading && (
                  <tr>
                    <td colSpan={7} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      불러오는 중이에요.
                    </td>
                  </tr>
                )}
                {v.listEmpty && (
                  <tr>
                    <td colSpan={7} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      이 정산월에 해당하는 정산서가 없어요.
                    </td>
                  </tr>
                )}
                {v.items.map((s) => {
                  const [chip, label] = STATUS[s.status] ?? ['c-mute', s.status]
                  return (
                    <tr key={s.settlementId}>
                      <td style={{ textAlign: 'left' }}>{fmtMonth(s.settlementMonth)}</td>
                      <td style={{ textAlign: 'left' }}>{sellerName(s)}</td>
                      <td style={{ textAlign: 'right' }}>{won(s.payoutAmount)}원</td>
                      <td style={{ textAlign: 'left' }}>
                        <span className={cx('chip', chip)}>{label}</span>
                      </td>
                      {/* 실패 횟수·원인은 실패 상태에서만 보여요. 지급 완료·지급 대기는 예전 실패 정보가 남아 있어도 비워요 */}
                      <td style={{ textAlign: 'left' }}>
                        {s.status === 'MANUAL_REQUIRED' ? (
                          <strong style={{ color: '#A33A1F' }}>{s.retryCount}회</strong>
                        ) : s.status === 'FAILED' ? (
                          `${s.retryCount}회`
                        ) : (
                          ''
                        )}
                      </td>
                      <td style={{ textAlign: 'left' }}>
                        {s.status === 'HOLD'
                          ? (s.holdReason ?? '')
                          : s.status === 'FAILED' || s.status === 'MANUAL_REQUIRED'
                            ? (s.lastFailReason ?? '')
                            : ''}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {s.status === 'MANUAL_REQUIRED' && (
                          <button className={cx('btn btn-p')} style={SMALL_BTN} onClick={() => v.openRetry(s)}>
                            다시 실행하기
                          </button>
                        )}
                        {s.status === 'FAILED' && <span className={cx('sub')}>{retryHint(s.nextRetryAt)}</span>}
                        {s.status === 'HOLD' && (
                          <button
                            className={cx('btn')}
                            style={SMALL_BTN}
                            disabled={v.releasingId !== null}
                            onClick={() => v.release(s)}
                          >
                            {v.releasingId === s.settlementId ? '푸는 중…' : '보류 풀기'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {v.listError && (
            <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
              {v.listError}
            </p>
          )}
          <Pager page={v.page} totalPages={v.totalPages} onChange={v.setPage} buttonClassName={cx('btn')} />
        </section>
      </AdminLayout>
      {t && (
        <div className={cx('ov')}>
          <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby="rt-t">
            <h2 id="rt-t">
              {sellerName(t)} {Number(t.settlementMonth.slice(5, 7))}월 정산을 다시 실행할까요?
            </h2>
            <dl className={cx('sum')}>
              <dt>받을 금액</dt>
              <dd>
                <strong>{won(t.payoutAmount)}원</strong>
              </dd>
              <dt>실패 횟수</dt>
              <dd>{t.retryCount}회</dd>
              <dt>마지막 실패 원인</dt>
              <dd>{t.lastFailReason ?? '-'}</dd>
            </dl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="rt-r" style={{ fontSize: '14px', fontWeight: '500' }}>
                다시 실행하는 사유 (필수)
              </label>
              <textarea
                id="rt-r"
                className={cx('in')}
                placeholder="예: 판매자가 정산 계좌를 수정해서 다시 지급해요."
                value={v.reason}
                onChange={v.changeReason}
              ></textarea>
              <span className={cx('sub')}>입력한 사유는 처리 이력에 남아요. 같은 정산서는 두 번 지급되지 않아요.</span>
            </div>
            {v.retryError && (
              <p role="alert" style={NOTICE}>
                {v.retryError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className={cx('btn')} onClick={v.closeRetry} disabled={v.retrying}>
                취소
              </button>
              <button className={cx('btn btn-p')} disabled={v.noReason || v.retrying} onClick={v.confirmRetry}>
                {v.retrying ? '실행 중…' : '다시 실행하기'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
