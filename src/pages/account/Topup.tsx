import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { won } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { getOrder, isPayable } from '../../lib/api/order'
import { checkoutPath, failTopup, getWallet, prepareTopup, savePendingTopup } from '../../lib/api/wallet'
import {
  TOPUP_NOTICE_KEY,
  topupCanceledNotice,
  topupNotice,
  topupNoticeFrom,
  type TopupNoticeCtx,
  type TopupNoticeState,
} from '../../lib/notices/topup'
import type { Notice } from '../../components/NoticeModal'
import { useApi } from '../../lib/useApi'
import { mmss, useRemaining } from '../../lib/useRemaining'
import NoticeView from './NoticeView'
import s from './account.module.css'

/** 토스 결제위젯이 그려질 자리 (JSX의 <div id=...>와 같아야 해요) */
const WIDGET_METHOD_ID = 'toss-payment-method'
const WIDGET_AGREEMENT_ID = 'toss-agreement'

const MIN_AMOUNT = 10000
const MAX_AMOUNT = 1000000
const PRESETS = [10000, 30000, 50000, 100000]

/** 토스 결제위젯(결제수단·약관)을 화면에 한 번 그리고, 충전 금액이 바뀌면 위젯 금액도 바꿔요. */
function useTossWidgets(amount: number) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  const started = useRef(false) // StrictMode에서 두 번 그리면 '이미 렌더링됨' 오류가 나서 막아요
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined
    if (!clientKey) {
      setError('토스 클라이언트 키가 없어요. .env의 VITE_TOSS_CLIENT_KEY를 확인해 주세요.')
      return
    }
    async function init(key: string) {
      try {
        const toss = await loadTossPayments(key)
        const widgets = toss.widgets({ customerKey: ANONYMOUS })
        await widgets.setAmount({ currency: 'KRW', value: Math.max(amount, MIN_AMOUNT) }) // 그리기 전에 금액이 있어야 해요
        await Promise.all([
          widgets.renderPaymentMethods({ selector: `#${WIDGET_METHOD_ID}`, variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: `#${WIDGET_AGREEMENT_ID}`, variantKey: 'AGREEMENT' }),
        ])
        widgetsRef.current = widgets
        setReady(true)
      } catch {
        setError('결제 수단을 불러오지 못했어요. 새로고침해 주세요.')
      }
    }
    init(clientKey)
    // 처음 한 번만 그려요. 이후 금액 변경은 아래 effect가 맡아요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || amount <= 0) return
    widgetsRef.current?.setAmount({ currency: 'KRW', value: amount }).catch(() => {})
  }, [amount, ready])

  return { widgetsRef, ready, error }
}

/**
 * ⑩-2 예치금 충전 (토스 결제위젯)
 * 주문서에서 잔액이 부족해 왔으면 /wallet/topup?orderId=<숫자 주문 ID>&orderNumber=<ORD-…>&shortage=<부족 금액>
 * (예전 주소 /wallet?orderId=… 로 와도 예치금 화면이 이리로 넘겨요)
 * 충전 결과 화면에서 확인 중·실패·오류로 돌아오면 state.topupNotice를 모달로 띄워요.
 */
export default function TopupPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const shortage = Number(params.get('shortage') ?? 0)
  const returnOrderId = params.get('orderId')
  const orderNumber = params.get('orderNumber')
  const fitAmount = shortage > 0 ? Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, Math.ceil(shortage / 10000) * 10000)) : 0
  const presets = fitAmount ? [fitAmount, ...PRESETS.filter((p) => p > fitAmount)].slice(0, 4) : PRESETS

  const [amount, setAmount] = useState(fitAmount || Number(params.get('amount')) || 30000)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  const toss = useTossWidgets(amount)
  const wallet = useApi(getWallet, [])
  const order = useApi(() => (returnOrderId ? getOrder(Number(returnOrderId)) : Promise.resolve(null)), [returnOrderId])
  const remaining = useRemaining(order.data && isPayable(order.data.status) ? order.data : null)
  const backToCheckout = checkoutPath(returnOrderId)

  const amountValid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && amount % 10000 === 0

  // "다시 시도하기"가 늘 최신 금액·위젯으로 충전하도록 마지막 startTopup을 들고 있어요
  const startTopupRef = useRef<() => Promise<void>>(async () => {})
  const noticeCtx: TopupNoticeCtx = {
    onRetry: () => void startTopupRef.current(),
    onShowHistory: () => navigate('/wallet/topups'),
  }

  // 충전 결과 화면에서 넘겨준 안내(확인 중·실패·오류)를 모달로 띄우고, 새로고침·뒤로 때 다시 뜨지 않게 state를 지워요
  useEffect(() => {
    const handed = (location.state as Record<string, TopupNoticeState> | null)?.[TOPUP_NOTICE_KEY]
    if (!handed) return
    // 실패한 충전 금액을 다시 골라 두어 "다시 충전하기"·"다시 시도하기"가 같은 금액으로 이어지게 해요
    if (handed.kind !== 'orderExpired' && handed.amount && handed.amount >= MIN_AMOUNT && handed.amount <= MAX_AMOUNT)
      setAmount(handed.amount)
    setNotice(topupNoticeFrom(handed, noticeCtx))
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
    // 처음 들어왔을 때 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startTopup() {
    const widgets = toss.widgetsRef.current
    if (!widgets) {
      setPayError('결제 수단을 불러오는 중이에요. 잠시 후 다시 눌러 주세요.')
      return
    }
    if (!amountValid || paying) return
    setPaying(true)
    setPayError('')
    let topupId: number | null = null
    try {
      // 1) 백엔드에 충전 건을 만들고 토스 주문번호(orderId)를 받아요
      const prepared = await prepareTopup(amount)
      topupId = prepared.topupId
      // 2) 결제 요청 전에 topupId를 저장해요 (사용자 취소 시 토스가 orderId를 안 줘요)
      savePendingTopup({
        topupId: prepared.topupId,
        orderId: prepared.orderId,
        returnOrderId,
        orderNumber,
        shortage: shortage || null,
      })
      await widgets.setAmount({ currency: 'KRW', value: prepared.amount })
      // 3) 결제를 요청하면 토스가 successUrl 또는 failUrl로 이동시켜요
      // 결과 화면에서 토스가 붙이는 orderId(TOPUP-…)와 겹치지 않게 returnOrderId로 넘겨요
      const back = returnOrderId
        ? new URLSearchParams({
            returnOrderId,
            ...(orderNumber ? { orderNumber } : {}),
            ...(shortage > 0 ? { shortage: String(shortage) } : {}),
          }).toString()
        : ''
      await widgets.requestPayment({
        orderId: prepared.orderId,
        orderName: '팔레트 예치금 충전',
        successUrl: `${window.location.origin}/wallet/topup-result${back ? `?${back}` : ''}`,
        failUrl: `${window.location.origin}/wallet/topup-result?topupId=${prepared.topupId}${back ? `&${back}` : ''}`,
      })
      // 리다이렉트되므로 성공하면 이 아래는 실행되지 않아요
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'USER_CANCEL' && topupId !== null) {
        // 결제창(팝업)을 닫은 경우: 실패를 기록해요. 다른 SDK 오류는 15분 뒤 자동 만료돼서 호출하지 않아요
        await failTopup(topupId, { code, message: (e as Error).message }).catch(() => {})
        setNotice(topupCanceledNotice())
      } else if (code) {
        setPayError((e as Error).message || '결제를 진행하지 못했어요.') // 약관 미동의 등 토스 안내 문구
      } else {
        setNotice(topupNotice(e, noticeCtx)) // 충전 준비 API 실패 (TOPUP_AMOUNT_INVALID, 로그인 만료 등)
      }
    } finally {
      setPaying(false)
    }
  }
  startTopupRef.current = startTopup

  const balance = wallet.data?.balance
  const total = order.data?.totalPrice
  const lack = shortage > 0 ? shortage : total !== undefined && balance !== undefined ? Math.max(0, total - balance) : 0

  return (
    <AppFrame
      bottom={
        <BottomBar note={payError ? undefined : '토스페이먼츠 결제창으로 이동해요'}>
          <Button size="lg" onClick={startTopup} disabled={!toss.ready || !amountValid || paying}>
            {paying ? '결제를 준비하고 있어요…' : `${won(amount)} 충전하기`}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="예치금 충전" back={backToCheckout ?? '/wallet'} />

      {returnOrderId && order.data && (
        <>
          {isPayable(order.data.status) && remaining > 0 ? (
            <div className={s.timeBox} role="timer">
              <Icon name="bell" size={18} />
              <span>
                주문 결제까지 <b>{mmss(remaining)}</b> 남았어요
                <br />
                시간이 지나면 주문이 취소돼요
              </span>
            </div>
          ) : (
            <div className={s.timeBox} role="alert">
              <Icon name="bell" size={18} />
              <span>
                {orderNumber ? `주문 ${orderNumber}의 ` : '주문 '}결제 시간이 지났어요. 충전한 예치금은 다음 주문에 쓸 수
                있어요.
              </span>
            </div>
          )}
          <dl className={s.payDl}>
            <div>
              <dt>결제할 금액</dt>
              <dd>{won(order.data.totalPrice)}</dd>
            </div>
            <div>
              <dt>지금 예치금</dt>
              <dd>{balance === undefined ? '-' : won(balance)}</dd>
            </div>
            {lack > 0 && (
              <div className={s.short}>
                <dt>부족한 금액</dt>
                <dd>{won(lack)}</dd>
              </div>
            )}
          </dl>
        </>
      )}
      {!returnOrderId && (
        <dl className={s.payDl}>
          <div>
            <dt>지금 예치금</dt>
            <dd>{balance === undefined ? '-' : won(balance)}</dd>
          </div>
        </dl>
      )}

      <section aria-labelledby="tp-amount" className={f.section}>
        <h2 id="tp-amount" className={f.sectionTitle}>
          충전할 금액
        </h2>
        <div role="group" aria-label="충전 금액" className={s.presetGrid}>
          {presets.map((p, i) => (
            <button
              key={p}
              type="button"
              aria-pressed={amount === p}
              disabled={paying}
              className={`${s.preset} ${amount === p ? s.presetOn : ''}`}
              onClick={() => setAmount(p)}
            >
              <b>{won(p)}</b>
              {fitAmount > 0 && i === 0 && <span>부족 금액 맞춤</span>}
            </button>
          ))}
        </div>
        <label htmlFor="tp-input" className={s.fLabel}>
          직접 입력
        </label>
        <div className={s.amountBox}>
          <input
            id="tp-input"
            className={f.input}
            inputMode="numeric"
            placeholder="10,000원 단위로 입력"
            value={amount ? amount.toLocaleString('ko-KR') : ''}
            // 결제 준비 중에 금액이 바뀌면 토스 결제 금액이 충전 건과 달라져요
            disabled={paying}
            onChange={(e) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
          />
          <span>원</span>
        </div>
        <p className={amount && !amountValid ? s.fErr : s.fHelp}>
          10,000원 단위 · 최소 10,000원 ~ 최대 1,000,000원
        </p>
      </section>

      <section aria-label="결제 방법" className={s.widget}>
        {/* 토스 결제위젯이 이 두 div 안에 결제수단과 약관을 그려요 */}
        <div id={WIDGET_METHOD_ID} />
        <div id={WIDGET_AGREEMENT_ID} />
      </section>
      {toss.error && (
        <p role="alert" className={`${s.alert} ${s.card}`}>
          {toss.error}
        </p>
      )}
      {payError && (
        <p role="alert" className={`${s.alert} ${s.card}`}>
          {payError}
        </p>
      )}

      <NoticeView notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}
