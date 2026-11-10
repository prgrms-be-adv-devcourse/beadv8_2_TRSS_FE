import { useState } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty, ErrorView, Loading, Tabs, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { errorMessage } from '../../lib/api'
import { COUPON_DISPLAY_STATUS_LABEL, type CouponDisplayStatus, type ProductCoupon } from '../../lib/api/coupon'
import {
  acceptPartnership,
  endInfluencerPartnership,
  getInfluencerCoupons,
  getInfluencerPartnerships,
  PARTNERSHIP_ENDED_BY_LABEL,
  rejectPartnership,
  type Partnership,
} from '../../lib/api/partnership'
import { useApi } from '../../lib/useApi'
import { fmtMd } from '../account/util'
import s from './influencer.module.css'

type Tab = 'REQUESTED' | 'ACTIVE' | 'CLOSED'
type Action = { kind: 'accept' | 'reject' | 'end'; p: Partnership }

const COUPON_TONE: Record<CouponDisplayStatus, Tone> = {
  SCHEDULED: 'blue',
  ACTIVE: 'green',
  ENDED: 'neutral',
  STOPPED: 'red',
}

const ACTION_TEXT: Record<Action['kind'], { title: string; body: string; label: string }> = {
  accept: {
    title: '협약을 수락할까요?',
    body: '수락하면 판매자가 내 pick 상품에 쿠폰을 발행할 수 있어요. 판매자와 협약은 한 번에 하나만 진행할 수 있어요.',
    label: '수락하기',
  },
  reject: { title: '협약 요청을 거절할까요?', body: '거절하면 판매자에게 알려져요.', label: '거절하기' },
  end: { title: '협약을 종료할까요?', body: '종료하면 이 협약으로 발행된 상품 쿠폰도 모두 중지돼요.', label: '종료하기' },
}

function discountText(c: ProductCoupon) {
  if (c.discountType === 'RATE')
    return `${c.discountValue}%${c.maxDiscountAmount ? ` · 최대 ${won(c.maxDiscountAmount)}` : ''}`
  return won(c.discountValue)
}

/** I4 협약 · 발행받은 쿠폰 (승인된 인플루언서) */
export default function InfluencerPartnersPage() {
  const [tab, setTab] = useState<Tab>('REQUESTED')
  // 협약 수가 많지 않아 한 번에 받아 탭별로 나눠요
  const partnerships = useApi(() => getInfluencerPartnerships({ size: 100 }), [])
  const coupons = useApi(() => getInfluencerCoupons({ size: 50 }), [])
  const [action, setAction] = useState<Action | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [msg, setMsg] = useState('')
  const [copied, setCopied] = useState<number | null>(null)

  const all = partnerships.data?.items ?? []
  const requested = all.filter((p) => p.status === 'REQUESTED')
  const active = all.filter((p) => p.status === 'ACTIVE')
  const closed = all.filter((p) => p.status === 'ENDED' || p.status === 'REJECTED')
  const couponCount = (partnershipId: number) =>
    (coupons.data?.items ?? []).filter((c) => c.partnershipId === partnershipId).length

  async function run() {
    if (!action || busy) return
    setBusy(true)
    setActionError('')
    try {
      const id = action.p.partnershipId
      if (action.kind === 'accept') await acceptPartnership(id)
      else if (action.kind === 'reject') await rejectPartnership(id)
      else await endInfluencerPartnership(id)
      setMsg(
        action.kind === 'accept'
          ? '협약을 수락했어요.'
          : action.kind === 'reject'
            ? '협약 요청을 거절했어요.'
            : '협약을 종료했어요. 이 협약의 쿠폰도 중지됐어요.',
      )
      setAction(null)
      partnerships.reload()
      coupons.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  async function copy(c: ProductCoupon) {
    try {
      await navigator.clipboard.writeText(c.code)
      setCopied(c.couponId)
    } catch {
      setMsg('복사하지 못했어요. 코드를 길게 눌러 복사해 주세요.')
    }
  }

  const name = (p: Partnership) => p.businessName ?? `판매자 #${p.sellerId}`

  return (
    <AppFrame>
      <PageHeader title="협약 · 쿠폰" badge="인플루언서" back="/mypage" />
      <Tabs
        label="협약 상태"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'REQUESTED', label: `요청 ${requested.length}` },
          { value: 'ACTIVE', label: `진행 중 ${active.length}` },
          { value: 'CLOSED', label: `종료 ${closed.length}` },
        ]}
      />
      {msg && (
        <p role="status" className={s.msg}>
          {msg}
        </p>
      )}
      <section className={s.section}>
        {partnerships.loading && !partnerships.data && <Loading />}
        {partnerships.error && <ErrorView message={partnerships.error} onRetry={partnerships.reload} />}

        {partnerships.data && tab === 'REQUESTED' && (
          <>
            {requested.length === 0 && <Empty title="받은 협약 요청이 없어요" />}
            {requested.map((p) => (
              <article key={p.partnershipId} className={s.req}>
                <div className={s.reqHead}>
                  <b>{name(p)}</b>
                  <Badge tone="amber">응답 대기</Badge>
                </div>
                {p.requestMessage && <p className={s.quote}>“{p.requestMessage}”</p>}
                <p className={s.meta}>{fmtMd(p.requestedAt)} 요청 · 판매자와 협약은 한 번에 하나만 진행할 수 있어요</p>
                <div className={s.btns}>
                  <Button variant="outline" size="sm" onClick={() => (setActionError(''), setAction({ kind: 'reject', p }))}>
                    거절
                  </Button>
                  <Button size="sm" onClick={() => (setActionError(''), setAction({ kind: 'accept', p }))}>
                    수락
                  </Button>
                </div>
              </article>
            ))}
          </>
        )}

        {partnerships.data && tab === 'ACTIVE' && (
          <>
            <h2>진행 중인 협약</h2>
            {active.length === 0 && <Empty title="진행 중인 협약이 없어요" />}
            {active.map((p) => (
              <div key={p.partnershipId} className={s.partner}>
                <b>{name(p)}</b>
                <span>
                  {fmtMd(p.acceptedAt)}부터 · 쿠폰 {couponCount(p.partnershipId)}
                </span>
                <Button variant="outline" size="sm" onClick={() => (setActionError(''), setAction({ kind: 'end', p }))}>
                  종료
                </Button>
              </div>
            ))}
          </>
        )}

        {partnerships.data && tab === 'CLOSED' && (
          <>
            <h2>끝난 협약</h2>
            {closed.length === 0 && <Empty title="끝난 협약이 없어요" />}
            {closed.map((p) => (
              <div key={p.partnershipId} className={s.partner}>
                <b>{name(p)}</b>
                <span>
                  {p.status === 'REJECTED'
                    ? `${fmtMd(p.rejectedAt)} 거절`
                    : `${fmtMd(p.endedAt)} 종료${p.endedBy ? ` · ${PARTNERSHIP_ENDED_BY_LABEL[p.endedBy]}` : ''}`}
                </span>
              </div>
            ))}
          </>
        )}
      </section>

      <div className={s.divider} />
      <section className={s.section}>
        <h2>발행받은 쿠폰</h2>
        <p className={s.sectionLead}>코드를 구독자에게 알려 주세요. 협약을 종료하면 쿠폰도 중지돼요.</p>
        {coupons.loading && !coupons.data && <Loading />}
        {coupons.error && <ErrorView message={coupons.error} onRetry={coupons.reload} />}
        {coupons.data && coupons.data.items.length === 0 && <Empty title="아직 발행받은 쿠폰이 없어요" />}
        {coupons.data?.items.map((c) => (
          <div key={c.couponId} className={s.coupon}>
            <div className={s.reqHead}>
              <b>{c.name}</b>
              <Badge tone={COUPON_TONE[c.status]}>{COUPON_DISPLAY_STATUS_LABEL[c.status]}</Badge>
            </div>
            <p className={s.meta}>
              {c.productName ?? '상품'} · {discountText(c)} · {fmtMd(c.validFrom)} ~ {fmtMd(c.validUntil)}
            </p>
            <div className={s.codeRow}>
              <span className={s.code}>{c.code}</span>
              <Button variant="outline" size="sm" onClick={() => copy(c)}>
                {copied === c.couponId ? '복사됨' : '코드 복사'}
              </Button>
            </div>
            <p className={s.meta}>
              사용 {c.usedCount}회
              {c.remainingQuantity !== null ? ` · 남은 수량 ${c.remainingQuantity}` : ''}
              {c.stopReason ? ` · 중지 사유: ${c.stopReason}` : ''}
            </p>
          </div>
        ))}
      </section>

      {action && (
        <Modal
          title={ACTION_TEXT[action.kind].title}
          onClose={() => setAction(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setAction(null)}>
                닫기
              </Button>
              <Button variant={action.kind === 'accept' ? 'primary' : 'danger'} disabled={busy} onClick={run}>
                {ACTION_TEXT[action.kind].label}
              </Button>
            </>
          }
        >
          <b>{name(action.p)}</b>
          <br />
          {ACTION_TEXT[action.kind].body}
          {actionError && (
            <p role="alert" className={s.err}>
              {actionError}
            </p>
          )}
        </Modal>
      )}
    </AppFrame>
  )
}
