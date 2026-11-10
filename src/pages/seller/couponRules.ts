import type { DiscountType } from '../../lib/api/coupon'
import { ymd } from './shared'

/** 상품 쿠폰 발행·수정 폼 값 (입력칸 글자 그대로) */
export type CouponForm = {
  partnershipId: string
  productId: string
  name: string
  discountType: DiscountType
  discountValue: string
  maxDiscountAmount: string
  /** 시작일 'yyyy-MM-dd' (포함) */
  from: string
  /** 종료일 'yyyy-MM-dd' (포함). 보낼 때 다음 날 0시(validUntil, 미포함)로 바꿔요 */
  to: string
  quantityLimited: boolean
  totalQuantity: string
}

export const NAME_MAX = 100
export const QTY_MAX = 1_000_000

export function emptyCouponForm(): CouponForm {
  const today = new Date()
  const end = new Date()
  end.setMonth(end.getMonth() + 1)
  return {
    partnershipId: '',
    productId: '',
    name: '',
    discountType: 'RATE',
    discountValue: '',
    maxDiscountAmount: '',
    from: ymd(today),
    to: ymd(end),
    quantityLimited: false,
    totalQuantity: '',
  }
}

/**
 * 화면에서 먼저 확인해요 (coupon.ts 규칙, 백엔드도 다시 확인해요)
 * - 정률: 할인율 1~99%, 최대 할인액 필수 / 정액: 1원 이상
 * - 수량 제한이면 총 수량 1~1,000,000
 */
export function couponProblem(form: CouponForm, { requireTarget }: { requireTarget: boolean }) {
  if (requireTarget && !form.partnershipId) return '인플루언서를 골라 주세요.'
  if (requireTarget && !form.productId) return '대상 상품을 골라 주세요.'
  if (!form.name.trim()) return '쿠폰명을 입력해 주세요.'
  if (form.name.trim().length > NAME_MAX) return `쿠폰명은 ${NAME_MAX}자까지 쓸 수 있어요.`
  const value = Number(form.discountValue)
  if (form.discountType === 'RATE') {
    if (!(value >= 1 && value <= 99)) return '할인율은 1~99% 사이로 입력해 주세요.'
    if (!(Number(form.maxDiscountAmount) > 0)) return '정률 쿠폰은 최대 할인액을 입력해 주세요.'
  } else if (!(value > 0)) return '할인액은 1원 이상이어야 해요.'
  if (!form.from || !form.to) return '기간을 입력해 주세요.'
  if (form.to < form.from) return '종료일은 시작일보다 뒤여야 해요.'
  if (form.to < ymd(new Date())) return '종료일은 오늘 이후여야 해요.'
  if (form.quantityLimited) {
    const qty = Number(form.totalQuantity)
    if (!(qty >= 1 && qty <= QTY_MAX)) return `총 수량은 1~${QTY_MAX.toLocaleString('ko-KR')}장 사이로 입력해 주세요.`
  }
  return ''
}
