import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import c from '../../components/ui/console.module.css'
import f from '../../components/ui/form.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  COUPON_DISPLAY_STATUS_LABEL,
  COUPON_STOPPED_BY_LABEL,
  getSellerCoupon,
  getSellerCoupons,
  stopSellerCoupon,
  updateProductCoupon,
  type CouponDisplayStatus,
  type ProductCoupon,
  type ProductCouponUpdateRequest,
} from '../../lib/api/coupon'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import CouponFields from './CouponFields'
import { couponProblem, emptyCouponForm, type CouponForm } from './couponRules'
import { Notice, Pager, endDateOf, endExclusiveOf, fmtPeriod, startOf } from './shared'
import s from './seller.module.css'

const PAGE_SIZE = 20
const COLS = '1.3fr 1.3fr .8fr 1fr 1fr 1fr .7fr .8fr .6fr 1.1fr'

const TONE: Record<CouponDisplayStatus, Tone> = { SCHEDULED: 'blue', ACTIVE: 'green', ENDED: 'neutral', STOPPED: 'red' }
const STATUS_LABEL: Record<CouponDisplayStatus, string> = { ...COUPON_DISPLAY_STATUS_LABEL, ACTIVE: '진행 중' }

const discountText = (x: Pick<ProductCoupon, 'discountType' | 'discountValue' | 'maxDiscountAmount'>) =>
  x.discountType === 'RATE'
    ? `${x.discountValue}%${x.maxDiscountAmount ? ` · 최대 ${won(x.maxDiscountAmount)}` : ''}`
    : won(x.discountValue)
const usageText = (x: ProductCoupon) => `${x.usedCount} / ${x.quantityLimited ? x.totalQuantity : '제한 없음'}`
const stoppedText = (x: ProductCoupon) =>
  x.stoppedBy === 'SYSTEM'
    ? '협약 종료 등으로 자동 중지'
    : x.stoppedBy
      ? `${COUPON_STOPPED_BY_LABEL[x.stoppedBy]}${x.stopReason ? ` · ${x.stopReason}` : ''}`
      : '중지됨'

type Editing = { coupon: ProductCoupon; mode: 'edit' | 'extend' }

/** 쿠폰 → 수정 폼 값 */
const toForm = (x: ProductCoupon): CouponForm => ({
  ...emptyCouponForm(),
  partnershipId: String(x.partnershipId),
  productId: String(x.productId),
  name: x.name,
  discountType: x.discountType,
  discountValue: String(x.discountValue),
  maxDiscountAmount: x.maxDiscountAmount != null ? String(x.maxDiscountAmount) : '',
  from: x.validFrom.slice(0, 10),
  to: endDateOf(x.validUntil),
  quantityLimited: x.quantityLimited,
  totalQuantity: x.totalQuantity != null ? String(x.totalQuantity) : '',
})

/**
 * 바뀐 값만 담아요 (coupon.ts 규칙)
 * - 할인 방식이나 값이 바뀌면 discountType·discountValue를 함께, 정률이면 maxDiscountAmount도 함께
 * - 수량 제한이 바뀌거나 총 수량이 바뀌면 quantityLimited를 보내고, 제한이면 totalQuantity도 함께
 */
function diff(x: ProductCoupon, form: CouponForm): ProductCouponUpdateRequest {
  const body: ProductCouponUpdateRequest = {}
  if (form.name.trim() !== x.name) body.name = form.name.trim()
  const value = Number(form.discountValue)
  const max = Number(form.maxDiscountAmount)
  if (
    form.discountType !== x.discountType ||
    value !== x.discountValue ||
    (form.discountType === 'RATE' && max !== x.maxDiscountAmount)
  ) {
    body.discountType = form.discountType
    body.discountValue = value
    if (form.discountType === 'RATE') body.maxDiscountAmount = max
  }
  const from = startOf(form.from)
  if (from !== x.validFrom.slice(0, 19)) body.validFrom = from
  const until = endExclusiveOf(form.to)
  if (until !== x.validUntil.slice(0, 19)) body.validUntil = until
  const qty = Number(form.totalQuantity)
  if (form.quantityLimited !== x.quantityLimited || (form.quantityLimited && qty !== x.totalQuantity)) {
    body.quantityLimited = form.quantityLimited
    if (form.quantityLimited) body.totalQuantity = qty
  }
  return body
}

/** 수정(시작 전) · 종료일 연장(진행 중) 모달 */
function EditModal({ target, onClose, onDone }: { target: Editing; onClose: () => void; onDone: (msg: string) => void }) {
  // 열 때 최신 상세를 다시 불러와요 (목록 이후 사용·상태가 바뀌었을 수 있어서)
  const fresh = useApi(() => getSellerCoupon(target.coupon.couponId), [target.coupon.couponId])
  const coupon = fresh.data ?? target.coupon
  const [form, setForm] = useState<CouponForm>(() => toForm(target.coupon))
  useEffect(() => {
    if (fresh.data) setForm(toForm(fresh.data))
  }, [fresh.data])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const extendOnly = target.mode === 'extend' || coupon.status !== 'SCHEDULED'
  const originalEnd = endDateOf(coupon.validUntil)

  async function save() {
    if (pending) return
    let body: ProductCouponUpdateRequest
    if (extendOnly) {
      if (!form.to || form.to <= originalEnd) return setError('종료일은 지금보다 뒤로만 늘릴 수 있어요.')
      body = { validUntil: endExclusiveOf(form.to) }
    } else {
      const problem = couponProblem(form, { requireTarget: false })
      if (problem) return setError(problem)
      body = diff(coupon, form)
      if (Object.keys(body).length === 0) return onClose()
    }
    setPending(true)
    setError('')
    try {
      await updateProductCoupon(coupon.couponId, body)
      onDone(extendOnly ? `‘${coupon.name}’ 종료일을 늘렸어요.` : `‘${coupon.name}’을(를) 수정했어요.`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      title={extendOnly ? '종료일 연장' : '쿠폰 수정'}
      onClose={() => !pending && onClose()}
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            닫기
          </Button>
          <Button onClick={save} disabled={pending || fresh.loading}>
            {pending ? '저장하는 중' : '저장하기'}
          </Button>
        </>
      }
    >
      <div className={s.modalForm}>
        <p className={s.modalLead}>
          {coupon.name} · <code>{coupon.code}</code>
        </p>
        {extendOnly ? (
          <>
            <p>시작한 쿠폰은 종료일을 늘리는 것만 돼요. 지금 종료일은 {originalEnd.replace(/-/g, '.')}이에요.</p>
            <div className={f.field}>
              <label htmlFor="cp-ext" className={f.label}>
                새 종료일
              </label>
              <input
                id="cp-ext"
                type="date"
                className={f.input}
                min={originalEnd}
                value={form.to}
                onChange={(e) => setForm((x) => ({ ...x, to: e.target.value }))}
              />
            </div>
          </>
        ) : (
          <CouponFields form={form} setForm={setForm} />
        )}
        {fresh.error && <Notice tone="error">{fresh.error}</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </Modal>
  )
}

/** S10 상품 쿠폰 */
export default function SellerCouponsPage() {
  const desktop = useIsDesktop()
  const [page, setPage] = useState(1)
  const list = useApi(() => getSellerCoupons({ page: toPageParam(page), size: PAGE_SIZE }), [page])
  const active = useApi(() => getSellerCoupons({ status: 'ACTIVE', size: 1 }), [])
  // 사용·할인 합계는 최근 100개 쿠폰으로 계산해요.
  // TODO(API 미구현): 이번 달 쿠폰 사용 횟수·할인 총액 집계 — 쿠폰별 누적 값만 있어 누적으로 보여요.
  const recent = useApi(() => getSellerCoupons({ size: 100 }), [])
  const sums = (recent.data?.items ?? []).reduce(
    (acc, x) => ({ used: acc.used + x.usedCount, amount: acc.amount + x.usedDiscountAmount }),
    { used: 0, amount: 0 },
  )

  const [editing, setEditing] = useState<Editing | null>(null)
  const [stopping, setStopping] = useState<ProductCoupon | null>(null)
  const [stopPending, setStopPending] = useState(false)
  const [stopError, setStopError] = useState('')
  const [done, setDone] = useState('')
  const reloadAll = () => {
    list.reload()
    active.reload()
    recent.reload()
  }

  async function confirmStop() {
    if (!stopping || stopPending) return
    setStopPending(true)
    setStopError('')
    try {
      await stopSellerCoupon(stopping.couponId)
      setDone(`‘${stopping.name}’을(를) 중지했어요. 이미 주문에 예약된 쿠폰은 그대로 결제·취소를 따라가요.`)
      setStopping(null)
      reloadAll()
    } catch (e) {
      setStopError(errorMessage(e))
    } finally {
      setStopPending(false)
    }
  }

  const actionsOf = (x: ProductCoupon) => {
    if (x.status === 'SCHEDULED' || x.status === 'ACTIVE')
      return (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing({ coupon: x, mode: x.status === 'SCHEDULED' ? 'edit' : 'extend' })}
          >
            {x.status === 'SCHEDULED' ? '수정' : desktop ? '연장' : '종료일 연장'}
          </Button>
          <Button variant="dangerOutline" size="sm" onClick={() => setStopping(x)}>
            중지
          </Button>
        </>
      )
    return null
  }

  const items = list.data?.items ?? []
  let body
  if (list.loading && !list.data) body = <Loading label="쿠폰을 불러오고 있어요" />
  else if (list.error) body = <ErrorView message={list.error} onRetry={list.reload} />
  else if (items.length === 0)
    body = (
      <Empty
        title="아직 발행한 쿠폰이 없어요"
        action={
          <Button size="sm" to="/seller/coupons/new">
            쿠폰 발행하기
          </Button>
        }
      >
        협약이 진행 중인 인플루언서에게 상품 쿠폰을 발행할 수 있어요.
      </Empty>
    )
  else if (desktop)
    body = (
      <div role="table" className={c.table} aria-busy={list.loading}>
        <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
          <span>쿠폰명</span>
          <span>대상 상품</span>
          <span>인플루언서</span>
          <span>코드</span>
          <span>할인</span>
          <span>기간</span>
          <span>사용</span>
          <span>할인 총액</span>
          <span>상태</span>
          <span />
        </div>
        {items.map((x) => (
          <div role="row" key={x.couponId} className={c.tr} style={{ gridTemplateColumns: COLS }}>
            <span className={`${c.strong} ${c.ellipsis}`} title={x.name}>
              {x.name}
            </span>
            <span className={c.ellipsis}>{x.productName ?? `상품 #${x.productId}`}</span>
            <span className={c.ellipsis}>{x.activityName ?? `#${x.influencerId}`}</span>
            <span>
              <code className={s.code}>{x.code}</code>
            </span>
            <span>{discountText(x)}</span>
            <span className={c.num}>{fmtPeriod(x.validFrom, x.validUntil)}</span>
            <span className={c.num}>{usageText(x)}</span>
            <span className={c.num}>{won(x.usedDiscountAmount)}</span>
            <span>
              <Badge tone={TONE[x.status]}>{STATUS_LABEL[x.status]}</Badge>
            </span>
            <span className={c.actions}>
              {actionsOf(x) ?? (x.status === 'STOPPED' ? <span className={s.faint}>{stoppedText(x)}</span> : null)}
            </span>
          </div>
        ))}
      </div>
    )
  else
    body = (
      <ul className={s.cardList}>
        {items.map((x) => {
          const acts = actionsOf(x)
          return (
            <li key={x.couponId} className={s.partnerCard}>
              <div className={s.orderCardHead}>
                <b>{x.name}</b>
                <Badge tone={TONE[x.status]}>{STATUS_LABEL[x.status]}</Badge>
              </div>
              <p className={s.faintLine}>
                {x.productName ?? `상품 #${x.productId}`} · {x.activityName ?? `#${x.influencerId}`}
              </p>
              <p className={s.faintLine}>
                {discountText(x)} · {fmtPeriod(x.validFrom, x.validUntil)} · 코드 <b className={s.ink}>{x.code}</b>
              </p>
              <div className={s.couponStats}>
                <span>
                  사용 <b>{usageText(x)}</b>
                </span>
                <span>
                  할인 총액 <b>{won(x.usedDiscountAmount)}</b>
                </span>
              </div>
              {x.status === 'STOPPED' && <p className={s.faintLine}>{stoppedText(x)}</p>}
              {acts && <div className={s.cardActions}>{acts}</div>}
            </li>
          )
        })}
      </ul>
    )

  return (
    <ConsoleShell
      variant="seller"
      active="coupons"
      title="상품 쿠폰"
      back="/seller/info"
      hideMobileNav
      actions={
        <Button to="/seller/coupons/new">
          <Icon name="plus" size={16} />
          쿠폰 발행
        </Button>
      }
      bottom={
        <BottomBar>
          <Button size="lg" to="/seller/coupons/new">
            + 쿠폰 발행하기
          </Button>
        </BottomBar>
      }
    >
      {desktop ? (
        <div className={c.kpis}>
          <div className={c.kpi}>
            <p className={c.kpiLabel}>진행 중인 쿠폰</p>
            <p className={c.kpiValue}>{active.data?.totalElements ?? '-'}개</p>
          </div>
          <div className={c.kpi}>
            <p className={c.kpiLabel}>누적 사용</p>
            <p className={c.kpiValue}>{sums.used.toLocaleString('ko-KR')}회</p>
          </div>
          <div className={c.kpi}>
            <p className={c.kpiLabel}>누적 할인 총액</p>
            <p className={c.kpiValue}>{won(sums.amount)}</p>
            <p className={c.kpiSub}>할인은 판매자 부담 · 정산은 할인 후 금액 기준</p>
          </div>
        </div>
      ) : (
        <>
          <div className={s.miniKpis}>
            <div>
              <p>진행 중</p>
              <b>{active.data?.totalElements ?? '-'}</b>
            </div>
            <div>
              <p>누적 사용</p>
              <b>{sums.used.toLocaleString('ko-KR')}회</b>
            </div>
            <div>
              <p>할인 총액</p>
              <b>{won(sums.amount)}</b>
            </div>
          </div>
          <p className={`${s.faintLine} ${s.mobileBlock}`}>
            할인은 판매자가 부담하고, 정산은 할인 후 금액 기준이에요. 시작 전에만 수정할 수 있고, 시작 후에는 종료일
            연장과 중지만 돼요.
          </p>
        </>
      )}
      {done && (
        <div className={desktop ? s.gapBottom : s.mobileBlock}>
          <Notice onClose={() => setDone('')}>{done}</Notice>
        </div>
      )}
      {body}
      <Pager page={page} totalPages={list.data?.totalPages ?? 0} onChange={setPage} />
      {desktop && (
        <p className={s.footNote}>
          시작 전에만 수정할 수 있고, 시작 뒤에는 종료일 연장과 중지만 돼요. 같은 인플루언서·상품으로 기간이 겹치는
          쿠폰은 발행할 수 없어요.
        </p>
      )}
      {editing && (
        <EditModal
          target={editing}
          onClose={() => setEditing(null)}
          onDone={(msg) => {
            setDone(msg)
            setEditing(null)
            reloadAll()
          }}
        />
      )}
      {stopping && (
        <Modal
          title="쿠폰을 중지할까요?"
          onClose={() => !stopPending && setStopping(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setStopping(null)} disabled={stopPending}>
                닫기
              </Button>
              <Button variant="danger" onClick={confirmStop} disabled={stopPending}>
                {stopPending ? '중지하는 중' : '중지하기'}
              </Button>
            </>
          }
        >
          <p className={s.modalLead}>
            {stopping.name} · <code>{stopping.code}</code>
          </p>
          <p>중지한 쿠폰은 다시 켤 수 없어요. 구매자는 더 이상 이 코드를 쓸 수 없어요.</p>
          {stopError && <Notice tone="error">{stopError}</Notice>}
        </Modal>
      )}
    </ConsoleShell>
  )
}
