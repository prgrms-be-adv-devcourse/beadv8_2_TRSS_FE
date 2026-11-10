import type { Dispatch, SetStateAction } from 'react'
import { Segment } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { NAME_MAX, type CouponForm } from './couponRules'
import { digits } from './shared'
import s from './seller.module.css'

/** 쿠폰명 · 할인 방식·값 · 기간 · 수량 제한 입력칸 (발행 화면과 수정 모달이 같이 써요) */
export default function CouponFields({
  form,
  setForm,
}: {
  form: CouponForm
  setForm: Dispatch<SetStateAction<CouponForm>>
}) {
  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm((x) => ({ ...x, [key]: value }))
  const rate = form.discountType === 'RATE'
  return (
    <>
      <div className={f.field}>
        <label htmlFor="cp-name" className={f.label}>
          쿠폰명
        </label>
        <input
          id="cp-name"
          className={f.input}
          placeholder="예: 윈드브레이커 10% 할인"
          value={form.name}
          maxLength={NAME_MAX}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div className={f.field}>
        <span className={f.label}>할인 방식</span>
        <Segment
          label="할인 방식"
          value={form.discountType}
          onChange={(v) => setForm((x) => ({ ...x, discountType: v, discountValue: '', maxDiscountAmount: '' }))}
          items={[
            { value: 'FIXED', label: '정액' },
            { value: 'RATE', label: '정률' },
          ]}
        />
      </div>
      <div className={s.twoCol}>
        <div className={f.field}>
          <label htmlFor="cp-value" className={f.label}>
            {rate ? '할인율' : '할인액'}
          </label>
          <div className={s.unitInput}>
            <input
              id="cp-value"
              className={f.input}
              inputMode="numeric"
              placeholder="0"
              value={rate ? form.discountValue : form.discountValue && Number(form.discountValue).toLocaleString('ko-KR')}
              onChange={(e) => set('discountValue', digits(e.target.value).slice(0, rate ? 2 : 9))}
            />
            <span>{rate ? '%' : '원'}</span>
          </div>
        </div>
        {rate && (
          <div className={f.field}>
            <label htmlFor="cp-max" className={f.label}>
              최대 할인액
            </label>
            <div className={s.unitInput}>
              <input
                id="cp-max"
                className={f.input}
                inputMode="numeric"
                placeholder="0"
                value={form.maxDiscountAmount && Number(form.maxDiscountAmount).toLocaleString('ko-KR')}
                onChange={(e) => set('maxDiscountAmount', digits(e.target.value).slice(0, 9))}
              />
              <span>원</span>
            </div>
          </div>
        )}
      </div>
      <div className={s.twoCol}>
        <div className={f.field}>
          <label htmlFor="cp-from" className={f.label}>
            시작
          </label>
          <input id="cp-from" type="date" className={f.input} value={form.from} onChange={(e) => set('from', e.target.value)} />
        </div>
        <div className={f.field}>
          <label htmlFor="cp-to" className={f.label}>
            종료
          </label>
          <input
            id="cp-to"
            type="date"
            className={f.input}
            min={form.from}
            value={form.to}
            onChange={(e) => set('to', e.target.value)}
          />
        </div>
      </div>
      <div className={f.field}>
        <span className={f.label}>수량 제한</span>
        <Segment
          label="수량 제한"
          value={form.quantityLimited ? 'on' : 'off'}
          onChange={(v) => set('quantityLimited', v === 'on')}
          items={[
            { value: 'off', label: '제한 없음' },
            { value: 'on', label: '제한 있음' },
          ]}
        />
      </div>
      {form.quantityLimited && (
        <div className={f.field}>
          <label htmlFor="cp-qty" className={f.label}>
            총 수량
          </label>
          <div className={s.unitInput}>
            <input
              id="cp-qty"
              className={f.input}
              inputMode="numeric"
              placeholder="0"
              value={form.totalQuantity}
              onChange={(e) => set('totalQuantity', digits(e.target.value).slice(0, 7))}
            />
            <span>장</span>
          </div>
        </div>
      )}
    </>
  )
}
