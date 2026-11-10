import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Segment, Tabs } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  approveSeller,
  approveSellerWithdrawal,
  getAdminSeller,
  getAdminSellers,
  rejectSeller,
  rejectSellerWithdrawal,
  sanctionSeller,
  type AdminSeller,
  type AdminSellerCounts,
  type AdminSellerDetail,
  type SellerStatus,
} from '../../lib/api/member'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import {
  InfoRow,
  Notice,
  Pager,
  ReasonField,
  SELLER_STATUS,
  fmtBusinessNumber,
  fmtDay,
  fmtPhone,
} from './shared'
import s from './admin.module.css'

const PAGE_SIZE = 20
const COLS = { gridTemplateColumns: '1.2fr 1fr 1.2fr .7fr .9fr' }

// ALL = 상태 필터 없이 전체
type Tab = SellerStatus | 'ALL'
const TABS: Tab[] = ['PENDING', 'WITHDRAW_REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'SANCTIONED', 'ALL']
const COUNT_KEY: Record<Tab, keyof AdminSellerCounts> = {
  ALL: 'all',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  WITHDRAW_REQUESTED: 'withdrawRequested',
  WITHDRAWN: 'withdrawn',
  SANCTIONED: 'sanctioned',
}

type Action = 'approve' | 'reject' | 'withdrawalApprove' | 'withdrawalReject' | 'sanction'

/** 상태별로 할 수 있는 동작 */
const ALLOWED: Record<Action, SellerStatus[]> = {
  approve: ['PENDING'],
  reject: ['PENDING'],
  withdrawalApprove: ['WITHDRAW_REQUESTED'],
  withdrawalReject: ['WITHDRAW_REQUESTED'],
  sanction: ['APPROVED', 'WITHDRAW_REQUESTED'],
}
const NEEDS_REASON: Action[] = ['reject', 'withdrawalReject', 'sanction']
const DONE_MESSAGE: Record<Action, string> = {
  approve: '승인했어요. 이 계정에 판매자 권한이 생겼어요.',
  reject: '반려했어요. 사유가 판매자에게 보여요.',
  withdrawalApprove: '철회를 승인했어요.',
  withdrawalReject: '철회를 거절했어요. 다시 판매 중이에요.',
  sanction: '제재했어요. 판매 철회와 상품 중지·주문 취소·정산 보류가 함께 처리돼요.',
}
const HISTORY_LABEL: Partial<Record<SellerStatus, string>> = {
  PENDING: '신청',
  APPROVED: '승인',
  REJECTED: '반려',
  WITHDRAW_REQUESTED: '철회 요청',
  WITHDRAWN: '철회',
  SANCTIONED: '제재',
}

const tabLabel = (t: Tab, counts?: AdminSellerCounts) =>
  `${t === 'ALL' ? '전체' : SELLER_STATUS[t][0]}${counts ? ` ${counts[COUNT_KEY[t]]}` : ''}`

/** 심사 동작. 판매자 ID와 지금 상태만 있으면 돼요 (모바일 카드는 상세 없이 바로 처리) */
function useSellerActions(onDone: (detail: AdminSellerDetail, action: Action) => void) {
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<{ id: number; message: string } | null>(null)

  async function run(id: number, status: SellerStatus, action: Action, reason: string) {
    if (busyId !== null || !ALLOWED[action].includes(status)) return false
    const r = reason.trim()
    if (NEEDS_REASON.includes(action) && !r) {
      setError({ id, message: '사유를 입력해 주세요.' })
      return false
    }
    setError(null)
    setBusyId(id)
    try {
      const calls: Record<Action, () => Promise<AdminSellerDetail>> = {
        approve: () => approveSeller(id),
        reject: () => rejectSeller(id, r),
        withdrawalApprove: () => approveSellerWithdrawal(id),
        withdrawalReject: () => rejectSellerWithdrawal(id, r),
        sanction: () => sanctionSeller(id, r),
      }
      onDone(await calls[action](), action)
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

/** 목록(탭·페이지)과 선택한 판매자 상세 */
function useSellersView() {
  const [tab, setTab] = useState<Tab>('PENDING')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminSellerDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const [done, setDone] = useState('')

  const list = useApi(
    () => getAdminSellers({ status: tab === 'ALL' ? undefined : tab, page: toPageParam(page), size: PAGE_SIZE }),
    [tab, page],
  )

  // 새 목록이 도착했을 때 선택한 줄이 없으면 첫 줄을 고른다 (응답 기준)
  useEffect(() => {
    const first = list.data?.sellers.items[0]
    if (first) setSelectedId((cur) => cur ?? first.sellerId)
  }, [list.data])

  useEffect(() => {
    setDetailError('')
    if (selectedId === null) return setDetail(null)
    let alive = true
    getAdminSeller(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  const actions = useSellerActions((d, action) => {
    if (d.sellerId === selectedId) setDetail(d)
    setDone(`${d.businessName} · ${DONE_MESSAGE[action]}`)
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
    items: list.data?.sellers.items ?? [],
    totalPages: list.data?.sellers.totalPages ?? 0,
    counts: list.data?.counts,
    selectedId,
    select: (id: number) => {
      setSelectedId(id)
      setDone('')
      actions.clearError()
    },
    detail,
    detailError,
    done,
    actions,
  }
}
type View = ReturnType<typeof useSellersView>

/** 제재는 되돌릴 수 없어서 한 번 더 물어봐요 */
function SanctionConfirm({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal
      title="이 판매자를 제재할까요?"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            제재하기
          </Button>
        </>
      }
    >
      <p className={s.modalTarget}>{name}</p>
      판매 상품은 모두 중지되고, 결제 전 주문은 취소되고, 정산은 보류돼요. 제재하면 다시 신청할 수 없어요.
    </Modal>
  )
}

/** 상태에 맞는 처리 영역 (사유 입력 + 버튼). PC 패널 · 모바일 카드 공통 */
function SellerActions({
  v,
  id,
  name,
  status,
  compact,
}: {
  v: View
  id: number
  name: string
  status: SellerStatus
  compact?: boolean
}) {
  const [reason, setReason] = useState('')
  const [confirmSanction, setConfirmSanction] = useState(false)
  const busy = v.actions.busyId !== null
  const error = v.actions.error?.id === id ? v.actions.error.message : ''
  const run = async (a: Action) => {
    if (await v.actions.run(id, status, a, reason)) setReason('')
  }
  const fieldId = `reason-${id}`

  // 상태가 바뀌면 입력하던 사유를 비워요
  useEffect(() => setReason(''), [id, status])

  if (status === 'PENDING') {
    return (
      <>
        <ReasonField
          id={fieldId}
          label="반려 사유"
          hint="(반려할 때 필수)"
          rows={compact ? 2 : 3}
          placeholder="예: 사업자 정보가 맞지 않아요"
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
  if (status === 'WITHDRAW_REQUESTED' || status === 'APPROVED') {
    const withdraw = status === 'WITHDRAW_REQUESTED'
    return (
      <>
        <ReasonField
          id={fieldId}
          label={withdraw ? '사유' : '제재 사유'}
          hint={withdraw ? '(철회 거절·제재할 때 필수)' : '(필수 · 제재하면 다시 신청할 수 없어요)'}
          rows={compact ? 2 : 3}
          placeholder={withdraw ? '예: 진행 중인 주문이 남아 있어요' : '예: 허위 상품 정보가 반복해서 확인됐어요'}
          value={reason}
          onChange={setReason}
        />
        <Notice tone="error">{error}</Notice>
        <div className={s.btnRow}>
          {withdraw && (
            <>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => run('withdrawalReject')}>
                철회 거절
              </Button>
              <Button size="sm" disabled={busy} onClick={() => run('withdrawalApprove')}>
                철회 승인
              </Button>
            </>
          )}
          <Button
            variant="dangerOutline"
            size="sm"
            disabled={busy}
            onClick={() => (reason.trim() ? setConfirmSanction(true) : run('sanction'))}
          >
            판매자 제재하기
          </Button>
        </div>
        <p className={s.panelNote}>판매 상품은 모두 중지, 결제 전 주문은 취소, 정산은 보류돼요.</p>
        {confirmSanction && (
          <SanctionConfirm
            name={name}
            onClose={() => setConfirmSanction(false)}
            onConfirm={() => {
              setConfirmSanction(false)
              run('sanction')
            }}
          />
        )}
      </>
    )
  }
  return null
}

function SellerPanel({ v }: { v: View }) {
  const d = v.detail
  if (v.detailError) return <Notice tone="error">{v.detailError}</Notice>
  if (!d) return <Loading />
  return (
    <>
      <h2 className={s.panelTitle}>
        {d.businessName} · {SELLER_STATUS[d.status][0]}
      </h2>
      <InfoRow label="신청자">
        {d.name} ({d.email})
      </InfoRow>
      <InfoRow label="사업자등록번호">{fmtBusinessNumber(d.businessNumber)}</InfoRow>
      <InfoRow label="대표자">{d.representativeName}</InfoRow>
      <InfoRow label="연락처">{fmtPhone(d.phoneNumber)}</InfoRow>
      <InfoRow label="정산 계좌">
        {d.bankName} ···· {d.accountNumber.slice(-4)}
      </InfoRow>
      <InfoRow label="신청일">{fmtDay(d.appliedAt)}</InfoRow>
      {d.histories.length > 0 && (
        <>
          <p className={`${s.panelSub} ${s.gapTop}`}>상태 이력</p>
          <ol className={s.history}>
            {d.histories.map((h, i) => (
              <li key={i}>
                <b>{HISTORY_LABEL[h.toStatus] ?? SELLER_STATUS[h.toStatus][0]}</b> · {fmtDay(h.changedAt)}
                {h.reason && <span className={s.historyNote}>사유: {h.reason}</span>}
              </li>
            ))}
          </ol>
        </>
      )}
      <SellerActions v={v} id={d.sellerId} name={d.businessName} status={d.status} />
      {(d.status === 'PENDING' || d.status === 'REJECTED') && (
        <div className={s.panelSection}>
          <p className={s.panelSub}>판매 중인 판매자를 고르면</p>
          <p className={s.panelNote}>
            제재 사유를 입력하고 바로 제재할 수 있어요. 상품 중지·결제 전 주문 취소·정산 보류가 함께 처리돼요.
          </p>
        </div>
      )}
    </>
  )
}

function DesktopSellers({ v }: { v: View }) {
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
            <span>상호명</span>
            <span>신청자</span>
            <span>사업자번호</span>
            <span>신청일</span>
            <span>상태</span>
          </div>
          {list.loading && !list.data && <Loading />}
          {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
          {list.data && v.items.length === 0 && <div className={s.tableEmpty}>이 상태의 판매자가 없어요.</div>}
          {v.items.map((r) => (
            <div
              role="row"
              key={r.sellerId}
              tabIndex={0}
              aria-selected={v.selectedId === r.sellerId}
              className={`${c.tr} ${c.clickable} ${v.selectedId === r.sellerId ? c.selected : ''}`}
              style={COLS}
              onClick={() => v.select(r.sellerId)}
              onKeyDown={(e) => e.key === 'Enter' && v.select(r.sellerId)}
            >
              <span className={`${c.ellipsis} ${c.strong}`}>{r.businessName}</span>
              <span className={c.ellipsis}>{r.email}</span>
              <span className={c.num}>{fmtBusinessNumber(r.businessNumber)}</span>
              <span className={c.num}>{fmtDay(r.appliedAt)}</span>
              <span>
                <Badge tone={SELLER_STATUS[r.status][1]}>{SELLER_STATUS[r.status][0]}</Badge>
              </span>
            </div>
          ))}
        </div>
        <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
      </div>
      <section className={s.panel} aria-label="판매자 상세">
        {v.selectedId === null ? <p className={s.panelEmpty}>판매자를 고르면 상세가 보여요.</p> : <SellerPanel v={v} />}
      </section>
    </div>
  )
}

function SellerCard({ v, r }: { v: View; r: AdminSeller }) {
  return (
    <article className={s.card}>
      <div className={s.cardHead}>
        <b>{r.businessName}</b>
        <Badge tone={SELLER_STATUS[r.status][1]}>{SELLER_STATUS[r.status][0]}</Badge>
      </div>
      <dl className={s.dl}>
        <dt>신청자</dt>
        <dd>{r.email}</dd>
        <dt>사업자번호</dt>
        <dd>{fmtBusinessNumber(r.businessNumber)}</dd>
        <dt>신청일</dt>
        <dd>{fmtDay(r.appliedAt)}</dd>
      </dl>
      <SellerActions v={v} id={r.sellerId} name={r.businessName} status={r.status} compact />
    </article>
  )
}

function MobileSellers({ v }: { v: View }) {
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
      {list.data && v.items.length === 0 && <Empty title="이 상태의 판매자가 없어요" />}
      <div className={s.mCards}>
        {v.items.map((r) => (
          <SellerCard key={r.sellerId} v={v} r={r} />
        ))}
      </div>
      <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
    </div>
  )
}

/** 관리자 · 판매자 심사 */
export default function AdminSellers() {
  const desktop = useIsDesktop()
  const v = useSellersView()
  return (
    <ConsoleShell variant="admin" active="sellers" title="판매자 심사">
      {desktop ? <DesktopSellers v={v} /> : <MobileSellers v={v} />}
    </ConsoleShell>
  )
}
