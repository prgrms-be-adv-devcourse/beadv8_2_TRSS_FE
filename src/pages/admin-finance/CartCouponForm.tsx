import { useState } from 'react'
import Button from '../../components/ui/Button'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { createCartCoupon } from '../../lib/api/coupon'
import { dayAfter, dayStart, today } from './format'
import s from './AdminFinance.module.css'

type TierInput = { min: string; discount: string }
const MAX_TIERS = 10
const INITIAL_TIERS: TierInput[] = [
  { min: '30000', discount: '3000' },
  { min: '50000', discount: '5000' },
  { min: '70000', discount: '7000' },
]

const toInt = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(/,/g, '')))

/** 장바구니 쿠폰 등록 폼 (관리자, 플랫폼 부담) */
export default function CartCouponForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [name, setName] = useState('')
  const [tiers, setTiers] = useState<TierInput[]>(INITIAL_TIERS)
  const [from, setFrom] = useState(today())
  const [until, setUntil] = useState('')
  const [qty, setQty] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function setTier(i: number, key: keyof TierInput, value: string) {
    setTiers((ts) => ts.map((t, j) => (j === i ? { ...t, [key]: value.replace(/[^0-9]/g, '') } : t)))
  }

  /** 입력을 검사하고 문제가 있으면 문구를 돌려줘요 */
  function validate(): string | null {
    if (!name.trim()) return '쿠폰명을 입력해 주세요.'
    if (name.trim().length > 100) return '쿠폰명은 100자까지 쓸 수 있어요.'
    if (tiers.length === 0) return '할인 구간을 하나 이상 넣어 주세요.'
    const parsed = tiers.map((t) => ({ min: toInt(t.min), discount: toInt(t.discount) }))
    if (parsed.some((t) => !(t.min > 0) || !(t.discount > 0)))
      return '구간의 최소 주문 금액과 할인액을 모두 입력해 주세요.'
    if (parsed.some((t) => t.discount >= t.min)) return '할인액은 최소 주문 금액보다 작아야 해요.'
    if (new Set(parsed.map((t) => t.min)).size !== parsed.length) return '최소 주문 금액이 같은 구간이 있어요.'
    if (!from || !until) return '시작일과 종료일을 골라 주세요.'
    if (until < from) return '종료일은 시작일보다 같거나 늦어야 해요.'
    if (until < today()) return '종료일이 이미 지났어요.'
    if (qty.trim()) {
      const n = toInt(qty)
      if (!(n >= 1 && n <= 1_000_000)) return '총 수량은 1 ~ 1,000,000 사이로 입력해 주세요.'
    }
    return null
  }

  async function submit() {
    if (busy) return
    const msg = validate()
    if (msg) {
      setError(msg)
      return
    }
    setBusy(true)
    setError('')
    try {
      const limited = qty.trim() !== ''
      await createCartCoupon({
        name: name.trim(),
        tiers: tiers
          .map((t) => ({ minOrderAmount: toInt(t.min), discountAmount: toInt(t.discount) }))
          .sort((a, b) => a.minOrderAmount - b.minOrderAmount),
        validFrom: dayStart(from),
        // 종료일 당일까지 쓸 수 있게 다음 날 0시로 보내요 (validUntil은 포함하지 않아요)
        validUntil: dayAfter(until),
        quantityLimited: limited,
        ...(limited ? { totalQuantity: toInt(qty) } : {}),
      })
      onCreated(name.trim())
      setName('')
      setTiers(INITIAL_TIERS)
      setUntil('')
      setQty('')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <h2 className={s.blockTitle}>장바구니 쿠폰 등록</h2>
      <label className={f.field}>
        <span className={f.label}>쿠폰명</span>
        <input
          className={f.input}
          placeholder="예: 12월 장바구니 세일"
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <div className={f.field}>
        <span className={f.label}>
          할인 구간 <span className={s.labelSub}>(넘는 구간 중 가장 높은 하나만)</span>
        </span>
        {tiers.map((t, i) => (
          <div key={i} className={s.tier}>
            <span className={s.unitInput}>
              <input
                className={f.input}
                inputMode="numeric"
                aria-label={`${i + 1}구간 최소 주문 금액`}
                value={t.min ? Number(t.min).toLocaleString('ko-KR') : ''}
                onChange={(e) => setTier(i, 'min', e.target.value)}
              />
              <span>원 이상</span>
            </span>
            <span aria-hidden="true" className={s.arrow}>
              →
            </span>
            <span className={s.unitInput}>
              <input
                className={f.input}
                inputMode="numeric"
                aria-label={`${i + 1}구간 할인액`}
                value={t.discount ? Number(t.discount).toLocaleString('ko-KR') : ''}
                onChange={(e) => setTier(i, 'discount', e.target.value)}
              />
              <span>원</span>
            </span>
            <button
              type="button"
              aria-label={`${i + 1}구간 삭제`}
              className={s.tierDel}
              disabled={tiers.length <= 1}
              onClick={() => setTiers((ts) => ts.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
        ))}
        <Button
          variant="soft"
          size="sm"
          disabled={tiers.length >= MAX_TIERS}
          onClick={() => setTiers((ts) => [...ts, { min: '', discount: '' }])}
        >
          + 구간 추가
        </Button>
      </div>
      <div className={s.twoCols}>
        <label className={f.field}>
          <span className={f.label}>시작</span>
          <input className={f.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className={f.field}>
          <span className={f.label}>종료 (이날까지)</span>
          <input className={f.input} type="date" value={until} min={from} onChange={(e) => setUntil(e.target.value)} />
        </label>
      </div>
      <label className={f.field}>
        <span className={f.label}>총 수량 (선택)</span>
        <input
          className={f.input}
          inputMode="numeric"
          placeholder="비우면 제한 없음"
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/[^0-9]/g, ''))}
        />
      </label>
      {error && (
        <p role="alert" className={f.error}>
          {error}
        </p>
      )}
      <div className={s.formActions}>
        <Button type="submit" disabled={busy}>
          {busy ? '등록 중…' : '등록하기'}
        </Button>
      </div>
      <p className={s.meta}>할인은 플랫폼이 부담해요. 배송비는 할인하지 않아요. 한 사람이 한 번만 쓸 수 있어요.</p>
    </form>
  )
}
