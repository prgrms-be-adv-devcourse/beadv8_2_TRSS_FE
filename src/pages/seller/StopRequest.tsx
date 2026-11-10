import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import { ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { getSellerProductForm, requestProductStop, type SellerProductSummary } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, PRODUCT_STATUS } from './shared'
import s from './seller.module.css'

/** 판매 중지 요청 사유 최대 길이 (백엔드 @Size(max = 300)) */
const REASON_MAX = 300

/**
 * S13 판매 중지 요청 (POST /api/v1/seller/products/{productId}/stop-requests)
 * 상품 관리 목록에서 넘겨준 상품 요약(재고·상태)을 쓰고, 주소로 바로 들어오면 수정 폼 API로 이름·가격만 불러와요.
 */
export default function SellerStopRequestPage() {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const { productId } = useParams()
  const passed = (useLocation().state as { product?: SellerProductSummary } | null)?.product
  const summary = passed && String(passed.productId) === productId ? passed : null
  const form = useApi(() => (summary ? Promise.resolve(null) : getSellerProductForm(productId!)), [productId])

  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const name = summary?.name ?? form.data?.name ?? ''
  const price = summary?.price ?? form.data?.price
  const thumb = summary?.thumbnailUrl ?? form.data?.thumbnail?.url ?? null
  const meta = [
    price != null ? won(price) : null,
    summary ? `재고 ${summary.stock}개` : null,
    summary ? PRODUCT_STATUS[summary.status][0] : null,
  ]
    .filter(Boolean)
    .join(' · ')

  async function submit() {
    if (!reason.trim() || pending) return
    setPending(true)
    setError('')
    try {
      await requestProductStop(Number(productId), reason.trim())
      navigate('/seller/products', {
        replace: true,
        state: { done: `‘${name}’ 판매 중지를 요청했어요. 관리자가 승인할 때까지는 계속 판매돼요.` },
      })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const submitBtn = (
    <Button variant="danger" size={desktop ? 'md' : 'lg'} onClick={submit} disabled={!reason.trim() || pending}>
      {pending ? '보내는 중이에요' : '중지 요청 보내기'}
    </Button>
  )

  return (
    <ConsoleShell
      variant="seller"
      active="products"
      title="판매 중지 요청"
      description="관리자가 사유를 검토한 뒤 승인 또는 반려해요."
      back="/seller/products"
      hideMobileNav
      actions={
        <>
          <Button variant="outline" to="/seller/products">
            취소
          </Button>
          {submitBtn}
        </>
      }
      bottom={<BottomBar note="관리자가 사유를 검토한 뒤 승인 또는 반려해요">{submitBtn}</BottomBar>}
    >
      {form.loading && !summary ? (
        <Loading />
      ) : form.error ? (
        <ErrorView message={form.error} onRetry={form.reload} />
      ) : (
        <div className={desktop ? `${s.narrow} ${s.stack}` : `${s.mobileBlock} ${s.stack}`}>
          <div className={s.prodCard}>
            <Thumb src={thumb} width={56} height={62} />
            <span className={s.prodText}>
              <b>{name}</b>
              <span className={s.faint}>{meta}</span>
            </span>
          </div>
          <div className={s.warnBox}>
            <b>관리자가 승인하면 판매가 바로 중지되고, 다시 판매로 돌릴 수 없어요.</b>
            <ul>
              <li>장바구니 담기와 새 주문이 막혀요.</li>
              <li>결제 전 주문은 취소되고 재고·쿠폰이 복원돼요.</li>
              <li>이미 결제된 주문은 그대로 배송해 주세요.</li>
              <li>이 상품의 상품 쿠폰은 모두 중지돼요.</li>
            </ul>
          </div>
          <div className={f.field}>
            <label htmlFor="stop-reason" className={f.label}>
              중지 사유<span className={f.req}>*</span>
            </label>
            <textarea
              id="stop-reason"
              className={f.textarea}
              rows={5}
              placeholder="예: 원료 수급이 어려워 더 이상 만들 수 없어요"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            />
            <p className={`${f.help} ${s.right}`}>
              {reason.length}/{REASON_MAX}
            </p>
          </div>
          {error && <Notice tone="error">{error}</Notice>}
        </div>
      )}
    </ConsoleShell>
  )
}
