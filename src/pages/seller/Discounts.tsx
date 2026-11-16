import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Thumb, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import {
  createDiscount,
  deleteDiscount,
  endDiscount,
  getSellerProductForm,
  getSellerProducts,
  modifyDiscount,
  type ProductDiscountStatus,
  type SellerDiscount,
  type SellerProductSummary,
} from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, digits, fmtMDHM, useQueryState } from './shared'
import s from './seller.module.css'
import st from './Stock.module.css'
import d from './Discounts.module.css'

/** 상품 선택 목록에 불러올 최대 개수 (백엔드 size 최대 100) */
const PRODUCT_LIMIT = 100
/** 할인율 범위 (DISCOUNT_PRICE_INVALID: 할인가는 정가의 10~99%) */
const RATE_MIN = 1
const RATE_MAX = 90
const LIST_COLS = '1.6fr .8fr .8fr .5fr .7fr 1.4fr'

const STATUS: Record<ProductDiscountStatus, [string, Tone]> = {
  SCHEDULED: ['예약', 'blue'],
  ACTIVE: ['진행 중', 'green'],
  ENDED: ['종료', 'neutral'],
}

/** 화면에서 보여 주는 할인율. 서버와 같이 정가 기준, 소수점 아래 버림 */
const rateOf = (price: number, sale: number) => Math.floor(((price - sale) * 100) / price)
/** datetime-local 값('2026-11-25T00:00') ↔ 서버 값('2026-11-25T00:00:00') */
const toServer = (local: string) => (local.length === 16 ? `${local}:00` : local)
const toLocal = (iso: string) => iso.slice(0, 16)
const p2 = (n: number) => String(n).padStart(2, '0')
const localOf = (date: Date) =>
  `${date.getFullYear()}-${p2(date.getMonth() + 1)}-${p2(date.getDate())}T${p2(date.getHours())}:${p2(date.getMinutes())}`
/** 내일 0시부터 days일 (마지막 날 23:59까지) */
function periodOf(days: number) {
  const start = new Date()
  start.setDate(start.getDate() + 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + days - 1)
  end.setHours(23, 59, 0, 0)
  return { start: localOf(start), end: localOf(end) }
}
const defaultPeriod = () => periodOf(7)
/** 빠른 선택: 할인율·기간 */
const RATE_PRESETS = [10, 20, 30, 50]
const DAY_PRESETS = [3, 7, 14, 30]
/** 정가에서 r% 할인한 값(10원 단위 내림). 내림 때문에 할인율이 달라지면 1원 단위로 계산해요. */
function saleFor(price: number, r: number) {
  const exact = Math.floor((price * (100 - r)) / 100)
  const rounded = Math.floor(exact / 10) * 10
  return rounded > 0 && rateOf(price, rounded) === r ? rounded : exact
}

const sideNote = (p: SellerProductSummary) =>
  p.salePrice != null ? `${p.discountRate}% 할인 중` : p.status === 'STOPPED' ? '판매 중지' : '할인 없음'

/**
 * S14 할인 (기간 할인)
 * 대상 상품은 URL 쿼리(productId)로 받아요. 할인 목록은 수정 폼 조회(getSellerProductForm)의 discounts(예정·진행 중)예요.
 * - 예약(SCHEDULED): 삭제 · 할인가·기간 수정
 * - 진행 중(ACTIVE): 마감 변경 · 지금 종료
 * 끝난 할인은 응답에 오지 않아 이력을 보여 주지 못해요.
 */
export default function SellerDiscountsPage() {
  const desktop = useIsDesktop()
  const { params, update } = useQueryState()
  const productId = Number(params.get('productId')) || null

  const products = useApi(() => getSellerProducts({ size: PRODUCT_LIMIT }), [])
  const all = products.data?.items ?? []
  const product = all.find((p) => p.productId === productId) ?? (productId == null ? all[0] : undefined)
  const form = useApi(
    () => (product ? getSellerProductForm(product.productId) : Promise.resolve(null)),
    [product?.productId],
  )
  const detail = form.data
  const discounts = detail?.discounts ?? []
  const active = discounts.find((x) => x.status === 'ACTIVE')
  const stopped = product?.status === 'STOPPED'

  const [saleText, setSaleText] = useState('')
  const [period, setPeriod] = useState(defaultPeriod)
  const [periodDays, setPeriodDays] = useState<number | null>(7)
  const [editing, setEditing] = useState<{ id: number; sale: string; start: string; end: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'done' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setSaleText('')
    setPeriod(defaultPeriod())
    setPeriodDays(7)
    setEditing(null)
    setMsg(null)
  }, [product?.productId])

  const price = detail?.price ?? 0
  const sale = Number(saleText) || 0
  const rate = price > 0 && sale > 0 ? rateOf(price, sale) : null
  const rateOk = rate != null && rate >= RATE_MIN && rate <= RATE_MAX

  /** 할인 바뀐 뒤: 폼(할인 목록)과 왼쪽 목록(할인가)을 다시 불러와요. */
  const refresh = () => {
    form.reload()
    products.reload()
  }
  const run = async (key: string, job: () => Promise<string>) => {
    if (busy) return
    setBusy(key)
    setMsg(null)
    try {
      setMsg({ tone: 'done', text: await job() })
      refresh()
    } catch (e) {
      setMsg({ tone: 'error', text: errorMessage(e) })
    } finally {
      setBusy(null)
    }
  }

  const periodProblem = (start: string, end: string, checkStart = true) => {
    if (!start || !end) return '기간을 골라 주세요.'
    if (checkStart && new Date(start) <= new Date()) return '시작 일시는 지금 이후여야 해요.'
    if (new Date(end) <= new Date(start)) return '마감 일시는 시작 일시 뒤여야 해요.'
    const limit = new Date(start)
    limit.setFullYear(limit.getFullYear() + 1)
    if (new Date(end) > limit) return '할인 기간은 1년까지예요.'
    return ''
  }

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    if (!product) return
    if (!rateOk)
      return setMsg({ tone: 'error', text: `할인율은 ${RATE_MIN}~${RATE_MAX}%가 되도록 할인가를 넣어 주세요.` })
    const problem = periodProblem(period.start, period.end)
    if (problem) return setMsg({ tone: 'error', text: problem })
    run('create', async () => {
      await createDiscount(product.productId, {
        salePrice: sale,
        startsAt: toServer(period.start),
        endsAt: toServer(period.end),
      })
      setSaleText('')
      setPeriod(defaultPeriod())
      setPeriodDays(7)
      return `${won(sale)}(${rate}%) 할인을 ${fmtMDHM(period.start)}부터 예약했어요.`
    })
  }

  const saveEdit = (x: SellerDiscount) => {
    if (!product || !editing) return
    const body: { salePrice?: number; startsAt?: string; endsAt?: string } = {}
    if (x.status === 'SCHEDULED') {
      const nextSale = Number(editing.sale) || 0
      const nextRate = rateOf(price, nextSale)
      if (!(nextRate >= RATE_MIN && nextRate <= RATE_MAX))
        return setMsg({ tone: 'error', text: `할인율은 ${RATE_MIN}~${RATE_MAX}%가 되도록 할인가를 넣어 주세요.` })
      if (nextSale !== x.salePrice) body.salePrice = nextSale
      if (toServer(editing.start) !== x.startsAt) body.startsAt = toServer(editing.start)
    }
    const problem = periodProblem(editing.start, editing.end, x.status === 'SCHEDULED' && !!body.startsAt)
    if (problem) return setMsg({ tone: 'error', text: problem })
    if (toServer(editing.end) !== x.endsAt) body.endsAt = toServer(editing.end)
    if (Object.keys(body).length === 0) return setEditing(null)
    run(`edit${x.discountId}`, async () => {
      await modifyDiscount(product.productId, x.discountId, body)
      setEditing(null)
      return '할인을 바꿨어요.'
    })
  }

  const remove = (x: SellerDiscount) =>
    product &&
    run(`del${x.discountId}`, async () => {
      await deleteDiscount(product.productId, x.discountId)
      return '예약한 할인을 지웠어요.'
    })
  const end = (x: SellerDiscount) =>
    product &&
    run(`end${x.discountId}`, async () => {
      await endDiscount(product.productId, x.discountId)
      return '할인을 지금 끝냈어요. 정가로 팔려요.'
    })

  const startEdit = (x: SellerDiscount) =>
    setEditing({ id: x.discountId, sale: String(x.salePrice), start: toLocal(x.startsAt), end: toLocal(x.endsAt) })

  /* ── 조각들 ── */
  const summaryCard = detail && (
    <section className={d.card} aria-label="지금 가격">
      <div className={d.prices}>
        <p>
          <span className={s.faint}>기본가</span>
          <b>{won(price)}</b>
        </p>
        <p>
          <span className={s.faint}>지금 판매가</span>
          <b className={active ? s.danger : undefined}>
            {active ? (
              <>
                {won(active.salePrice)} <small>{active.discountRate}%</small>
              </>
            ) : (
              won(price)
            )}
          </b>
        </p>
      </div>
      {active ? (
        <div className={d.activeRow}>
          <span>
            <Badge tone="green">진행 중인 할인</Badge> {fmtMDHM(active.startsAt)} ~ {fmtMDHM(active.endsAt)} · 쿠폰 함께
            사용 가능
          </span>
          <Button size="sm" variant="dangerOutline" disabled={!!busy} onClick={() => end(active)}>
            {busy === `end${active.discountId}` ? '끝내는 중' : '지금 종료하기'}
          </Button>
        </div>
      ) : (
        <p className={s.faintLine}>지금 진행 중인 할인이 없어요.</p>
      )}
    </section>
  )

  const createForm = detail && (
    <form className={d.card} onSubmit={submit} aria-labelledby="dc-new" noValidate>
      <div className={d.headRow}>
        <h2 id="dc-new" className={s.h2}>
          새 할인 등록
        </h2>
        <span className={s.faint}>같은 상품에 기간이 겹치는 할인은 등록할 수 없어요</span>
      </div>
      <div className={d.priceGrid}>
        {desktop && (
          <div className={f.field}>
            <span className={f.label}>기본가</span>
            <p className={d.static}>{won(price)}</p>
          </div>
        )}
        <div className={f.field}>
          <label htmlFor="dc-sale" className={f.label}>
            할인가 {!desktop && <span className={s.faint}>· 기본가 {won(price)}</span>}
          </label>
          <div className={d.unit}>
            <input
              id="dc-sale"
              className={f.input}
              inputMode="numeric"
              placeholder="0"
              value={saleText ? Number(saleText).toLocaleString('ko-KR') : ''}
              onChange={(e) => setSaleText(digits(e.target.value).slice(0, 10))}
              disabled={stopped}
              aria-invalid={rate != null && !rateOk}
              aria-describedby="dc-rate"
            />
            <span>원</span>
          </div>
        </div>
        <div className={f.field}>
          <span className={f.label}>할인율</span>
          <p id="dc-rate" className={`${d.static} ${rate != null && !rateOk ? s.danger : ''}`} aria-live="polite">
            {rate != null ? `${rate}%` : '-'} <span className={s.faint}>자동 계산</span>
          </p>
        </div>
      </div>
      <div className={d.presets} role="group" aria-label="할인율 빠른 선택">
        {RATE_PRESETS.map((r) => (
          <button
            key={r}
            type="button"
            className={`${d.chip} ${rate === r ? d.chipOn : ''}`}
            aria-pressed={rate === r}
            disabled={stopped || price <= 0}
            onClick={() => setSaleText(String(saleFor(price, r)))}
          >
            {r}%
          </button>
        ))}
      </div>
      <div className={d.presets} role="group" aria-label="기간 빠른 선택">
        {DAY_PRESETS.map((n) => (
          <button
            key={n}
            type="button"
            className={`${d.chip} ${periodDays === n ? d.chipOn : ''}`}
            aria-pressed={periodDays === n}
            disabled={stopped}
            onClick={() => {
              setPeriod(periodOf(n))
              setPeriodDays(n)
            }}
          >
            내일부터 {n}일
          </button>
        ))}
      </div>
      <div className={d.grid2}>
        <div className={f.field}>
          <label htmlFor="dc-start" className={f.label}>
            시작
          </label>
          <input
            id="dc-start"
            type="datetime-local"
            className={f.input}
            value={period.start}
            disabled={stopped}
            onChange={(e) => {
              setPeriod((p) => ({ ...p, start: e.target.value }))
              setPeriodDays(null)
            }}
          />
        </div>
        <div className={f.field}>
          <label htmlFor="dc-end" className={f.label}>
            마감
          </label>
          <input
            id="dc-end"
            type="datetime-local"
            className={f.input}
            value={period.end}
            disabled={stopped}
            onChange={(e) => {
              setPeriod((p) => ({ ...p, end: e.target.value }))
              setPeriodDays(null)
            }}
          />
        </div>
      </div>
      <p className={f.help}>
        할인가를 넣으면 할인율은 기본가 기준으로 계산해 보여 줘요(소수점 아래 버림, {RATE_MIN}~{RATE_MAX}%). 옵션
        추가금은 할인 없이 할인가에 더해져요.
      </p>
      {detail.options.length > 1 && sale > 0 && (
        <>
          <h3 className={d.h3}>
            옵션별 판매가 미리보기 <span className={s.faint}>할인가 + 추가금</span>
          </h3>
          <ul className={d.preview}>
            {detail.options.map((o) => (
              <li key={o.optionId}>
                <span>{o.name}</span>
                {o.additionalPrice > 0 && <span className={s.faint}>+{o.additionalPrice.toLocaleString('ko-KR')}</span>}
                <b>{won(sale + o.additionalPrice)}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className={f.help}>할인 중에도 상품 쿠폰을 함께 쓸 수 있어요. 쿠폰은 할인가 기준으로 계산돼요.</p>
      <div className={d.submitRow}>
        <Button type="submit" size={desktop ? 'md' : 'lg'} block={!desktop} disabled={stopped || !!busy || !rateOk}>
          {busy === 'create' ? '등록하는 중' : rate != null && rateOk ? `${rate}% 할인 등록` : '할인 등록'}
        </Button>
      </div>
    </form>
  )

  const listRow = (x: SellerDiscount) => {
    const isEditing = editing?.id === x.discountId
    const scheduled = x.status === 'SCHEDULED'
    if (isEditing && editing)
      return (
        <div key={x.discountId} className={d.editBox}>
          <div className={d.grid}>
            <div className={f.field}>
              <label htmlFor={`e-sale-${x.discountId}`} className={f.label}>
                할인가
              </label>
              <input
                id={`e-sale-${x.discountId}`}
                className={f.input}
                inputMode="numeric"
                disabled={!scheduled}
                value={editing.sale ? Number(editing.sale).toLocaleString('ko-KR') : ''}
                onChange={(e) => setEditing({ ...editing, sale: digits(e.target.value).slice(0, 10) })}
              />
            </div>
            <div className={f.field}>
              <label htmlFor={`e-start-${x.discountId}`} className={f.label}>
                시작
              </label>
              <input
                id={`e-start-${x.discountId}`}
                type="datetime-local"
                className={f.input}
                disabled={!scheduled}
                value={editing.start}
                onChange={(e) => setEditing({ ...editing, start: e.target.value })}
              />
            </div>
            <div className={f.field}>
              <label htmlFor={`e-end-${x.discountId}`} className={f.label}>
                마감
              </label>
              <input
                id={`e-end-${x.discountId}`}
                type="datetime-local"
                className={f.input}
                value={editing.end}
                onChange={(e) => setEditing({ ...editing, end: e.target.value })}
              />
            </div>
          </div>
          {!scheduled && <p className={f.help}>진행 중인 할인은 마감 일시만 바꿀 수 있어요.</p>}
          <div className={d.submitRow}>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
              취소
            </Button>
            <Button size="sm" disabled={!!busy} onClick={() => saveEdit(x)}>
              {busy === `edit${x.discountId}` ? '저장하는 중' : '저장'}
            </Button>
          </div>
        </div>
      )
    const actions = (
      <span className={d.actions}>
        <Button size="sm" variant="outline" disabled={!!busy || stopped} onClick={() => startEdit(x)}>
          {scheduled ? '수정' : '마감 변경'}
        </Button>
        {scheduled ? (
          <Button size="sm" variant="dangerOutline" disabled={!!busy} onClick={() => remove(x)}>
            {busy === `del${x.discountId}` ? '지우는 중' : '삭제'}
          </Button>
        ) : (
          <Button size="sm" variant="dangerOutline" disabled={!!busy} onClick={() => end(x)}>
            지금 종료
          </Button>
        )}
      </span>
    )
    return desktop ? (
      <div role="row" key={x.discountId} className={c.tr} style={{ gridTemplateColumns: LIST_COLS }}>
        <span className={c.num}>
          {fmtMDHM(x.startsAt)} ~ {fmtMDHM(x.endsAt)}
        </span>
        <span className={c.num}>{won(price)}</span>
        <span className={c.num}>
          <b>{won(x.salePrice)}</b>
        </span>
        <span className={c.num}>{x.discountRate}%</span>
        <span>
          <Badge tone={STATUS[x.status][1]}>{STATUS[x.status][0]}</Badge>
        </span>
        {actions}
      </div>
    ) : (
      <li key={x.discountId} className={d.mItem}>
        <span className={d.mItemHead}>
          <Badge tone={STATUS[x.status][1]}>{STATUS[x.status][0]}</Badge>
          <b>
            {won(x.salePrice)} <span className={s.danger}>{x.discountRate}%</span>
          </b>
        </span>
        <span className={s.faint}>
          {fmtMDHM(x.startsAt)} ~ {fmtMDHM(x.endsAt)}
        </span>
        {actions}
      </li>
    )
  }

  const listBlock = detail && (
    <section className={d.card} aria-labelledby="dc-list">
      <div className={d.headRow}>
        <h2 id="dc-list" className={s.h2}>
          예정·진행 중인 할인
        </h2>
        <span className={s.faint}>진행 중인 할인은 마감 일시만 바꿀 수 있어요</span>
      </div>
      {discounts.length === 0 ? (
        <p className={s.faintLine}>예정이거나 진행 중인 할인이 없어요.</p>
      ) : desktop ? (
        <div role="table" className={c.table}>
          <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: LIST_COLS }}>
            <span>기간</span>
            <span>기본가</span>
            <span>할인가</span>
            <span>할인율</span>
            <span>상태</span>
            <span />
          </div>
          {discounts.map(listRow)}
        </div>
      ) : (
        <ul className={d.mList}>{discounts.map(listRow)}</ul>
      )}
    </section>
  )

  const main = (
    <div className={s.stack}>
      {msg && (
        <Notice tone={msg.tone} onClose={() => setMsg(null)}>
          {msg.text}
        </Notice>
      )}
      {stopped && <Notice tone="info">판매 중지된 상품은 할인을 등록하거나 바꿀 수 없어요.</Notice>}
      {form.error && <ErrorView message={`할인을 불러오지 못했어요. ${form.error}`} onRetry={form.reload} />}
      {form.loading && !detail && <Loading label="할인을 불러오고 있어요" />}
      {summaryCard}
      {createForm}
      {listBlock}
    </div>
  )

  let content
  if (products.loading && !products.data) content = <Loading label="상품을 불러오고 있어요" />
  else if (products.error)
    content = <ErrorView message={`상품을 불러오지 못했어요. ${products.error}`} onRetry={products.reload} />
  else if (all.length === 0)
    content = (
      <Empty
        title="할인을 걸 상품이 아직 없어요"
        action={
          <Button size="sm" to="/seller/products/new">
            상품 등록하기
          </Button>
        }
      />
    )
  else if (!product)
    content = (
      <Empty
        title="상품을 찾을 수 없어요"
        action={
          <Button variant="outline" size="sm" to="/seller/products">
            상품 관리로
          </Button>
        }
      >
        삭제된 상품일 수 있어요.
      </Empty>
    )
  else if (desktop)
    content = (
      <div className={st.pc}>
        <section className={st.side} aria-label="상품">
          <p className={st.sideTitle}>상품</p>
          {all.map((p) => (
            <Link
              key={p.productId}
              to={`/seller/discounts?productId=${p.productId}`}
              replace
              aria-current={p.productId === product.productId ? 'true' : undefined}
              className={`${st.sideItem} ${p.productId === product.productId ? st.sideOn : ''}`}
            >
              <Thumb src={p.thumbnailUrl} width={36} height={40} radius={6} />
              <span className={s.prodText}>
                <b className={c.ellipsis}>{p.name}</b>
                <span className={p.salePrice != null ? s.danger : s.faint}>{sideNote(p)}</span>
              </span>
            </Link>
          ))}
        </section>
        {main}
      </div>
    )
  else
    content = (
      <>
        <div className={st.pickBox}>
          <label className={st.pick}>
            <Thumb src={product.thumbnailUrl} width={52} height={56} />
            <span className={st.pickText}>
              <span className={s.faint}>상품 선택</span>
              <select
                aria-label="상품 선택"
                value={product.productId}
                onChange={(e) => update({ productId: e.target.value })}
              >
                {all.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.salePrice != null ? `${p.name} (${p.discountRate}%)` : p.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>
        <div className={d.mWrap}>{main}</div>
      </>
    )

  return (
    <ConsoleShell
      variant="seller"
      active="discounts"
      title="할인"
      description="할인은 기간을 정해 판매가를 낮추는 기능이에요. 정가는 상품 관리에서 바꿔요."
    >
      {content}
    </ConsoleShell>
  )
}
