/**
 * 주문서 결제 안내 모달 문구 (담당: 지은)
 * 디자인: /orders/errors (402 INSUFFICIENT_BALANCE ~ 409 ORDER_STATE_INVALID · 결제)
 */

import type { Notice } from '../../components/NoticeModal'
import { ApiError } from '../api'
import type { InsufficientBalance } from '../api/payment'
import { topupPath } from '../api/wallet'
import { won } from '../ui'
import { OK, codeOf, commonNotice } from './common'
import { orderNotice } from './order'

type Ctx = {
  orderId: number
  orderNumber: string
  /** '주문 취소하기'를 누르면 불러요 (결제 시점에 판매하지 않는 상품이 있을 때) */
  onCancel: () => void
}

/** 주문서에서 결제 요청(POST /orders/{orderId}/payment)이 실패했을 때 */
export function paymentNotice(e: unknown, ctx: Ctx): Notice {
  switch (codeOf(e)) {
    case 'INSUFFICIENT_BALANCE': {
      // 다른 탭에서 예치금을 쓰는 등 주문서에 보이던 잔액과 달라진 경우예요
      const d = (e as ApiError).data as InsufficientBalance | null
      const shortage = d?.shortage ?? 0
      const rec = d?.recommendedTopupAmount ?? Math.ceil(shortage / 10000) * 10000
      return {
        title: `예치금이 ${won(shortage)}원 모자라요`,
        body: '충전하면 이 주문을 그대로 결제할 수 있어요. 충전 금액은 10,000원 단위로 올려 계산했어요.',
        actions: [
          { label: '나중에 하기' },
          { label: `${won(rec)}원 충전하기`, to: topupPath(ctx.orderId, ctx.orderNumber, shortage), primary: true },
        ],
      }
    }
    case 'ORDER_EXPIRED':
      return {
        title: '결제 시간이 지났어요',
        body: '15분 안에 결제하지 않아 주문이 취소됐고, 예약한 재고도 풀렸어요. 장바구니에 담긴 상품으로 다시 주문할 수 있어요.',
        actions: [{ label: '다시 주문하기', to: '/cart', primary: true }],
      }
    case 'PRODUCT_NOT_ON_SALE':
      return {
        title: '결제할 수 없는 상품이 들어 있어요',
        body: '주문한 뒤 상품의 판매 정보가 바뀌어 이 주문으로는 결제할 수 없어요. 주문을 취소하고 장바구니에서 다시 주문해 주세요.',
        actions: [{ label: '닫기' }, { label: '주문 취소하기', onClick: ctx.onCancel, primary: true }],
      }
    case 'ORDER_STATE_INVALID':
      return {
        title: '이미 처리된 주문이에요',
        body: '이 주문은 이미 결제했거나 취소됐어요. 주문 상세에서 지금 상태를 확인해 주세요.',
        actions: [{ label: '주문 상세 보기', to: `/orders/${ctx.orderId}`, primary: true }],
      }
    case 'ORDER_NOT_FOUND':
      return orderNotice(e)
  }
  // 서버 오류: 주문은 결제 실패(PAYMENT_FAILED)로 남고 예치금은 빠져나가지 않아요
  if (e instanceof ApiError && e.status >= 500)
    return {
      title: '결제를 마치지 못했어요',
      body: '일시적인 오류로 결제되지 않았고, 예치금도 빠져나가지 않았어요. 남은 시간 안에 같은 주문을 다시 결제할 수 있어요.',
      actions: OK,
    }
  return commonNotice(e)
}
