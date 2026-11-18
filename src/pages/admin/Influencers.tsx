import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Segment, Tabs } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  approveInfluencer,
  getAdminInfluencer,
  getAdminInfluencers,
  rejectInfluencer,
  type AdminInfluencer,
  type AdminInfluencerCounts,
  type AdminInfluencerDetail,
  type AdminInfluencerHistory,
  type InfluencerStatus,
} from '../../lib/api/influencer'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { INFLUENCER_STATUS, InfoRow, Notice, Pager, ReasonField, fmtDay } from './shared'
import s from './admin.module.css'

const PAGE_SIZE = 20
const COLS = { gridTemplateColumns: '1fr 1.3fr 1.5fr .6fr .8fr' }

// ALL = 상태 필터 없이 전체
type Tab = InfluencerStatus | 'ALL'
const TABS: Tab[] = ['PENDING', 'APPROVED', 'REJECTED', 'ALL']
const COUNT_KEY: Record<Tab, keyof AdminInfluencerCounts> = {
  ALL: 'all',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
}
const STATUS = INFLUENCER_STATUS

type Action = 'approve' | 'reject'
const DONE: Record<Action, string> = {
  approve: '승인했어요. 인플루언서 기능을 쓸 수 있어요.',
  reject: '반려했어요. 사유가 신청자에게 보이고, 다시 신청할 수 있어요.',
}

const tabLabel = (t: Tab, counts?: AdminInfluencerCounts) =>
  `${t === 'ALL' ? '전체' : STATUS[t][0]}${counts ? ` ${counts[COUNT_KEY[t]]}` : ''}`
const snsLabel = (url: string) => url.replace(/^https?:\/\//, '')

/** 이력 한 줄 이름. 반려된 뒤 다시 심사 중이 되면 "다시 신청" */
function historyLabel(h: AdminInfluencerHistory) {
  if (h.toStatus === 'PENDING') return h.fromStatus === 'REJECTED' ? '다시 신청' : '신청'
  return h.toStatus === 'APPROVED' ? '승인' : '반려'
}

/** 심사 동작. 인플루언서 ID와 지금 상태만 있으면 된다 (모바일 카드는 상세 없이 바로 처리) */
function useInfluencerActions(onDone: (detail: AdminInfluencerDetail, action: Action) => void) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  async function run(id: number, status: InfluencerStatus, action: Action, reason: string) {
    if (busyId !== null || status !== 'PENDING') return false
    const r = reason.trim()
    if (action === 'reject' && !r) {
      setError({ id, message: '사유를 입력해 주세요.' })
      return false
    }
    setError(null)
    setBusyId(id)
    try {
      onDone(await (action === 'approve' ? approveInfluencer(id) : rejectInfluencer(id, r)), action)
      return true
    } catch (e) {
      setError({ id, message: errorMessage(e) })
      return false
    } finally {
      setBusyId(null)
    }
  }
  return { run, busyId, error, clearError: () => setError(null) }
}

/** 목록(탭·페이지)과 선택한 인플루언서 상세 */
function useInfluencersView() {
  const [tab, setTab] = useState<Tab>('PENDING')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminInfluencerDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const [done, setDone] = useState('')
  // 처리한 상세를 바로 보여 주고, 모바일 카드가 펼친 상세도 같이 갱신한다
  const [updated, setUpdated] = useState<AdminInfluencerDetail | null>(null)

  const list = useApi(
    () => getAdminInfluencers({ status: tab === 'ALL' ? undefined : tab, page: toPageParam(page), size: PAGE_SIZE }),
    [tab, page],
  )

  // 새 목록이 도착했을 때 선택한 줄이 없으면 첫 줄을 고른다 (응답 기준)
  useEffect(() => {
    const first = list.data?.influencers.items[0]
    if (first) setSelectedId((cur) => cur ?? first.influencerId)
  }, [list.data])

  useEffect(() => {
    setDetailError('')
    if (selectedId === null) return setDetail(null)
    let alive = true
    getAdminInfluencer(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  const actions = useInfluencerActions((d, action) => {
    if (d.influencerId === selectedId) setDetail(d)
    setUpdated(d)
    setDone(`${d.activityName} · ${DONE[action]}`)
    list.reload()
  })

  return {
    tab,
    changeTab: (next: Tab) => {
      setTab(next)
      setPage(1)
      setSelectedId(null)
      setDone('')
    },
    page,
    changePage: (next: number) => {
      setPage(next)
      setSelectedId(null)
    },
    list,
    items: list.data?.influencers.items ?? [],
    totalPages: list.data?.influencers.totalPages ?? 0,
    counts: list.data?.counts,
    selectedId,
    select: (id: number) => {
      setSelectedId(id)
      setDone('')
      actions.clearError()
    },
    detail,
    detailError,
    updated,
    done,
    actions,
  }
}
type View = ReturnType<typeof useInfluencersView>

function History({ items }: { items: AdminInfluencerHistory[] }) {
  return (
    <ol className={s.history}>
      {items.map((h, i) => (
        <li key={i}>
          <b>{historyLabel(h)}</b> · {fmtDay(h.changedAt)}
          {h.reason && <span className={s.historyNote}>사유: {h.reason}</span>}
        </li>
      ))}
    </ol>
  )
}

/** 심사 중일 때만 반려·승인. 승인됨·반려됨은 처리할 것이 없다 */
function InfluencerActions({
  v,
  id,
  status,
  compact,
}: {
  v: View
  id: number
  status: InfluencerStatus
  compact?: boolean
}) {
  const [reason, setReason] = useState('')
  useEffect(() => setReason(''), [id, status])
  if (status !== 'PENDING') return null

  const busy = v.actions.busyId !== null
  const error = v.actions.error?.id === id ? v.actions.error.message : ''
  const run = async (a: Action) => {
    if (await v.actions.run(id, status, a, reason)) setReason('')
  }
  return (
    <>
      <ReasonField
        id={`inf-${id}`}
        label="반려 사유"
        hint="(반려할 때 필수)"
        rows={compact ? 2 : 3}
        placeholder="예: SNS 계정에서 본인 확인이 어려워요."
        value={reason}
        onChange={setReason}
      />
      <Notice tone="error">{error}</Notice>
      <div className={s.btnRow}>
        <Button variant="outline" size="sm" disabled={busy} onClick={() => run('reject')}>
          반려하기
        </Button>
        <Button size="sm" disabled={busy} onClick={() => run('approve')}>
          승인하기
        </Button>
      </div>
    </>
  )
}

function InfluencerPanel({ v }: { v: View }) {
  const d = v.detail
  if (v.detailError) return <Notice tone="error">{v.detailError}</Notice>
  if (!d) return <Loading />
  return (
    <>
      <h2 className={s.panelTitle}>
        {d.activityName} · {STATUS[d.status][0]}
      </h2>
      <InfoRow label="이메일">{d.email}</InfoRow>
      <InfoRow label="SNS 계정">
        <a href={d.snsUrl} target="_blank" rel="noreferrer noopener">
          {snsLabel(d.snsUrl)} ↗
        </a>
      </InfoRow>
      <InfoRow label="신청일">{fmtDay(d.appliedAt)}</InfoRow>
      <p className={s.cardText}>{d.introduction}</p>
      {d.histories.length > 0 && (
        <>
          <p className={`${s.panelSub} ${s.gapTop}`}>상태 이력</p>
          <History items={d.histories} />
        </>
      )}
      <InfluencerActions v={v} id={d.influencerId} status={d.status} />
    </>
  )
}

function DesktopInfluencers({ v }: { v: View }) {
  const { list } = v
  return (
    <div className={s.split}>
      <div>
        <div className={c.toolbar}>
          <Segment
            label="심사 상태"
            value={v.tab}
            onChange={v.changeTab}
            items={TABS.map((t) => ({ value: t, label: tabLabel(t, v.counts) }))}
          />
        </div>
        <Notice>{v.done}</Notice>
        <div role="table" className={`${c.table} ${list.loading && list.data ? s.busy : ''}`}>
          <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
            <span>활동명</span>
            <span>이메일</span>
            <span>SNS</span>
            <span>신청일</span>
            <span>상태</span>
          </div>
          {list.loading && !list.data && <Loading />}
          {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
          {list.data && v.items.length === 0 && <div className={s.tableEmpty}>이 상태의 신청이 없어요.</div>}
          {v.items.map((r) => (
            <div
              role="row"
              key={r.influencerId}
              tabIndex={0}
              aria-selected={v.selectedId === r.influencerId}
              className={`${c.tr} ${c.clickable} ${v.selectedId === r.influencerId ? c.selected : ''}`}
              style={COLS}
              onClick={() => v.select(r.influencerId)}
              onKeyDown={(e) => e.key === 'Enter' && v.select(r.influencerId)}
            >
              <span className={`${c.ellipsis} ${c.strong}`}>{r.activityName}</span>
              <span className={c.ellipsis}>{r.email}</span>
              <span className={c.ellipsis}>{snsLabel(r.snsUrl)}</span>
              <span className={c.num}>{fmtDay(r.appliedAt)}</span>
              <span>
                <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
              </span>
            </div>
          ))}
        </div>
        <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
      </div>
      <section className={s.panel} aria-label="신청 상세">
        {v.selectedId === null ? (
          <p className={s.panelEmpty}>신청을 고르면 상세가 보여요.</p>
        ) : (
          <InfluencerPanel v={v} />
        )}
      </section>
    </div>
  )
}

/**
 * 모바일 카드. 목록 응답에는 소개·사유·이력이 없어서 "소개·상태 이력"을 펼칠 때 상세를 불러온다.
 * 반려·승인은 카드에서 바로 처리한다.
 */
function InfluencerCard({ v, r }: { v: View; r: AdminInfluencer }) {
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<AdminInfluencerDetail | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || detail) return
    let alive = true
    getAdminInfluencer(r.influencerId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [open, detail, r.influencerId])

  // 이 카드에서 처리했으면 펼친 상세도 새 내용으로
  const shown = v.updated?.influencerId === r.influencerId ? v.updated : detail

  return (
    <article className={s.card}>
      <div className={s.cardHead}>
        <b>{r.activityName}</b>
        <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
      </div>
      <p className={s.cardMeta}>
        {r.email} · 신청 {fmtDay(r.appliedAt)}
      </p>
      <p className={s.cardMeta}>
        <a href={r.snsUrl} target="_blank" rel="noreferrer noopener">
          {snsLabel(r.snsUrl)} ↗
        </a>
      </p>
      <InfluencerActions v={v} id={r.influencerId} status={r.status} compact />
      <button type="button" className={s.historyToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        소개·상태 이력 {open ? '⌃' : '⌄'}
      </button>
      {open &&
        (error ? (
          <Notice tone="error">{error}</Notice>
        ) : !shown ? (
          <Loading />
        ) : (
          <>
            <p className={s.cardText}>{shown.introduction}</p>
            {shown.status === 'REJECTED' && shown.reason && (
              <p className={s.reqReason}>
                <b>반려 사유</b>
                {shown.reason}
              </p>
            )}
            <History items={shown.histories} />
          </>
        ))}
    </article>
  )
}

function MobileInfluencers({ v }: { v: View }) {
  const { list } = v
  return (
    <div className={s.mBody}>
      <div className={s.mTabs}>
        <Tabs
          label="심사 상태"
          value={v.tab}
          onChange={v.changeTab}
          items={TABS.map((t) => ({ value: t, label: tabLabel(t, v.counts) }))}
        />
      </div>
      {v.done && (
        <div className={s.mBar}>
          <Notice>{v.done}</Notice>
        </div>
      )}
      {list.loading && !list.data && <Loading />}
      {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
      {list.data && v.items.length === 0 && <Empty title="이 상태의 신청이 없어요" />}
      <div className={s.mCards}>
        {v.items.map((r) => (
          <InfluencerCard key={r.influencerId} v={v} r={r} />
        ))}
      </div>
      <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
    </div>
  )
}

/** 관리자 · 인플루언서 심사 (심사 중 · 승인됨 · 반려됨 · 전체) */
export default function AdminInfluencers() {
  const desktop = useIsDesktop()
  const v = useInfluencersView()
  return (
    <ConsoleShell variant="admin" active="influencers" title="인플루언서 심사">
      {desktop ? <DesktopInfluencers v={v} /> : <MobileInfluencers v={v} />}
    </ConsoleShell>
  )
}
