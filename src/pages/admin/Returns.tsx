import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, Segment, Tabs, Thumb, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import { useIsDesktop } from '../../lib/useMedia'
import { MOCK_RETURNS, type MockReturn, type ReturnStatus } from './mock'
import { InfoRow, Notice, ReasonField } from './shared'
import s from './admin.module.css'

const COLS = { gridTemplateColumns: '1fr 1.3fr 1.6fr .6fr .8fr' }
type Tab = ReturnStatus | 'ALL'
const TABS: Tab[] = ['REQUESTED', 'COMPLETED', 'REJECTED', 'ALL']
const STATUS: Record<ReturnStatus, [string, Tone]> = {
  REQUESTED: ['반품 요청', 'amber'],
  COMPLETED: ['반품 완료', 'green'],
  REJECTED: ['반려됨', 'red'],
}

const itemSummary = (r: MockReturn) => (r.items.length > 1 ? `${r.items[0].name} 외 ${r.items.length - 1}` : r.items[0].name)

/** 반품 요청 목록과 심사 (목업) */
function useReturnsView() {
  // TODO(API 미구현): GET /api/v1/admin/returns — 지금은 목업 목록을 화면 상태로만 들고 있어요
  const [rows, setRows] = useState<MockReturn[]>(MOCK_RETURNS)
  const [tab, setTab] = useState<Tab>('REQUESTED')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [done, setDone] = useState('')

  const items = rows.filter((r) => tab === 'ALL' || r.status === tab)
  const selected = rows.find((r) => r.id === selectedId) ?? null

  useEffect(() => {
    setSelectedId((cur) => (cur !== null && items.some((r) => r.id === cur) ? cur : (items[0]?.id ?? null)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const update = (id: number, fn: (r: MockReturn) => MockReturn) =>
    setRows((all) => all.map((r) => (r.id === id ? fn(r) : r)))

  return {
    tab,
    changeTab: (t: Tab) => {
      setTab(t)
      setDone('')
    },
    items,
    count: (t: Tab) => (t === 'ALL' ? rows.length : rows.filter((r) => r.status === t).length),
    selected,
    select: setSelectedId,
    done,
    toggleRestock: (id: number, itemId: number) =>
      update(id, (r) => ({ ...r, items: r.items.map((i) => (i.id === itemId ? { ...i, restock: !i.restock } : i)) })),
    /** TODO(API 미구현): POST /api/v1/admin/returns/{id}/approve { restockItemIds } — 승인하면 예치금 환불 */
    approve: (r: MockReturn) => {
      update(r.id, (x) => ({ ...x, status: 'COMPLETED' }))
      setDone(`${r.orderNumber} 반품을 승인했어요. ${won(r.refundAmount)}을 예치금으로 돌려줬어요.`)
    },
    /** TODO(API 미구현): POST /api/v1/admin/returns/{id}/reject { reason } */
    reject: (r: MockReturn, reason: string) => {
      update(r.id, (x) => ({ ...x, status: 'REJECTED', rejectReason: reason }))
      setDone(`${r.orderNumber} 반품을 반려했어요. 사유가 구매자에게 보여요.`)
    },
  }
}
type View = ReturnType<typeof useReturnsView>

/** 반려 사유를 받는 모달 */
function RejectModal({ r, v, onClose }: { r: MockReturn; v: View; onClose: () => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal
      title="반품을 반려할까요?"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button
            disabled={!reason.trim()}
            onClick={() => {
              v.reject(r, reason.trim())
              onClose()
            }}
          >
            반려하기
          </Button>
        </>
      }
    >
      <p className={s.modalTarget}>{r.orderNumber}</p>
      반려 사유는 구매자에게 보여요.
      <ReasonField
        id={`return-reject-${r.id}`}
        label="반려 사유 (필수)"
        placeholder="예: 사용 흔적이 있어 반품할 수 없어요"
        value={reason}
        onChange={setReason}
        max={300}
      />
    </Modal>
  )
}

/** 항목별 재고 복원 + 반려·승인 (PC 패널 · 모바일 카드 공통) */
function ReturnBody({ v, r }: { v: View; r: MockReturn }) {
  const [rejecting, setRejecting] = useState(false)
  const open = r.status === 'REQUESTED'
  return (
    <>
      <p className={`${s.panelSub} ${s.gapTop}`}>{open ? '항목별 재고 복원' : '반품 상품'}</p>
      {r.items.map((i) => (
        <div key={i.id} className={s.returnItem}>
          <Thumb src={i.image} width={40} height={40} />
          <span>
            <b>{i.name}</b>
            <span>{i.option}</span>
          </span>
          {open ? (
            <label className={s.check}>
              <input type="checkbox" checked={i.restock} onChange={() => v.toggleRestock(r.id, i.id)} />
              재고 복원
            </label>
          ) : (
            i.restock && <Badge>재고 복원</Badge>
          )}
        </div>
      ))}
      {open && (
        <>
          <p className={s.panelNote}>파손·사용한 상품은 복원하지 않아요. 사용한 쿠폰은 돌려주지 않아요.</p>
          <div className={s.btnRow}>
            <Button variant="outline" size="sm" onClick={() => setRejecting(true)}>
              반려하기
            </Button>
            <Button size="sm" onClick={() => v.approve(r)}>
              승인하고 환불하기
            </Button>
          </div>
        </>
      )}
      {r.rejectReason && (
        <p className={s.reqReason}>
          <b>반려 사유</b>
          {r.rejectReason}
        </p>
      )}
      {rejecting && <RejectModal r={r} v={v} onClose={() => setRejecting(false)} />}
    </>
  )
}

function DesktopReturns({ v }: { v: View }) {
  const d = v.selected
  return (
    <div className={`${s.split} ${s.splitWide}`}>
      <div>
        <div className={c.toolbar}>
          <Segment
            label="반품 상태"
            value={v.tab}
            onChange={v.changeTab}
            items={TABS.map((t) => ({
              value: t,
              label: t === 'ALL' ? '전체' : `${STATUS[t][0]} ${v.count(t)}`,
            }))}
          />
        </div>
        <Notice>{v.done}</Notice>
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
              key={r.id}
              tabIndex={0}
              aria-selected={d?.id === r.id}
              className={`${c.tr} ${c.clickable} ${d?.id === r.id ? c.selected : ''}`}
              style={COLS}
              onClick={() => v.select(r.id)}
              onKeyDown={(e) => e.key === 'Enter' && v.select(r.id)}
            >
              <span className={`${c.ellipsis} ${c.strong}`}>{r.orderNumber}</span>
              <span className={c.ellipsis}>{r.buyer}</span>
              <span className={c.ellipsis}>{itemSummary(r)}</span>
              <span className={c.num}>{r.requestedAt}</span>
              <span>
                <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
              </span>
            </div>
          ))}
        </div>
      </div>
      <section className={s.panel} aria-label="반품 상세">
        {!d ? (
          <p className={s.panelEmpty}>반품을 고르면 상세가 보여요.</p>
        ) : (
          <>
            <h2 className={s.panelTitle}>
              {d.orderNumber} · {STATUS[d.status][0]}
            </h2>
            <InfoRow label="구매자">{d.buyer}</InfoRow>
            <InfoRow label="요청일">{d.requestedAt}</InfoRow>
            <InfoRow label="사유">{d.reason}</InfoRow>
            <InfoRow label="환불 금액">
              {won(d.refundAmount)}
              {d.shippingIncluded && ' (배송비 포함)'}
            </InfoRow>
            <p className={s.cardText}>{d.detail}</p>
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
        <Tabs
          label="반품 상태"
          value={v.tab}
          onChange={v.changeTab}
          items={TABS.map((t) => ({ value: t, label: t === 'ALL' ? '전체' : `${STATUS[t][0]} ${v.count(t)}` }))}
        />
      </div>
      {v.done && (
        <div className={s.mBar}>
          <Notice>{v.done}</Notice>
        </div>
      )}
      {v.items.length === 0 && <Empty title="이 상태의 반품이 없어요" />}
      <div className={s.mCards}>
        {v.items.map((r) => (
          <article key={r.id} className={s.card}>
            <div className={s.cardHead}>
              <span className={s.cardMeta}>
                {r.orderNumber} · 요청일 {r.requestedAt}
              </span>
              <Badge tone={STATUS[r.status][1]}>{STATUS[r.status][0]}</Badge>
            </div>
            <p className={s.cardMeta}>
              {r.buyer} · <b>{won(r.refundAmount)}</b>
              {r.shippingIncluded && ' (배송비 포함)'}
            </p>
            <p className={s.cardText}>
              <b>{r.reason}</b>
              <br />
              {r.detail}
            </p>
            <ReturnBody v={v} r={r} />
          </article>
        ))}
      </div>
    </div>
  )
}

/** 관리자 · 반품 심사 (백엔드 API 없음 → 목업) */
export default function AdminReturns() {
  const desktop = useIsDesktop()
  const v = useReturnsView()
  return (
    <ConsoleShell variant="admin" active="returns" title="반품 심사">
      {desktop ? <DesktopReturns v={v} /> : <MobileReturns v={v} />}
    </ConsoleShell>
  )
}
