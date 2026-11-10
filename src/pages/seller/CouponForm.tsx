import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import { Empty, ErrorView, Loading, won } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { issueProductCoupon, type ProductCouponIssueResult } from '../../lib/api/coupon'
import { getPickedProducts, getSellerPartnerships } from '../../lib/api/partnership'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import CouponFields from './CouponFields'
import { couponProblem, emptyCouponForm, type CouponForm } from './couponRules'
import { Notice, endExclusiveOf, startOf } from './shared'
import s from './seller.module.css'

/** S11 상품 쿠폰 발행 (진행 중 협약 인플루언서가 pick한 내 판매 중 상품) */
export default function SellerCouponFormPage() {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState<CouponForm>(() => ({
    ...emptyCouponForm(),
    partnershipId: params.get('partnershipId') ?? '',
  }))

  const partners = useApi(() => getSellerPartnerships({ status: 'ACTIVE', size: 100 }), [])
  const active = partners.data?.items ?? []
  // 주소로 받은 협약이 진행 중이 아니면 비워요. 진행 중 협약이 하나뿐이면 바로 골라 둬요.
  useEffect(() => {
    if (!partners.data) return
    setForm((x) => {
      if (x.partnershipId && active.some((p) => String(p.partnershipId) === x.partnershipId)) return x
      return { ...x, partnershipId: active.length === 1 ? String(active[0].partnershipId) : '', productId: '' }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners.data])

  const picked = useApi(
    () => (form.partnershipId ? getPickedProducts(Number(form.partnershipId)) : Promise.resolve([])),
    [form.partnershipId],
  )
  const products = picked.data ?? []

  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<ProductCouponIssueResult | null>(null)

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (pending) return
    const problem = couponProblem(form, { requireTarget: true })
    if (problem) return setError(problem)
    setPending(true)
    setError('')
    try {
      const rate = form.discountType === 'RATE'
      const res = await issueProductCoupon({
        partnershipId: Number(form.partnershipId),
        productId: Number(form.productId),
        name: form.name.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        ...(rate ? { maxDiscountAmount: Number(form.maxDiscountAmount) } : {}),
        validFrom: startOf(form.from),
        validUntil: endExclusiveOf(form.to),
        quantityLimited: form.quantityLimited,
        ...(form.quantityLimited ? { totalQuantity: Number(form.totalQuantity) } : {}),
      })
      setIssued(res)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  const submitBtn = (
    <Button type="submit" form="coupon-form" size={desktop ? 'md' : 'lg'} disabled={pending || active.length === 0}>
      {pending ? '발행하는 중이에요' : '발행하기'}
    </Button>
  )

  let content
  if (partners.loading && !partners.data) content = <Loading />
  else if (partners.error) content = <ErrorView message={partners.error} onRetry={partners.reload} />
  else if (active.length === 0)
    content = (
      <Empty
        title="진행 중인 협약이 없어요"
        action={
          <Button size="sm" to="/seller/partners">
            협약 요청하러 가기
          </Button>
        }
      >
        인플루언서와 협약이 진행 중일 때만 상품 쿠폰을 발행할 수 있어요.
      </Empty>
    )
  else
    content = (
      <form id="coupon-form" onSubmit={submit} noValidate className={desktop ? `${s.panel} ${s.narrow}` : s.mForm}>
        <div className={f.field}>
          <label htmlFor="cp-partner" className={f.label}>
            인플루언서
          </label>
          <select
            id="cp-partner"
            className={f.select}
            value={form.partnershipId}
            onChange={(e) => setForm((x) => ({ ...x, partnershipId: e.target.value, productId: '' }))}
          >
            <option value="">고르기</option>
            {active.map((p) => (
              <option key={p.partnershipId} value={p.partnershipId}>
                {p.activityName ?? `인플루언서 #${p.influencerId}`}
              </option>
            ))}
          </select>
          <p className={f.help}>협약이 진행 중인 인플루언서만 고를 수 있어요</p>
        </div>
        <div className={f.field}>
          <label htmlFor="cp-product" className={f.label}>
            대상 상품
          </label>
          <select
            id="cp-product"
            className={f.select}
            value={form.productId}
            disabled={!form.partnershipId || picked.loading}
            onChange={(e) => setForm((x) => ({ ...x, productId: e.target.value }))}
          >
            <option value="">
              {!form.partnershipId
                ? '인플루언서를 먼저 골라 주세요'
                : picked.loading
                  ? '불러오는 중이에요'
                  : products.length === 0
                    ? 'pick한 상품이 없어요'
                    : '고르기'}
            </option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name} · {won(p.price)}
              </option>
            ))}
          </select>
          {picked.error ? (
            <p className={f.error}>{picked.error}</p>
          ) : (
            <p className={f.help}>그 인플루언서가 pick한 내 판매 중 상품만 보여요</p>
          )}
        </div>
        <CouponFields form={form} setForm={setForm} />
        <ul className={s.ruleList}>
          <li>쿠폰마다 코드가 자동으로 1개 만들어져요.</li>
          <li>같은 인플루언서·같은 상품으로 기간이 겹치는 쿠폰은 발행할 수 없어요.</li>
          <li>할인액은 그 상품 금액(단가 × 수량)을 넘지 않아요. 구매자 1명당 1번 쓸 수 있어요.</li>
        </ul>
        {error && <Notice tone="error">{error}</Notice>}
      </form>
    )

  return (
    <ConsoleShell
      variant="seller"
      active="coupons"
      title="쿠폰 발행"
      description="협약 중인 인플루언서에게 내 상품의 할인 코드를 만들어 줘요."
      back="/seller/coupons"
      hideMobileNav
      actions={
        <>
          <Button variant="outline" to="/seller/coupons">
            취소
          </Button>
          {submitBtn}
        </>
      }
      bottom={active.length > 0 ? <BottomBar>{submitBtn}</BottomBar> : undefined}
    >
      {content}
      {issued && (
        <Modal
          title="쿠폰을 발행했어요"
          onClose={() => navigate('/seller/coupons', { replace: true })}
          actions={
            <Button onClick={() => navigate('/seller/coupons', { replace: true })}>쿠폰 목록으로</Button>
          }
        >
          <p>인플루언서가 구독자에게 이 코드를 전달해요.</p>
          <p className={s.issuedCode}>
            <code>{issued.code}</code>
          </p>
        </Modal>
      )}
    </ConsoleShell>
  )
}
