/**
 * 예치금 충전 안내 모달 문구 (담당: 다은)
 * 디자인: /orders/errors "예치금을 충전할 때" (400 TOPUP_AMOUNT_INVALID ~ 409 TOPUP_ALREADY_USED)
 *
 * 충전 결과 화면은 성공(DONE)만 결과 페이지로 보여 주고, 나머지(확인 중·실패·오류)는 예치금 화면으로 돌아가 이 모달로 보여 줘요.
 * 오류 종류·상태는 BE PaymentErrorCode, PaymentConfirmTopupUseCase, PaymentTopupConfirmProcessor 기준이에요.
 * 화면을 옮길 때 함수(onClick)는 넘길 수 없어서, 모달 내용 대신 TopupNoticeState(글자·숫자만)를 넘기고
 * 예치금 화면에서 topupNoticeFrom()으로 모달을 만들어요.
 */

import type { Notice, NoticeAction } from '../../components/NoticeModal'
import { ApiError, errorMessage } from '../api'
import type { TopupStatus } from '../api/wallet'
import { won } from '../ui'
import { OK, codeOf, commonNotice } from './common'

/** 충전 결과 화면 → 예치금 화면으로 안내를 넘길 때 쓰는 router state 이름 */
export const TOPUP_NOTICE_KEY = 'topupNotice'

/** 모달 버튼이 할 일. 예치금 화면이 넘겨줘요 */
export type TopupNoticeCtx = {
  /** "다시 시도하기": 같은 금액으로 다시 충전 */
  onRetry?: () => void
  /** "예치금 내역 보기": 충전 내역 탭으로 이동 */
  onShowHistory?: () => void
}

/** 충전 결과 화면 → 예치금 화면으로 넘기는 안내 (router state에 담을 수 있게 글자·숫자만) */
export type TopupNoticeState =
  | { kind: 'status'; status: TopupStatus; reason?: string | null; amount?: number }
  | { kind: 'error'; status: number; resultCode: string; msg: string; data?: unknown; amount?: number }
  | { kind: 'orderExpired'; amount: number; orderNumber: string | null }

/** 같은 금액으로 다시 충전하려면 모달만 닫고 충전하기 영역을 쓰면 돼요 */
const RETRY_TOPUP: NoticeAction[] = [{ label: '다시 충전하기', primary: true }]

/** 카드사 안내 문구 상자 (디자인: "카드사 안내: 한도가 초과되었습니다.") */
const PgMessage = ({ text }: { text: string }) => (
  <p style={{ margin: '0 0 12px', padding: '10px 14px', borderRadius: '8px', background: '#F6F6F8', fontSize: '14px' }}>
    카드사 안내: {text}
  </p>
)

const amountInvalid = (): Notice => ({
  title: '충전 금액을 다시 입력해 주세요',
  body: '예치금은 10,000원 단위로, 한 번에 10,000원부터 1,000,000원까지 충전할 수 있어요.',
  actions: OK,
})

const declined = (pgMessage?: string | null): Notice => ({
  title: '카드사에서 결제를 승인하지 않았어요',
  body: (
    <>
      {pgMessage && <PgMessage text={pgMessage} />}
      한도 초과나 카드 정보 오류로 승인되지 않았어요. 다른 결제 수단으로 다시 충전해 주세요.
    </>
  ),
  actions: RETRY_TOPUP,
})

const amountMismatch = (): Notice => ({
  title: '충전 금액이 달라 충전하지 않았어요',
  body: '요청한 금액과 결제 금액이 달라 충전을 멈췄어요. 빠져나간 돈은 없어요. 처음부터 다시 충전해 주세요.',
  actions: RETRY_TOPUP,
})

const externalError = (ctx: TopupNoticeCtx): Notice => ({
  title: '결제 서비스에 연결하지 못했어요',
  body: '토스페이먼츠 응답에 문제가 있어 충전하지 못했어요. 잠시 후 다시 시도해 주세요.',
  actions: [{ label: '닫기' }, { label: '다시 시도하기', onClick: ctx.onRetry, primary: true }],
})

const processing = (): Notice => ({
  title: '충전 결과를 확인하고 있어요',
  body: '결제사 응답이 늦어지고 있어요. 승인되면 예치금에 자동으로 들어오니, 같은 금액으로 다시 충전하지 마세요.',
  actions: [{ label: '예치금 보기', primary: true }],
})

const alreadyProcessed = (ctx: TopupNoticeCtx): Notice => ({
  title: '이미 처리된 충전이에요',
  body: '이 충전은 이미 예치금에 들어왔어요. 예치금 내역에서 확인해 주세요.',
  actions: [{ label: '예치금 내역 보기', onClick: ctx.onShowHistory, primary: true }],
})

const alreadyUsed = (): Notice => ({
  title: '이 충전 건은 취소할 수 없어요',
  body: '일부라도 사용한 충전 건은 취소할 수 없어요. 한 번도 쓰지 않은 충전 건만 전액 취소할 수 있어요.',
  actions: OK,
})

/** 디자인에 없는 안내 (결제창 취소·결제 시간 초과). */
const userCanceled = (): Notice => ({
  title: '결제를 취소했어요',
  body: '빠져나간 돈은 없어요. 필요할 때 다시 충전해 주세요.',
  actions: OK,
})
/** 결제창에서 결제를 마치지 않은 충전 건(READY). 아무것도 들어오지 않으니 "확인 중"으로 안내하지 않아요 */
const notFinished = (): Notice => ({
  title: '충전을 마치지 않았어요',
  body: '결제창에서 결제를 마치지 않아 충전되지 않았어요. 빠져나간 돈은 없어요. 다시 충전해 주세요.',
  actions: RETRY_TOPUP,
})
const payExpired = (): Notice => ({
  title: '결제 시간이 지났어요',
  body: '결제창에서 결제를 마치지 않아 충전되지 않았어요. 빠져나간 돈은 없어요. 다시 충전해 주세요.',
  actions: RETRY_TOPUP,
})

/** 충전이 끝났는데 돌아갈 주문이 이미 취소된 경우 (디자인: 충전 완료 · 409 ORDER_EXPIRED) */
export const orderExpiredAfterTopup = (amount: number, orderNumber: string | null): Notice => ({
  title: '충전은 됐지만 주문 시간이 지났어요',
  body: `${won(amount)}원은 예치금에 들어왔어요. 주문${orderNumber ? ` ${orderNumber}` : ''}는 15분이 지나 취소됐으니 장바구니에서 다시 주문해 주세요.`,
  actions: [{ label: '장바구니로', to: '/cart', primary: true }],
})

/** 충전 API(준비·승인·실패 기록)가 실패했을 때 */
export function topupNotice(e: unknown, ctx: TopupNoticeCtx = {}): Notice {
  switch (codeOf(e)) {
    case 'TOPUP_AMOUNT_INVALID':
      return amountInvalid()
    case 'TOPUP_PAYMENT_DECLINED': {
      // 백엔드가 data에 토스 오류 { code, message }를 담아 줘요
      const d = (e as ApiError).data as { message?: string } | null
      return declined(d?.message)
    }
    case 'AMOUNT_MISMATCH':
      return amountMismatch()
    case 'EXTERNAL_SERVICE_ERROR':
      return externalError(ctx)
    case 'TOPUP_ALREADY_PROCESSED':
      return alreadyProcessed(ctx)
    case 'TOPUP_ALREADY_USED':
      return alreadyUsed()
    default:
      return commonNotice(e)
  }
}

/** 충전 건 상태로 안내를 골라요. 성공(DONE)은 결과 페이지로 보여 주므로 null */
export function topupStatusNotice(status: TopupStatus, reason: string | null | undefined, ctx: TopupNoticeCtx = {}) {
  switch (status) {
    case 'DONE':
      return null
    case 'READY':
      return notFinished()
    case 'PROCESSING':
      return processing()
    case 'FAILED_PG_DECLINED':
      return declined(reason)
    case 'FAILED_AMOUNT_MISMATCH':
      return amountMismatch()
    case 'FAILED_SYSTEM_ERROR':
      return externalError(ctx)
    case 'FAILED_USER_CANCEL':
    case 'CANCELED':
      return userCanceled()
    case 'FAILED_EXPIRED':
      return payExpired()
  }
}

/** 결제창을 닫았을 때 (requestPayment가 USER_CANCEL로 끝남) */
export const topupCanceledNotice = userCanceled

/** API 오류를 화면 이동 때 넘길 수 있는 모양으로 바꿔요 */
export function toTopupNoticeState(e: unknown, amount?: number): TopupNoticeState {
  if (e instanceof ApiError)
    return { kind: 'error', status: e.status, resultCode: e.resultCode, msg: e.message, data: e.data, amount }
  return { kind: 'error', status: 0, resultCode: '', msg: errorMessage(e), amount }
}

/** 결과 화면에서 넘겨받은 안내를 모달로 만들어요 */
export function topupNoticeFrom(s: TopupNoticeState, ctx: TopupNoticeCtx = {}): Notice | null {
  switch (s.kind) {
    case 'status':
      return topupStatusNotice(s.status, s.reason, ctx)
    case 'orderExpired':
      return orderExpiredAfterTopup(s.amount, s.orderNumber)
    case 'error':
      return topupNotice(new ApiError(s.status, s.resultCode, s.msg, s.data ?? null), ctx)
  }
}
