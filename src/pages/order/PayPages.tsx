import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading, won } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import { ApiError } from '../../lib/api'
import { isPayable } from '../../lib/api/order'
import { payOrder } from '../../lib/api/payment'
import { getWallet } from '../../lib/api/wallet'
import { AUTO_CONFIRM_DAYS, autoConfirmDate, mmdd } from '../../lib/orderStatus'
import { useApi } from '../../lib/useApi'
import { getOrderDetail, payAmountOf } from './api'
import type { PayErrorState } from './CheckoutPage'
import styles from './Pay.module.css'

/** 주문서 → 결제 진행 화면으로 넘기는 값 */
export type ProgressState = { orderId: number; orderNumber: string; amount: number; balance: number }
/** 결제 진행 → 결제 완료 화면으로 넘기는 값 (없으면 주문·예치금을 다시 불러와요) */
type DoneState = { paidAmount: number; paidAt: string; left: number }

/**
 * 결제 진행 (시안 ⑥-3 PayProgress)
 * 주문서에서 넘겨받은 주문을 예치금으로 결제해요. (POST /api/v1/orders/{orderId}/payment)
 * - 성공: /checkout/done?orderId= 로 바꿔요
 * - 실패: 주문서(/checkout?orderId=)로 돌아가 오류 안내 모달을 띄워요 (모달 버튼 동작은 주문서에서 만들어야 해서 오류만 넘겨요)
 */
export function PayProgressPage() {
  const navigate = useNavigate()
  const s = useLocation().state as ProgressState | null
  const started = useRef(false)

  useEffect(() => {
    if (!s?.orderId || started.current) return
    started.current = true // StrictMode에서 두 번 실행돼도 결제 요청은 한 번만 보내요
    payOrder(s.orderId)
      .then((r) => {
        // TODO: 백엔드 OrderPayResponse에 balance(결제 후 잔액)가 생기면 그 값을 써요. 완료 화면에서 예치금을 다시 불러와요
        const done: DoneState = { paidAmount: r.paidAmount, paidAt: r.paidAt, left: s.balance - r.paidAmount }
        navigate(`/checkout/done?orderId=${r.orderId}`, { replace: true, state: done })
      })
      .catch(async (e) => {
        // 새로고침 등으로 같은 주문을 두 번 결제하려 했으면 이미 결제됐을 수 있어요. 결제됐으면 완료 화면으로 가요
        if (e instanceof ApiError && e.status === 409) {
          const o = await getOrderDetail(s.orderId).catch(() => null)
          if (o && o.paidAt && !isPayable(o.status)) {
            navigate(`/checkout/done?orderId=${o.orderId}`, { replace: true })
            return
          }
        }
        const payError: PayErrorState =
          e instanceof ApiError
            ? { status: e.status, resultCode: e.resultCode, msg: e.message, data: e.data }
            : { status: 0, resultCode: 'NETWORK', msg: '', data: null }
        navigate(`/checkout?orderId=${s.orderId}`, { replace: true, state: { payError } })
      })
  }, [s, navigate])

  if (!s?.orderId)
    return (
      <AppFrame>
        <PageHeader title="결제" back="/orders" />
        <Empty
          title="진행 중인 결제가 없어요"
          action={
            <Button to="/orders" variant="outline">
              주문 내역 보기
            </Button>
          }
        >
          결제할 주문은 주문 내역에서 다시 결제할 수 있어요.
        </Empty>
      </AppFrame>
    )

  return (
    <AppFrame>
      <PageHeader title="주문 결제" />
      <div className={styles.backdrop}>
        <section role="dialog" aria-modal="true" aria-labelledby="pp-t" aria-busy="true" className={styles.dialog}>
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <h2 id="pp-t" className={styles.title}>
              결제하고 있어요
            </h2>
            <p className={styles.desc}>
              예치금 {won(s.amount)}을 결제하는 중이에요.
              <br />
              창을 닫거나 새로고침하지 말고 잠시만 기다려 주세요.
            </p>
          </div>
          <ol aria-label="결제 단계" className={styles.steps}>
            <li className={styles.stepDone}>
              <span className={styles.stepLine} />
              <span className={styles.stepDot}>
                <Icon name="check" size={12} strokeWidth={2.6} />
              </span>
              주문 확인
            </li>
            <li aria-current="step" className={styles.stepNow}>
              <span className={styles.stepLineOff} />
              <span className={styles.stepDot}>
                <span />
              </span>
              예치금 결제
            </li>
            <li className={styles.stepNext}>
              <span className={styles.stepDot} />
              결제 완료
            </li>
          </ol>
        </section>
      </div>
    </AppFrame>
  )
}

/** 결제 완료 (시안 ⑥-4 PayDone) /checkout/done?orderId= */
export function PayDonePage() {
  const [params] = useSearchParams()
  const orderId = Number(params.get('orderId')) || 0
  const s = useLocation().state as DoneState | null
  const order = useApi(() => (orderId ? getOrderDetail(orderId) : Promise.resolve(null)), [orderId])
  const wallet = useApi(getWallet, [])
  const o = order.data

  if (!orderId)
    return (
      <AppFrame>
        <PageHeader title="결제 완료" back="/orders" />
        <Empty
          title="주문 정보가 없어요"
          action={
            <Button to="/orders" variant="outline">
              주문 내역 보기
            </Button>
          }
        />
      </AppFrame>
    )

  const paidAt = s?.paidAt ?? o?.paidAt ?? null
  const autoAt = paidAt ? autoConfirmDate(paidAt) : null
  // 결제 후 잔액: 완료 화면에서 다시 불러온 예치금이 가장 정확해요. 못 불러오면 결제 전 잔액 - 결제 금액
  const left = wallet.data?.balance ?? s?.left ?? null
  const amount = s?.paidAmount ?? (o ? payAmountOf(o) : 0)

  return (
    <AppFrame
      bottom={
        <BottomBar equal>
          <Button size="lg" variant="outline" to="/">
            쇼핑 계속하기
          </Button>
          <Button size="lg" to={`/orders/${orderId}`}>
            주문 상세 보기
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="결제 완료" />
      {order.loading && !o && <Loading label="결제 결과를 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {o && (
        <section className={styles.result} aria-labelledby="pd-t">
          <span aria-hidden="true" className={styles.okMark}>
            <Icon name="check" size={28} strokeWidth={2.4} />
          </span>
          <div>
            <h2 id="pd-t" className={styles.title}>
              {o.paidAt ? '결제를 완료했어요' : '결제 상태를 확인해 주세요'}
            </h2>
            <p className={styles.desc}>
              {o.paidAt ? '주문한 상품을 판매자에게 전달했어요.' : '주문 상세에서 지금 상태를 확인할 수 있어요.'}
            </p>
          </div>
          <dl className={styles.sum}>
            <dt>주문번호</dt>
            <dd>{o.orderNumber}</dd>
            <dt>결제 금액</dt>
            <dd className={styles.strong}>{won(amount)}</dd>
            <dt>남은 예치금</dt>
            <dd>{left === null ? '-' : won(Math.max(0, left))}</dd>
            <dt>자동 구매 확정</dt>
            <dd>{autoAt ? `${mmdd(autoAt)} (결제 후 ${AUTO_CONFIRM_DAYS}일)` : '-'}</dd>
          </dl>
          <p className={styles.note}>
            결제한 금액은 구매를 확정하기 전까지 팔레트가 보관해요. 장바구니에서 결제한 상품은 빠졌어요.
          </p>
        </section>
      )}
    </AppFrame>
  )
}

/**
 * 주문 만료 (시안 ⑥-6 OrderExpired) /orders/expired?amount=&orderNumber=
 * 주문서에서 충전하러 갔다가 충전은 됐지만 그 사이 주문이 15분이 지나 취소된 경우예요.
 * (충전 결과 화면이 amount·orderNumber를 붙여 보내요. lib/notices/topup.tsx의 orderExpiredAfterTopup과 같은 상황)
 */
export function OrderExpiredPage() {
  const [params] = useSearchParams()
  const amount = Number(params.get('amount')) || 0
  const orderNumber = params.get('orderNumber')
  const wallet = useApi(getWallet, [])
  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button size="lg" variant="outline" to="/wallet">
            예치금 보기
          </Button>
          <Button size="lg" to="/cart">
            장바구니로 가기
          </Button>
        </BottomBar>
      }
    >
      <section className={styles.expired}>
        <span aria-hidden="true" className={styles.warnMark}>
          <Icon name="won" size={28} />
        </span>
        <h1 className={styles.bigTitle}>주문 결제 시간이 지났어요</h1>
        <p className={styles.desc}>
          충전은 정상으로 끝나 예치금에 들어갔어요.
          <br />
          주문{orderNumber ? ` ${orderNumber}` : ''}은 15분이 지나 취소됐으니 장바구니에서 다시 주문해 주세요.
        </p>
      </section>
      <dl className={styles.expiredSum}>
        {amount > 0 && (
          <div>
            <dt>충전한 금액</dt>
            <dd>{won(amount)}</dd>
          </div>
        )}
        <div>
          <dt>지금 예치금</dt>
          <dd className={styles.strong}>{wallet.data ? won(wallet.data.balance) : '-'}</dd>
        </div>
      </dl>
    </AppFrame>
  )
}
