import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { won } from '../../components/ui/Misc'
import { ApiError } from '../../lib/api'
import { getOrder, isPayable } from '../../lib/api/order'
import {
  checkoutPath,
  clearPendingTopup,
  confirmTopup,
  failTopup,
  getTopup,
  getTopups,
  readPendingTopup,
  walletPath,
} from '../../lib/api/wallet'
import { TOPUP_NOTICE_KEY, toTopupNoticeState, type TopupNoticeState } from '../../lib/notices/topup'
import s from './account.module.css'

type Phase = 'checking' | 'done'
type Info = { orderId: string; amount: number; balance: number | null }

/**
 * 토스가 돌려보낸 URL을 읽고 승인·실패 기록 API를 한 번 불러요.
 * - 성공: ?paymentKey&orderId&amount            → 승인(confirm). 승인이 안 되거나 결과를 모르면 충전 건 상태로 판단
 * - 실패: ?topupId&code&message(&orderId)       → 실패 기록(fail) 후 충전 건 상태로 판단
 * - 새로고침: ?topupId                          → 충전 건 상태로 판단
 * 주문서에서 왔으면 returnOrderId(숫자 주문 ID)·orderNumber(ORD-…)·shortage가 함께 붙어 있어요.
 *
 * 화면 규칙 (10/18 결정: 결과 페이지 대신 모달)
 * - 충전 완료(DONE)만 이 화면에서 결과를 보여 줘요
 * - 확인 중·실패·오류는 예치금 화면(→ 충전 화면)으로 돌아가 안내 모달을 띄워요 (lib/notices/topup.tsx)
 * - 충전은 됐는데 돌아갈 주문이 이미 취소됐으면 "충전은 됐지만 주문 시간이 지났어요" 모달
 */
function useTopupResultView() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const started = useRef(false)
  const [phase, setPhase] = useState<Phase>('checking')
  const [info, setInfo] = useState<Info>({ orderId: '', amount: 0, balance: null })
  const pending = readPendingTopup()
  // 주문서에서 왔을 때만 있어요. URL에 없으면(새로고침 등) 결제 요청 전에 저장해 둔 값을 써요
  const returnOrderId = params.get('returnOrderId') ?? pending?.returnOrderId ?? null
  const orderNumber = params.get('orderNumber') ?? pending?.orderNumber ?? null
  const shortage = Number(params.get('shortage')) || pending?.shortage || null

  useEffect(() => {
    if (started.current) return // StrictMode에서 두 번 실행되면 승인 API가 409가 나서 막아요
    started.current = true
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = Number(params.get('amount'))
    const code = params.get('code')
    // failUrl에 붙인 topupId가 우선, 없으면 결제 요청 전에 저장해 둔 값
    const topupId = Number(params.get('topupId')) || pending?.topupId || 0

    /** 예치금 화면으로 돌아가 모달을 띄워요. 주문서에서 왔으면 부족액 안내도 다시 보여요 */
    function leave(notice: TopupNoticeState, keepOrder = true) {
      clearPendingTopup()
      const to = keepOrder ? walletPath({ returnOrderId, orderNumber, shortage }) : '/wallet'
      navigate(to, { replace: true, state: { [TOPUP_NOTICE_KEY]: notice } })
    }

    /**
     * 충전 완료. URL을 ?topupId로 바꿔 새로고침해도 승인 API를 다시 부르지 않게 하고,
     * 주문서에서 왔으면 그 주문이 아직 결제할 수 있는지 확인해요
     */
    async function done(id: number, info: Info) {
      clearPendingTopup()
      if (returnOrderId) {
        try {
          const o = await getOrder(Number(returnOrderId))
          // 15분이 지나 취소됐거나, 아직 취소 전이어도 남은 결제 시간이 0이면 결제할 수 없어요
          const expired = o.status === 'CANCELED' || (isPayable(o.status) && o.remainingSeconds <= 0)
          if (expired) {
            leave({ kind: 'orderExpired', amount: info.amount, orderNumber: orderNumber ?? o.orderNumber }, false)
            return
          }
        } catch {
          // 주문을 못 읽으면 충전 결과만 보여 줘요 (주문서에서 다시 확인돼요)
        }
      }
      setParams(
        {
          topupId: String(id),
          ...(returnOrderId ? { returnOrderId } : {}),
          ...(orderNumber ? { orderNumber } : {}),
        },
        { replace: true },
      )
      setInfo(info)
      setPhase('done')
    }

    /**
     * 충전 건 상태를 읽어 완료면 결과 화면, 아니면 예치금 화면 모달
     * fallback: 승인 API 오류를 받았는데 충전 건이 아직 READY(승인 처리 전)면, 상태 대신 받은 오류로 안내해요
     * unknown: 승인 결과를 모를 때(네트워크 오류·5xx). 아직 READY여도 백엔드가 곧 승인할 수 있어서
     *          "충전되지 않았어요, 다시 충전해 주세요" 대신 확인 중으로 안내해요 (다시 충전해 두 번 결제되지 않게)
     */
    async function decideByStatus(id: number, fallback?: TopupNoticeState, unknown = false) {
      const t = await getTopup(id)
      if (t.status === 'DONE') {
        await done(id, { orderId: t.orderId, amount: t.amount, balance: null })
        return
      }
      if (t.status === 'READY' && unknown) {
        leave({ kind: 'status', status: 'PROCESSING', amount: t.amount })
        return
      }
      if (t.status === 'READY' && fallback) {
        leave(fallback)
        return
      }
      leave({ kind: 'status', status: t.status, reason: t.failReason, amount: t.amount })
    }

    /** 토스 주문번호로 충전 건을 찾아요. 저장해 둔 값이 없으면(다른 탭·북마크로 다시 연 경우) 최근 충전 내역에서 찾아요 */
    async function findTopupId(tossOrderId: string) {
      if (pending?.orderId === tossOrderId) return pending.topupId
      const recent = await getTopups({ size: 20 })
      return recent.items.find((t) => t.orderId === tossOrderId)?.topupId ?? null
    }

    async function run() {
      try {
        if (paymentKey && orderId) {
          try {
            const r = await confirmTopup({ paymentKey, orderId, amount })
            if (r.status === 'DONE') {
              await done(r.topupId, { orderId: r.orderId, amount: r.amount, balance: r.balance })
            } else {
              leave({ kind: 'status', status: r.status, amount: r.amount }) // PROCESSING: 확인 중 모달
            }
            return
          } catch (e) {
            // 네트워크 오류·5xx는 결과를 알 수 없어요. 토스는 이미 결제했고 백엔드가 PROCESSING으로 두었을 수 있어요
            const unknown = !(e instanceof ApiError) || e.status === 0 || e.status >= 500
            // 승인이 안 됐거나(409 이미 처리됨, 400 카드사 거절·금액 불일치) 결과를 모를 때는 충전 건의 실제 상태로 판단해요
            if (unknown || (e instanceof ApiError && (e.status === 409 || e.status === 400))) {
              try {
                const id = await findTopupId(orderId)
                if (id) {
                  await decideByStatus(id, unknown ? undefined : toTopupNoticeState(e, amount), unknown)
                  return
                }
              } catch {
                // 상태를 못 읽으면 아래에서 처리해요
              }
            }
            // 상태도 못 읽었으면: 결과를 모르면 확인 중, 아니면 받은 오류 그대로 안내해요
            leave(unknown ? { kind: 'status', status: 'PROCESSING', amount } : toTopupNoticeState(e, amount))
            return
          }
        }
        if (topupId && code) {
          // 실패 URL로 돌아온 경우: 토스 에러 코드·메시지를 그대로 기록해요 (이미 처리된 건이면 409라 무시)
          await failTopup(topupId, { code, message: params.get('message') ?? undefined }).catch((e) => {
            if (!(e instanceof ApiError && e.status === 409)) throw e
          })
        }
        if (topupId) {
          await decideByStatus(topupId)
          return
        }
        leave({
          kind: 'error',
          status: 404,
          resultCode: '404-TOPUP_NOT_FOUND',
          msg: '충전 정보를 찾지 못했어요. 예치금 화면에서 충전 내역을 확인해 주세요.',
        })
      } catch (e) {
        // 404(다른 사람의 충전 건·없는 충전 건), 401(로그인 만료) 등
        leave(toTopupNoticeState(e))
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    phase,
    info,
    title: `${won(info.amount)}을 충전했어요`,
    desc: orderNumber
      ? `이제 주문 ${orderNumber}를 결제할 수 있어요.`
      : returnOrderId
        ? '이제 주문서에서 결제할 수 있어요.'
        : '이제 예치금으로 결제할 수 있어요.',
    balanceText: info.balance !== null ? won(info.balance) : '예치금 화면에서 확인해 주세요',
    backToCheckout: checkoutPath(returnOrderId),
  }
}

/** ⑩-1 충전 결과 (충전 완료만 보여 주고, 나머지는 충전 화면 모달로 안내해요) */
export default function TopupResultPage() {
  const v = useTopupResultView()
  const done = v.phase === 'done'
  return (
    <AppFrame
      bottom={
        done ? (
          <BottomBar equal={!!v.backToCheckout}>
            {v.backToCheckout ? (
              <>
                <Button size="lg" variant="outline" to="/wallet">
                  예치금 보기
                </Button>
                <Button size="lg" to={v.backToCheckout}>
                  주문서로 돌아가 결제하기
                </Button>
              </>
            ) : (
              <Button size="lg" to="/wallet">
                예치금 보기
              </Button>
            )}
          </BottomBar>
        ) : undefined
      }
    >
      <PageHeader title="충전 결과" back={done ? '/wallet' : undefined} />
      <section className={s.result} aria-busy={!done}>
        <span aria-hidden="true" className={`${s.resultIcon} ${done ? '' : s.resultWait}`}>
          <Icon name={done ? 'check' : 'won'} size={30} />
        </span>
        {!done ? (
          <>
            <h2>충전 결과를 확인하고 있어요</h2>
            <p role="status">잠시만 기다려 주세요. 창을 닫거나 새로고침하지 마세요.</p>
          </>
        ) : (
          <>
            <div>
              <h2>{v.title}</h2>
              <p>{v.desc}</p>
            </div>
            <dl className={s.resultDl}>
              <dt>충전번호</dt>
              <dd title={v.info.orderId}>{v.info.orderId ? v.info.orderId.slice(0, 13) : '-'}</dd>
              <dt>충전 금액</dt>
              <dd>{v.info.amount ? won(v.info.amount) : '-'}</dd>
              <dt>사용할 수 있는 예치금</dt>
              <dd>{v.balanceText}</dd>
            </dl>
          </>
        )}
      </section>
    </AppFrame>
  )
}
