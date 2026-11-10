import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, Segment, Tabs, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { useIsDesktop } from '../../lib/useMedia'
import { MOCK_INFLUENCERS, type InfluencerHistory, type InfluencerStatus, type MockInfluencer } from './mock'
import { InfoRow, Notice, ReasonField } from './shared'
import s from './admin.module.css'

const COLS = { gridTemplateColumns: '1fr 1.3fr 1.5fr .6fr .8fr' }
const TABS: InfluencerStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED']
const STATUS: Record<InfluencerStatus, [string, Tone]> = {
  PENDING: ['심사 중', 'amber'],
  APPROVED: ['승인됨', 'green'],
  REJECTED: ['반려됨', 'red'],
  REVOKED: ['자격 해제', 'neutral'],
}
type Action = 'approve' | 'reject' | 'revoke'
const DONE: Record<Action, string> = {
  approve: '승인했어요. 인플루언서 기능을 쓸 수 있어요.',
  reject: '반려했어요. 사유가 신청자에게 보여요.',
  revoke: '자격을 해제했어요. 다시 신청할 수 없어요.',
}

const today = () => {
  const d = new Date()
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}
const snsLabel = (url: string) => url.replace(/^https?:\/\//, '')

/** 인플루언서 신청 목록과 심사 (목업) */
function useInfluencersView() {
  // TODO(API 미구현): GET /api/v1/admin/influencers — 지금은 목업 목록을 화면 상태로만 들고 있어요
  const [rows, setRows] = useState<MockInfluencer[]>(MOCK_INFLUENCERS)
  const [tab, setTab] = useState<InfluencerStatus>('PENDING')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [done, setDone] = useState('')
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  const items = rows.filter((r) => r.status === tab)
  const selected = rows.find((r) => r.id === selectedId) ?? null

  // 탭을 바꾸면 첫 줄을 골라요 (PC 상세 패널)
  useEffect(() => {
    setSelectedId((cur) => (cur !== null && items.some((r) => r.id === cur) ? cur : (items[0]?.id ?? null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  /** 성공하면 true. TODO(API 미구현): approve | reject | revoke 호출로 바꾸기 */
  function run(r: MockInfluencer, action: Action, reason: string) {
    const note = reason.trim()
    if (action !== 'approve' && !note) {
      setError({ id: r.id, message: '사유를 입력해 주세요.' })
      return false
    }
    const next: InfluencerStatus = action === 'approve' ? 'APPROVED' : action === 'reject' ? 'REJECTED' : 'REVOKED'
    const label = action === 'approve' ? '승인' : action === 'reject' ? '반려' : '자격 해제'
    const h: InfluencerHistory = { label, at: today(), note: note || undefined }
    setRows((all) =>
      all.map((x) =>
        x.id === r.id ? { ...x, status: next, reason: note || undefined, history: [...x.history, h] } : x,
      ),
    )
    setError(null)
    setDone(`${r.nickname} · ${DONE[action]}`)
    return true
  }

  return {
    rows,
    tab,
    changeTab: (t: InfluencerStatus) => {
      setTab(t)
      setDone('')
      setError(null)
    },
    items,
    count: (t: InfluencerStatus) => rows.filter((r) => r.status === t).length,
    selected,
    select: (id: number) => {
      setSelectedId(id)
      setError(null)
    },
    done,
    error,
    run,
  }
}
type View = ReturnType<typeof useInfluencersView>

function History({ items }: { items: InfluencerHistory[] }) {
  return (
    <ol className={s.history}>
      {items.map((h, i) => (
        <li key={i}>
          <b>{h.label}</b> · {h.at}
          {h.note && <span className={s.historyNote}>사유: {h.note}</span>}
        </li>
      ))}
    </ol>
  )
}

/** 상태별 처리 (심사 중: 반려·승인 / 승인됨: 자격 해제) */
function InfluencerActions({ v, r, compact }: { v: View; r: MockInfluencer; compact?: boolean }) {
  const [reason, setReason] = useState('')
  useEffect(() => setReason(''), [r.id, r.status])
  const error = v.error?.id === r.id ? v.error.message : ''
  const run = (a: Action) => v.run(r, a, reason) && setReason('')

  if (r.status === 'PENDING') {
    return (
      <>
        <ReasonField
          id={`inf-${r.id}`}
          label="반려 사유"
          hint="(반려할 때 필수)"
          rows={compact ? 2 : 3}
          placeholder="예: SNS 계정에서 본인 확인이 어려워요."
          value={reason}
          onChange={setReason}
        />
        <Notice tone="error">{error}</Notice>
        <div className={s.btnRow}>
          <Button variant="outline" size="sm" onClick={() => run('reject')}>
            반려하기
          </Button>
          <Button size="sm" onClick={() => run('approve')}>
            승인하기
          </Button>
        </div>
      </>
    )
  }
  if (r.status === 'APPROVED') {
    return (
      <>
        <ReasonField
          id={`inf-${r.id}`}
          label="해제 사유"
          hint="(필수 · 해제하면 다시 신청할 수 없어요)"
          rows={compact ? 2 : 3}
          placeholder="예: 활동 정책 위반이 확인됐어요."
          value={reason}
          onChange={setReason}
        />
        <Notice tone="error">{error}</Notice>
        <div className={s.btnRow}>
          <Button variant="dangerOutline" size="sm" onClick={() => run('revoke')}>
            자격 해제하기
          </Button>
        </div>
      </>
    )
  }
  return null
}

function DesktopInfluencers({ v }: { v: View }) {
  const d = v.selected
  return (
    <div className={s.split}>
      <div>
        <div className={c.toolbar}>
          <Segment
            label="심사 상태"
            value={v.tab}
            onChange={v.changeTab}
            items={TABS.map((t) => ({ value: t, label: `${STATUS[t][0]} ${v.count(t)}` }))}
          />
        </div>
        <Notice>{v.done}</Notice>
        <div role="table" className={c.table}>
          <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
            <span>활동명</span>
            <span>이메일</span>
            <span>SNS</span>
            <span>신청일</span>
            <span>상태</span>
          </div>
          {v.items.length === 0 && <div className={s.tableEmpty}>이 상태의 신청이 없어요.</div>}
          {v.items.map((r) => (
            <div
              role="row"
              key={r.id}
              tabIndex={0}
              aria-selected={d?.id === r.id}
              className={`${c.tr} ${c.clickable} ${d?.id === r.id ? c.selected : ''}`}
              style={COLS}
              onClick={() => v.select(r.id)}
              onKeyDown={(e) => e.key === 'Enter' && v.select(r.id)}
            >
              <span className={`${c.ellipsis} ${c.strong}`}>{r.nickname}</span>
              <span className={c.ellipsis}>{r.email}</span>
              <span className={c.ellipsis}>{snsLabel(r.sns)}</span>
              <span className={c.num}>{r.appliedAt}</span>
              <span>
                <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
              </span>
            </div>
          ))}
        </div>
      </div>
      <section className={s.panel} aria-label="신청 상세">
        {!d ? (
          <p className={s.panelEmpty}>신청을 고르면 상세가 보여요.</p>
        ) : (
          <>
            <h2 className={s.panelTitle}>
              {d.nickname} · {STATUS[d.status][0]}
            </h2>
            <InfoRow label="이메일">{d.email}</InfoRow>
            <InfoRow label="SNS 계정">
              <a href={d.sns} target="_blank" rel="noreferrer noopener">
                {snsLabel(d.sns)} ↗
              </a>
            </InfoRow>
            <InfoRow label="신청일">{d.appliedAt}</InfoRow>
            <p className={s.cardText}>{d.intro}</p>
            <p className={`${s.panelSub} ${s.gapTop}`}>상태 이력</p>
            <History items={d.history} />
            <InfluencerActions v={v} r={d} />
          </>
        )}
      </section>
    </div>
  )
}

function InfluencerCard({ v, r }: { v: View; r: MockInfluencer }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={s.card}>
      <div className={s.cardHead}>
        <b>{r.nickname}</b>
        <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
      </div>
      <p className={s.cardMeta}>
        {r.email} · 신청 {r.appliedAt}
      </p>
      <p className={s.cardMeta}>
        <a href={r.sns} target="_blank" rel="noreferrer noopener">
          {snsLabel(r.sns)} ↗
        </a>
      </p>
      <p className={s.cardText}>{r.intro}</p>
      {r.reason && (
        <p className={s.reqReason}>
          <b>{r.status === 'REVOKED' ? '해제 사유' : '반려 사유'}</b>
          {r.reason}
        </p>
      )}
      <InfluencerActions v={v} r={r} compact />
      <button type="button" className={s.historyToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        상태 이력 {open ? '⌃' : '⌄'}
      </button>
      {open && <History items={r.history} />}
    </article>
  )
}

function MobileInfluencers({ v }: { v: View }) {
  return (
    <div className={s.mBody}>
      <div className={s.mTabs}>
        <Tabs
          label="심사 상태"
          value={v.tab}
          onChange={v.changeTab}
          items={TABS.map((t) => ({ value: t, label: `${STATUS[t][0]} ${v.count(t)}` }))}
        />
      </div>
      {v.done && (
        <div className={s.mBar}>
          <Notice>{v.done}</Notice>
        </div>
      )}
      {v.items.length === 0 && <Empty title="이 상태의 신청이 없어요" />}
      <div className={s.mCards}>
        {v.items.map((r) => (
          <InfluencerCard key={r.id} v={v} r={r} />
        ))}
      </div>
    </div>
  )
}

/** 관리자 · 인플루언서 심사 (백엔드 API 없음 → 목업) */
export default function AdminInfluencers() {
  const desktop = useIsDesktop()
  const v = useInfluencersView()
  return (
    <ConsoleShell variant="admin" active="influencers" title="인플루언서 심사">
      {desktop ? <DesktopInfluencers v={v} /> : <MobileInfluencers v={v} />}
    </ConsoleShell>
  )
}
