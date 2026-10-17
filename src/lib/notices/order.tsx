/**
 * 장바구니·주문 안내 모달 문구 (담당: 은정)
 */

import type { Notice } from '../../components/NoticeModal'
import type { OrderStatus } from '../api/order'
import { OK, codeOf, commonNotice, subject } from './common'

/** 백엔드 custom.order.cartMaxQuantity */
const MAX_QTY = 99

/** 장바구니에서 수량·선택을 바꾸거나 지울 때 */
export function cartNotice(e: unknown, ctx: { name?: string } = {}): Notice {
  switch (codeOf(e)) {
    case 'STOCK_EXCEEDED':
      return {
        title: '담을 수 있는 수량을 넘었어요',
        body: `${subject(ctx.name)} 남은 재고보다 많이 담을 수 없어요. 수량을 줄여 주세요.`,
        actions: OK,
      }
    case 'CART_QUANTITY_INVALID':
    case 'VALIDATION_FAILED':
      return {
        title: `수량은 1개부터 ${MAX_QTY}개까지 담을 수 있어요`,
        body: `한 상품은 장바구니에 최대 ${MAX_QTY}개까지 담을 수 있어요. 수량을 다시 정해 주세요.`,
        actions: OK,
      }
    case 'PRODUCT_NOT_ON_SALE':
    case 'PRODUCT_NOT_FOUND':
      return {
        title: '판매하지 않는 상품이 있어요',
        body: `${subject(ctx.name)} 지금 판매하지 않아요. 장바구니에서 빼고 다시 주문해 주세요.`,
        actions: OK,
      }
    case 'CART_ITEM_NOT_FOUND':
      return {
        title: '장바구니에 없는 상품이에요',
        body: '다른 화면에서 이미 빼거나 결제한 상품이에요. 장바구니를 다시 불러왔어요.',
        actions: OK,
      }
    case 'CART_ITEM_IN_PENDING_ORDER':
      return {
        title: '결제를 기다리는 주문이 있어요',
        body: `${subject(ctx.name)} 결제를 기다리는 주문에 들어 있어요. 그 주문을 결제하거나 취소한 뒤 다시 주문할 수 있어요.`,
        actions: [{ label: '닫기' }, { label: '주문 내역 보기', to: '/orders', primary: true }],
      }
    case 'SELF_PURCHASE_NOT_ALLOWED':
      return {
        title: '내 상품은 주문할 수 없어요',
        body: `${subject(ctx.name)} 내가 판매하는 상품이에요. 장바구니에서 빼고 다시 주문해 주세요.`,
        actions: OK,
      }
    case 'PRICE_CHANGED':
      return {
        title: '가격이 바뀐 상품이 있어요',
        body: '장바구니를 다시 불러왔어요. 바뀐 금액을 확인한 뒤 다시 주문해 주세요.',
        actions: OK,
      }
    default:
      return commonNotice(e)
  }
}

/** 주문 상세에서 취소·구매 확정할 때. status는 버튼을 누를 때의 주문 상태예요. */
export function orderNotice(e: unknown, ctx: { status?: OrderStatus } = {}): Notice {
  switch (codeOf(e)) {
    case 'ORDER_NOT_CANCELABLE':
      return ctx.status === 'CANCELED'
        ? { title: '이미 취소된 주문이에요', body: '주문 상태를 다시 불러왔어요.', actions: OK }
        : {
            title: '결제한 주문은 취소할 수 없어요',
            body: '결제를 마친 주문은 구매 확정 전까지 반품을 요청할 수 있어요.',
            actions: OK,
          }
    case 'ORDER_NOT_CONFIRMABLE':
      if (ctx.status === 'RETURN_REQUESTED')
        return {
          title: '반품을 확인하고 있는 주문이에요',
          body: '관리자가 반품 요청을 확인하는 동안에는 구매 확정할 수 없어요. 결과가 나오면 주문 상세에서 알려 드려요.',
          actions: OK,
        }
      if (ctx.status === 'CONFIRMED')
        return { title: '이미 구매 확정한 주문이에요', body: '주문 상태를 다시 불러왔어요.', actions: OK }
      return {
        title: '구매 확정할 수 없는 주문이에요',
        body: '결제를 마친 주문만 구매 확정할 수 있어요. 주문 상태를 다시 불러왔어요.',
        actions: OK,
      }
    case 'RETURN_ALREADY_REQUESTED':
      return {
        title: '이미 반품을 요청한 주문이에요',
        body: '반품은 주문당 한 번만 요청할 수 있어요. 관리자 확인 결과는 주문 상세에서 볼 수 있어요.',
        actions: OK,
      }
    case 'ORDER_STATE_INVALID':
    case 'CONCURRENT_UPDATE':
    case 'DATA_CONFLICT':
      return {
        title: '이미 처리된 주문이에요',
        body: '이 주문은 이미 결제했거나 취소됐어요. 주문 상태를 다시 불러왔어요.',
        actions: OK,
      }
    case 'ORDER_NOT_FOUND':
      return {
        title: '주문을 찾을 수 없어요',
        body: '주문 내역에서 다시 확인해 주세요.',
        actions: [{ label: '주문 내역 보기', to: '/orders', primary: true }],
      }
    default:
      return commonNotice(e)
  }
}
