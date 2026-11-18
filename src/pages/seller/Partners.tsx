import { useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Segment, Tabs, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import f from '../../components/ui/form.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import { getSellerCoupons } from '../../lib/api/coupon'
import { searchInfluencers, type InfluencerProfile } from '../../lib/api/influencer'
import {
  COMMISSION_RATE_MAX,
  COMMISSION_RATE_MIN,
  PARTNERSHIP_ENDED_BY_LABEL,
  endSellerPartnership,
  getSellerPartnerships,
  requestPartnership,
  type Partnership,
  type PartnershipStatus,
} from '../../lib/api/partnership'
import { useApi } from '../../lib/useApi'
import { useDebounced } from '../../lib/useDebounced'
import { useIsDesktop } from '../../lib/useMedia'
import { usePaged } from '../account/util'
import { Notice, Pager, fmtMD } from './shared'
import s from './seller.module.css'

const PAGE_SIZE = 20
const COLS = '1fr 1.4fr .7fr .8fr 1fr .8fr 1.4fr'
const MESSAGE_MAX = 500
const SEARCH_SIZE = 10

type TabKey = 'all' | PartnershipStatus
const TABS: Array<[TabKey, string]> = [
  ['all', '전체'],
  ['REQUESTED', '요청 중'],
  ['ACTIVE', '진행 중'],
  ['REJECTED', '거절됨'],
  ['ENDED', '종료'],
]
const STATUS: Record<PartnershipStatus, [string, Tone]> = {
  REQUESTED: ['요청 중', 'amber'],
  ACTIVE: ['진행 중', 'green'],
  REJECTED: ['거절됨', 'red'],
  ENDED: ['종료', 'neutral'],
}

const who = (p: Partnership) => p.activityName ?? `인플루언서 #${p.influencerId}`
const periodOf = (p: Partnership) => {
  switch (p.status) {
    case 'REQUESTED':
      return `${fmtMD(p.requestedAt)} 요청`
    case 'ACTIVE':
      return `${fmtMD(p.acceptedAt)} ~`
    case 'REJECTED':
      return fmtMD(p.rejectedAt)
    case 'ENDED':
      return `${p.acceptedAt ? fmtMD(p.acceptedAt) : ''} ~ ${fmtMD(p.endedAt)}`
  }
}
const mobileNote = (p: Partnership) => {
  switch (p.status) {
    case 'REQUESTED':
      return `${fmtMD(p.requestedAt)} 요청 · 응답 대기`
    case 'ACTIVE':
      return `${fmtMD(p.acceptedAt)}부터`
    case 'REJECTED':
      return `${fmtMD(p.rejectedAt)} · 다시 요청할 수 있어요`
    case 'ENDED':
      return `${periodOf(p)}${p.endedBy ? ` · ${PARTNERSHIP_ENDED_BY_LABEL[p.endedBy]}${p.endedBy === 'SYSTEM' ? '' : '가 종료'}` : ''}`
  }
}

/** 탭별 개수 (전체 + 상태 4개) */
function useCounts() {
  const all = useApi(() => getSellerPartnerships({ size: 1 }), [])
  const req = useApi(() => getSellerPartnerships({ status: 'REQUESTED', size: 1 }), [])
  const act = useApi(() => getSellerPartnerships({ status: 'ACTIVE', size: 1 }), [])
  const rej = useApi(() => getSellerPartnerships({ status: 'REJECTED', size: 1 }), [])
  const end = useApi(() => getSellerPartnerships({ status: 'ENDED', size: 1 }), [])
  const map: Record<TabKey, number | undefined> = {
    all: all.data?.totalElements,
    REQUESTED: req.data?.totalElements,
    ACTIVE: act.data?.totalElements,
    REJECTED: rej.data?.totalElements,
    ENDED: end.data?.totalElements,
  }
  const reload = () => [all, req, act, rej, end].forEach((x) => x.reload())
  return { map, reload }
}

/** S9 인플루언서 협약 */
export default function SellerPartnersPage() {
  const desktop = useIsDesktop()
  const [tab, setTab] = useState<TabKey>('all')
  const [page, setPage] = useState(1)
  const list = useApi(
    () => getSellerPartnerships({ status: tab === 'all' ? undefined : tab, page: toPageParam(page), size: PAGE_SIZE }),
    [tab, page],
  )
  const counts = useCounts()
  // 협약별 쿠폰 수 (최근 100개 쿠폰에서 셈)
  const coupons = useApi(() => getSellerCoupons({ size: 100 }), [])
  const couponCount = (id: number) => {
    const mine = (coupons.data?.items ?? []).filter((x) => x.partnershipId === id)
    return { total: mine.length, stopped: mine.filter((x) => x.status === 'STOPPED').length }
  }

  // 새 협약 요청: 승인된 인플루언서를 활동명으로 검색해 고른다
  const [keyword, setKeyword] = useState('')
  const q = useDebounced(keyword.trim())
  const found = usePaged((pg) => searchInfluencers({ keyword: q || undefined, page: pg, size: SEARCH_SIZE }), [q])
  const [selected, setSelected] = useState<InfluencerProfile | null>(null)
  const [message, setMessage] = useState('')
  const [rate, setRate] = useState('')
  const rateNum = Number(rate)
  const rateOk = /^\d+$/.test(rate) && rateNum >= COMMISSION_RATE_MIN && rateNum <= COMMISSION_RATE_MAX
  const [sending, setSending] = useState(false)
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState('')

  async function send(targetId: number, name: string, commissionRate: number, msg?: string) {
    if (sending) return
    setSending(true)
    setFormError('')
    setDone('')
    try {
      await requestPartnership(targetId, commissionRate, msg?.trim() || undefined)
      setDone(`${name}에게 협약을 요청했어요. 수락하면 진행 중으로 바뀌어요.`)
      setSelected(null)
      setMessage('')
      setRate('')
      list.reload()
      counts.reload()
    } catch (e) {
      setFormError(errorMessage(e))
    } finally {
      setSending(false)
    }
  }

  // 협약 종료
  const [ending, setEnding] = useState<Partnership | null>(null)
  const [endPending, setEndPending] = useState(false)
  const [endError, setEndError] = useState('')
  async function confirmEnd() {
    if (!ending || endPending) return
    setEndPending(true)
    setEndError('')
    try {
      await endSellerPartnership(ending.partnershipId)
      setDone(`${who(ending)}와의 협약을 종료했어요. 이 협약의 상품 쿠폰은 모두 중지돼요.`)
      setEnding(null)
      list.reload()
      counts.reload()
      coupons.reload()
    } catch (e) {
      setEndError(errorMessage(e))
    } finally {
      setEndPending(false)
    }
  }

  const tabItems = TABS.map(([value, label]) => ({
    value,
    label: counts.map[value] !== undefined ? `${label} ${counts.map[value]}` : label,
  }))
  const pickTab = (v: TabKey) => {
    setTab(v)
    setPage(1)
  }

  const actionsOf = (p: Partnership) => {
    if (p.status === 'ACTIVE')
      return (
        <>
          <Button size="sm" to={`/seller/coupons/new?partnershipId=${p.partnershipId}`}>
            쿠폰 발행
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEnding(p)}>
            종료
          </Button>
        </>
      )
    if (p.status === 'REJECTED' || p.status === 'ENDED')
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // 다시 요청은 지난 협약의 수수료율을 그대로 써요. 없으면(TRSS-224 전 협약) 입력칸 값을 써요
            const r = p.commissionRate ?? (rateOk ? rateNum : null)
            if (r === null) {
              setDone('')
              setFormError(
                `다시 요청하려면 아래 수수료율(${COMMISSION_RATE_MIN}~${COMMISSION_RATE_MAX}%)을 먼저 입력해 주세요.`,
              )
              return
            }
            send(p.influencerId, who(p), r)
          }}
          disabled={sending}
        >
          다시 요청
        </Button>
      )
    return null
  }
  const rateText = (p: Partnership) => (p.commissionRate !== null ? `${p.commissionRate}%` : '—')
  const couponText = (p: Partnership) => {
    const { total, stopped } = couponCount(p.partnershipId)
    if (total === 0) return '—'
    return stopped > 0 && stopped === total ? `쿠폰 ${total} 중지` : `쿠폰 ${total}`
  }

  const form = (
    <section className={desktop ? s.panel : s.mPanel} aria-labelledby="new-partner">
      <h2 id="new-partner" className={s.h2}>
        새 협약 요청
      </h2>
      <div className={f.field}>
        <label htmlFor="pt-inf" className={f.label}>
          인플루언서
        </label>
        <input
          id="pt-inf"
          type="search"
          className={f.input}
          placeholder="활동명으로 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          aria-controls="pt-inf-list"
        />
        <div
          id="pt-inf-list"
          className={s.infList}
          role="listbox"
          aria-label="승인된 인플루언서"
          aria-busy={found.loading}
        >
          {found.error ? (
            <ErrorView message={found.error} onRetry={found.reload} />
          ) : found.loaded && found.items.length === 0 ? (
            <p className={s.faintLine}>
              {q ? `'${q}'에 맞는 인플루언서가 없어요.` : '승인된 인플루언서가 아직 없어요.'}
            </p>
          ) : !found.loaded ? (
            <p className={s.faintLine}>인플루언서를 불러오고 있어요</p>
          ) : (
            found.items.map((it) => (
              <button
                key={it.influencerId}
                type="button"
                role="option"
                aria-selected={selected?.influencerId === it.influencerId}
                className={s.infItem}
                onClick={() => setSelected(it)}
              >
                <span className={s.avatarSm} aria-hidden="true">
                  {it.activityName.slice(0, 1)}
                </span>
                <span className={s.prodText}>
                  <b>{it.activityName}</b>
                  {it.introduction && <span className={`${s.faint} ${c.ellipsis}`}>{it.introduction}</span>}
                </span>
              </button>
            ))
          )}
          {found.hasMore && !found.error && (
            <Button variant="outline" size="sm" onClick={found.loadMore} disabled={found.loading}>
              {found.loading ? '불러오는 중' : '더 보기'}
            </Button>
          )}
        </div>
      </div>
      <div className={f.field}>
        <label htmlFor="pt-rate" className={f.label}>
          인플루언서 수수료율 (%)
        </label>
        <input
          id="pt-rate"
          className={f.input}
          inputMode="numeric"
          placeholder={`${COMMISSION_RATE_MIN}~${COMMISSION_RATE_MAX} 사이 정수`}
          value={rate}
          aria-invalid={rate !== '' && !rateOk}
          aria-describedby="pt-rate-help"
          onChange={(e) => setRate(e.target.value.replace(/\D/g, '').slice(0, 2))}
        />
        <p id="pt-rate-help" className={rate !== '' && !rateOk ? f.error : f.help}>
          {rate !== '' && !rateOk
            ? `${COMMISSION_RATE_MIN}~${COMMISSION_RATE_MAX} 사이 정수로 입력해 주세요.`
            : '쿠폰으로 팔린 금액에서 인플루언서가 받는 비율이에요.'}
        </p>
      </div>
      <div className={f.field}>
        <label htmlFor="pt-msg" className={f.label}>
          메시지 (선택)
        </label>
        <textarea
          id="pt-msg"
          className={f.textarea}
          rows={desktop ? 4 : 2}
          placeholder="함께하고 싶은 이유나 조건을 적어 주세요"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
        />
      </div>
      {formError && <Notice tone="error">{formError}</Notice>}
      <div className={desktop ? s.right : undefined}>
        <Button
          onClick={() => selected && rateOk && send(selected.influencerId, selected.activityName, rateNum, message)}
          disabled={!selected || !rateOk || sending}
        >
          {sending ? '보내는 중' : '협약 요청 보내기'}
        </Button>
      </div>
      <p className={s.faintLine}>
        한 인플루언서와는 협약을 하나만 진행해요. 협약 중일 때만 상품 쿠폰을 발행할 수 있어요.
      </p>
    </section>
  )

  const items = list.data?.items ?? []
  let body
  if (list.loading && !list.data) body = <Loading label="협약을 불러오고 있어요" />
  else if (list.error) body = <ErrorView message={list.error} onRetry={list.reload} />
  else if (items.length === 0)
    body = (
      <Empty title={tab === 'all' ? '아직 협약이 없어요' : '이 상태의 협약이 없어요'}>
        인플루언서에게 협약을 요청해 보세요.
      </Empty>
    )
  else if (desktop)
    body = (
      <div role="table" className={c.table} aria-busy={list.loading}>
        <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
          <span>인플루언서</span>
          <span>요청 메시지</span>
          <span>수수료율</span>
          <span>상태</span>
          <span>기간</span>
          <span>쿠폰</span>
          <span />
        </div>
        {items.map((p) => {
          const [label, tone] = STATUS[p.status]
          return (
            <div role="row" key={p.partnershipId} className={c.tr} style={{ gridTemplateColumns: COLS }}>
              <span className={c.strong}>{who(p)}</span>
              {/* TODO(API 미구현): 인플루언서 SNS 주소 — 협약 응답에 없어 요청 메시지를 대신 보여요 */}
              <span className={`${c.ellipsis} ${s.faint}`} title={p.requestMessage ?? undefined}>
                {p.requestMessage || '—'}
              </span>
              <span className={c.num}>{rateText(p)}</span>
              <span>
                <Badge tone={tone}>{label}</Badge>
              </span>
              <span className={c.num}>{periodOf(p)}</span>
              <span>{couponText(p)}</span>
              <span className={c.actions}>{actionsOf(p)}</span>
            </div>
          )
        })}
      </div>
    )
  else
    body = (
      <ul className={s.cardList}>
        {items.map((p) => {
          const [label, tone] = STATUS[p.status]
          const acts = actionsOf(p)
          const { total } = couponCount(p.partnershipId)
          return (
            <li key={p.partnershipId} className={s.partnerCard}>
              <div className={s.partnerHead}>
                <span className={s.avatarSm} aria-hidden="true">
                  {who(p).slice(0, 1)}
                </span>
                <span className={s.prodText}>
                  <b>{who(p)}</b>
                  {p.requestMessage && <span className={`${s.faint} ${c.ellipsis}`}>{p.requestMessage}</span>}
                </span>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <p className={s.faintLine}>
                {mobileNote(p)}
                {p.commissionRate !== null && ` · 수수료 ${p.commissionRate}%`}
                {p.status === 'ACTIVE' && ` · 쿠폰 ${total}개`}
              </p>
              {acts && <div className={s.cardActions}>{acts}</div>}
            </li>
          )
        })}
      </ul>
    )

  return (
    <ConsoleShell variant="seller" active="partners" title="인플루언서 협약" back="/seller/info" hideMobileNav>
      {done && (
        <div className={desktop ? s.gapBottom : s.mobileBlock}>
          <Notice onClose={() => setDone('')}>{done}</Notice>
        </div>
      )}
      {desktop ? (
        <div className={c.split}>
          <div>
            <div className={c.toolbar}>
              <Segment items={tabItems} value={tab} onChange={pickTab} label="협약 상태" />
            </div>
            {body}
            <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
          </div>
          {form}
        </div>
      ) : (
        <>
          {form}
          <Tabs items={tabItems} value={tab} onChange={pickTab} label="협약 상태" />
          {body}
          <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
        </>
      )}
      {ending && (
        <Modal
          title="협약을 종료할까요?"
          onClose={() => !endPending && setEnding(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setEnding(null)} disabled={endPending}>
                닫기
              </Button>
              <Button variant="danger" onClick={confirmEnd} disabled={endPending}>
                {endPending ? '종료하는 중' : '종료하기'}
              </Button>
            </>
          }
        >
          <p className={s.modalLead}>{who(ending)}</p>
          <p>종료하면 이 협약으로 발행한 상품 쿠폰이 모두 중지되고 되돌릴 수 없어요.</p>
          {endError && <Notice tone="error">{endError}</Notice>}
        </Modal>
      )}
    </ConsoleShell>
  )
}
