import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Segment, Tabs, Thumb, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import { errorMessage } from '../../lib/api'
import {
  RETURN_REASON_LABEL,
  RETURN_REASON_MAX,
  approveReturn,
  getAdminReturns,
  rejectReturn,
  type AdminReturn,
  type ReturnFilter,
} from '../../lib/api/returns'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { useProductThumbs } from '../order/common'
import { InfoRow, Notice, ReasonField } from './shared'
import s from './admin.module.css'

const COLS = { gridTemplateColumns: '1fr 1.3fr 1.6fr .6fr .8fr' }
type Tab = ReturnFilter
const TABS: Tab[] = ['REQUESTED', 'RETURNED', 'REJECTED', 'ALL']
const TAB_LABEL: Record<Tab, string> = {
  REQUESTED: '반품 요청',
  RETURNED: '반품 완료',
  REJECTED: '거절됨',
  ALL: '전체',
}

/** 한 건의 표시 상태: 거절 시각이 있으면 거절(주문은 결제 완료·구매 확정으로 돌아가요) */
const statusOf = (r: AdminReturn): [string, Tone] =>
  r.status === 'RETURNED' ? ['반품 완료', 'green'] : r.returnRejectedAt ? ['거절됨', 'red'] : ['반품 요청', 'amber']
const isOpen = (r: AdminReturn) => r.status === 'RETURN_REQUESTED'
const pad = (n: number) => String(n).padStart(2, '0')
const mmdd = (iso: string) => {
  const d = new Date(iso)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}
const buyerOf = (r: AdminReturn) => `회원 #${r.buyerId}`
const itemSummary = (r: AdminReturn) =>
  r.items.length > 1 ? `${r.items[0].productName} 외 ${r.items.length - 1}` : (r.items[0]?.productName ?? '-')
const reasonOf = (r: AdminReturn) => RETURN_REASON_LABEL[r.reasonCode] ?? r.reasonCode

/**
 * 반품 요청 목록과 심사
 * GET /api/v1/admin/returns?filter · POST /{orderId}/approve { items: [{ orderItemId, restoreStock }] } · POST /{orderId}/reject { reason }
 */
function useReturnsView() {
  const [tab, setTab] = useState<Tab>('REQUESTED')
  const list = useApi(() => getAdminReturns(tab, { size: 100 }), [tab])
  // 탭별 건수: 백엔드 목록에 건수가 없어 탭마다 1건만 받아 totalElements를 써요
  const counts = useApi(
    () => Promise.all(TABS.map((t) => getAdminReturns(t, { size: 1 }).then((r) => r.totalElements))),
    [],
  )
  const [selectedId, setSelectedId] = useState<number | null>(null)
  /** 주문 항목별 재고 복원 선택 (기본: 복원 안 함) */
  const [restock, setRestock] = useState<Record<number, boolean>>({})
  const [busyId, setBusyId] = useState<number | null>(null)
  const [done, setDone] = useState('')
  const [error, setError] = useState('')

  const items = list.data?.items ?? []
  const selected = items.find((r) => r.orderId === selectedId) ?? null

  useEffect(() => {
    setSelectedId((cur) => (cur !== null && items.some((r) => r.orderId === cur) ? cur : (items[0]?.orderId ?? null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.data])

  const refresh = () => {
    list.reload()
    counts.reload()
  }

  return {
    tab,
    changeTab: (t: Tab) => {
      setTab(t)
      setDone('')
      setError('')
    },
    list,
    items,
    count: (t: Tab) => counts.data?.[TABS.indexOf(t)],
    selected,
    select: setSelectedId,
    done,
    error,
    busyId,
    restockOf: (r: AdminReturn, orderItemId: number) =>
      isOpen(r) ? !!restock[orderItemId] : r.items.find((i) => i.orderItemId === orderItemId)?.restoreStock === true,
    toggleRestock: (orderItemId: number) => setRestock((m) => ({ ...m, [orderItemId]: !m[orderItemId] })),
    approve: async (r: AdminReturn) => {
      setBusyId(r.orderId)
      setError('')
      try {
        await approveReturn(
          r.orderId,
          r.items.map((i) => ({ orderItemId: i.orderItemId, restoreStock: !!restock[i.orderItemId] })),
        )
        setDone(`${r.orderNumber} 반품을 승인했어요. ${won(r.payAmount)}을 예치금으로 돌려줘요.`)
        refresh()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setBusyId(null)
      }
    },
    reject: async (r: AdminReturn, reason: string) => {
      setBusyId(r.orderId)
      setError('')
      try {
        const res = await rejectReturn(r.orderId, reason)
        setDone(
          `${r.orderNumber} 반품을 거절했어요. 사유가 구매자에게 보여요.` +
            (res.status === 'CONFIRMED' ? ' 확정 기준일이 지나 바로 구매 확정됐어요.' : ''),
        )
        refresh()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setBusyId(null)
      }
    },
  }
}
type View = ReturnType<typeof useReturnsView>

/** 거절 사유를 받는 모달 */
function RejectModal({ r, v, onClose }: { r: AdminReturn; v: View; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      title="반품을 거절할까요?"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            disabled={!reason.trim() || v.busyId === r.orderId}
            onClick={() => {
              v.reject(r, reason.trim())
              onClose()
            }}
          >
            거절하기
          </Button>
        </>
      }
    >
      <p className={s.modalTarget}>{r.orderNumber}</p>
      거절 사유는 구매자 주문 상세에 보여요. 거절된 주문은 다시 반품을 요청할 수 없어요.
      <ReasonField
        id={`return-reject-${r.orderId}`}
        label="거절 사유 (필수)"
        placeholder="예: 사용 흔적이 있어 반품할 수 없어요"
        value={reason}
        onChange={setReason}
        max={RETURN_REASON_MAX}
      />
    </Modal>
  )
}

/** 항목별 재고 복원 + 거절·승인 (PC 패널 · 모바일 카드 공통) */
function ReturnBody({ v, r }: { v: View; r: AdminReturn }) {
  const [rejecting, setRejecting] = useState(false)
  const open = isOpen(r)
  const thumbOf = useProductThumbs(r.items)
  return (
    <>
      <p className={`${s.panelSub} ${s.gapTop}`}>{open ? '항목별 재고 복원' : '반품 상품'}</p>
      {r.items.map((i) => (
        <div key={i.orderItemId} className={s.returnItem}>
          <Thumb src={thumbOf(i)} width={40} height={40} />
          <span>
            <b>{i.productName}</b>
            <span>
              {i.optionName} · {i.quantity}개 · {i.sellerName}
            </span>
          </span>
          {open ? (
            <label className={s.check}>
              <input
                type="checkbox"
                checked={v.restockOf(r, i.orderItemId)}
                onChange={() => v.toggleRestock(i.orderItemId)}
              />
              재고 복원
            </label>
          ) : (
            v.restockOf(r, i.orderItemId) && <Badge>재고 복원</Badge>
          )}
        </div>
      ))}
      {open && (
        <>
          <p className={s.panelNote}>
            파손·사용한 상품은 복원하지 않아요. 삭제된 상품은 복원할 수 없어요. 사용한 쿠폰은 돌려주지 않아요.
          </p>
          <div className={s.btnRow}>
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)} disabled={v.busyId === r.orderId}>
              거절하기
            </Button>
            <Button size="sm" onClick={() => v.approve(r)} disabled={v.busyId === r.orderId}>
              {v.busyId === r.orderId ? '처리 중…' : '승인하고 환불하기'}
            </Button>
          </div>
        </>
      )}
      {rejecting && <RejectModal r={r} v={v} onClose={() => setRejecting(false)} />}
    </>
  )
}

const tabItems = (v: View) =>
  TABS.map((t) => {
    const n = v.count(t)
    return { value: t, label: n === undefined ? TAB_LABEL[t] : `${TAB_LABEL[t]} ${n}` }
  })

function DesktopReturns({ v }: { v: View }) {
  const d = v.selected
  return (
    <div className={`${s.split} ${s.splitWide}`}>
      <div>
        <div className={c.toolbar}>
          <Segment label="반품 상태" value={v.tab} onChange={v.changeTab} items={tabItems(v)} />
        </div>
        <Notice>{v.done}</Notice>
        <Notice tone="error">{v.error}</Notice>
        {v.list.loading && !v.list.data && <Loading label="반품 목록을 불러오고 있어요" />}
        {v.list.error && !v.list.data && <ErrorView message={v.list.error} onRetry={v.list.reload} />}
        {v.list.data && (
          <div role="table" className={c.table}>
            <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
              <span>주문번호</span>
              <span>구매자</span>
              <span>상품</span>
              <span>요청일</span>
              <span>상태</span>
            </div>
            {v.items.length === 0 && <div className={s.tableEmpty}>이 상태의 반품이 없어요.</div>}
            {v.items.map((r) => (
              <div
                role="row"
                key={r.orderId}
                tabIndex={0}
                aria-selected={d?.orderId === r.orderId}
                className={`${c.tr} ${c.clickable} ${d?.orderId === r.orderId ? c.selected : ''}`}
                style={COLS}
                onClick={() => v.select(r.orderId)}
                onKeyDown={(e) => e.key === 'Enter' && v.select(r.orderId)}
              >
                <span className={`${c.ellipsis} ${c.strong}`}>{r.orderNumber}</span>
                <span className={c.ellipsis}>{buyerOf(r)}</span>
                <span className={c.ellipsis}>{itemSummary(r)}</span>
                <span className={c.num}>{mmdd(r.returnRequestedAt)}</span>
                <span>
                  <Badge tone={statusOf(r)[1]}>{statusOf(r)[0]}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <section className={s.panel} aria-label="반품 상세">
        {!d ? (
          <p className={s.panelEmpty}>반품을 고르면 상세가 보여요.</p>
        ) : (
          <>
            <h2 className={s.panelTitle}>
              {d.orderNumber} · {statusOf(d)[0]}
            </h2>
            <InfoRow label="구매자">{buyerOf(d)}</InfoRow>
            <InfoRow label="요청일">{mmdd(d.returnRequestedAt)}</InfoRow>
            {d.deliveredAt && <InfoRow label="배송 완료">{mmdd(d.deliveredAt)}</InfoRow>}
            <InfoRow label="사유">{reasonOf(d)}</InfoRow>
            <InfoRow label="환불 금액">
              {won(d.payAmount)}
              {d.shippingFee > 0 && ` (배송비 ${won(d.shippingFee)} 포함)`}
            </InfoRow>
            {d.reason && <p className={s.cardText}>{d.reason}</p>}
            <ReturnBody v={v} r={d} />
          </>
        )}
      </section>
    </div>
  )
}

function MobileReturns({ v }: { v: View }) {
  return (
    <div className={s.mBody}>
      <div className={s.mTabs}>
        <Tabs label="반품 상태" value={v.tab} onChange={v.changeTab} items={tabItems(v)} />
      </div>
      {(v.done || v.error) && (
        <div className={s.mBar}>
          <Notice>{v.done}</Notice>
          <Notice tone="error">{v.error}</Notice>
        </div>
      )}
      {v.list.loading && !v.list.data && <Loading label="반품 목록을 불러오고 있어요" />}
      {v.list.error && !v.list.data && <ErrorView message={v.list.error} onRetry={v.list.reload} />}
      {v.list.data && v.items.length === 0 && <Empty title="이 상태의 반품이 없어요" />}
      <div className={s.mCards}>
        {v.items.map((r) => (
          <article key={r.orderId} className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardMeta}>
                {r.orderNumber} · 요청일 {mmdd(r.returnRequestedAt)}
              </span>
              <Badge tone={statusOf(r)[1]}>{statusOf(r)[0]}</Badge>
            </div>
            <p className={s.cardMeta}>
              {buyerOf(r)} · <b>{won(r.payAmount)}</b>
              {r.shippingFee > 0 && ' (배송비 포함)'}
            </p>
            <p className={s.cardText}>
              <b>{reasonOf(r)}</b>
              {r.reason && (
                <>
                  <br />
                  {r.reason}
                </>
              )}
            </p>
            <ReturnBody v={v} r={r} />
          </article>
        ))}
      </div>
    </div>
  )
}

/** 관리자 · 반품 심사 */
export default function AdminReturns() {
  const desktop = useIsDesktop()
  const v = useReturnsView()
  return (
    <ConsoleShell variant="admin" active="returns" title="반품 심사">
      {desktop ? <DesktopReturns v={v} /> : <MobileReturns v={v} />}
    </ConsoleShell>
  )
}
