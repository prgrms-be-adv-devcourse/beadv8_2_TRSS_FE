import { ApiError } from '../../lib/api'
import { FORBIDDEN, LOGIN, commonNotice } from '../../lib/notices/common'
import { cartNotice, orderNotice } from '../../lib/notices/order'
import { EXPIRED, paymentNotice } from '../../lib/notices/payment'
import { orderExpiredAfterTopup, topupCanceledNotice, topupNotice, topupStatusNotice } from '../../lib/notices/topup'
import { NoticeCard, toTopupLinks, type Notice } from './common'
import styles from './Modals.module.css'

/** 백엔드 오류 응답 흉내 ("409-PRICE_CHANGED") */
const err = (status: number, code: string, data: unknown = null, msg = '[서버가 보낸 안내 문구]') =>
  new ApiError(status, `${status}-${code}`, msg, data)

const noop = () => {}
const until = () => Date.now() + 412 * 1000
const payCtx = () => ({
  orderId: 1,
  orderNumber: 'ORD-20261009-0142',
  total: 66000,
  until: until(),
  productName: '비타민 브라이트닝 세럼',
  onCancel: noop,
  onRetry: noop,
})

type Item = { notice: Notice; code: string }
type Section = { title: string; desc: string; items: Item[] }

function sections(): Section[] {
  return [
    {
      title: '공통',
      desc: 'lib/notices/common.ts',
      items: [
        { notice: LOGIN, code: 'common.ts · 401' },
        { notice: FORBIDDEN.role, code: 'common.ts' },
        { notice: FORBIDDEN.seller, code: 'common.ts · 판매자 센터' },
        { notice: commonNotice(err(500, 'INTERNAL_ERROR')), code: 'common.ts · 그 밖의 오류' },
      ],
    },
    {
      title: '주문할 때',
      desc: 'lib/notices/order.tsx · pages/order/CartPage · CheckoutPage',
      items: [
        { notice: cartNotice(err(409, 'STOCK_EXCEEDED'), { name: '시카 리페어 크림 50ml' }), code: 'order.tsx' },
        { notice: cartNotice(err(400, 'CART_QUANTITY_INVALID')), code: 'order.tsx' },
        { notice: cartNotice(err(409, 'PRODUCT_NOT_ON_SALE'), { name: '비타민 브라이트닝 세럼' }), code: 'order.tsx · 품절·판매 중지 모두' },
        { notice: cartNotice(err(404, 'CART_ITEM_NOT_FOUND')), code: 'order.tsx' },
        {
          notice: cartNotice(err(409, 'CART_ITEM_IN_PENDING_ORDER', { pendingOrderIds: [1] }), {
            name: '순한 아미노 클렌징폼 150ml',
          }),
          code: 'order.tsx',
        },
        { notice: cartNotice(err(409, 'IDEMPOTENCY_KEY_EXPIRED')), code: 'order.tsx' },
        { notice: cartNotice(err(409, 'SELF_PURCHASE_NOT_ALLOWED'), { name: '오버핏 코튼 반팔 티셔츠' }), code: 'order.tsx' },
        { notice: cartNotice(err(409, 'PRICE_CHANGED')), code: 'order.tsx' },
        {
          notice: {
            title: '주문 결과를 확인하지 못했어요',
            body: '연결이 불안정해 주문이 만들어졌는지 확인하지 못했어요. 다시 시도해도 주문은 한 번만 만들어져요.',
            actions: [{ label: '장바구니로 가기' }, { label: '다시 시도', primary: true }],
          },
          code: 'CheckoutPage.tsx',
        },
        {
          notice: {
            title: '배송지를 입력해 주세요',
            body: '받는 분, 연락처, 주소는 꼭 입력해야 해요.',
            actions: [{ label: '확인', primary: true }],
          },
          code: 'CheckoutPage.tsx · 새 화면',
        },
        {
          notice: {
            title: '쿠폰을 쓸 수 없어요',
            body: '이미 사용했거나 다른 주문에 예약된 쿠폰입니다. 쿠폰을 뺐으니 금액을 확인하고 다시 결제해 주세요.',
            actions: [{ label: '확인', primary: true }],
          },
          code: 'CheckoutPage.tsx · 409 COUPON_* · 새 화면',
        },
      ],
    },
    {
      title: '결제할 때',
      desc: 'lib/notices/payment.tsx · pages/order/CheckoutPage',
      items: [
        {
          notice: {
            title: '72,900원을 결제할까요?',
            rows: [
              { label: '결제 수단', value: '예치금' },
              { label: '결제 후 남는 예치금', value: '27,100원' },
              { label: '결제 금액', value: '72,900원', strong: true },
            ],
            body: '결제한 뒤에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만 요청할 수 있어요.',
            actions: [{ label: '돌아가기' }, { label: '72,900원 결제하기', primary: true }],
          },
          code: 'CheckoutPage.tsx',
        },
        {
          notice: {
            title: '주문을 취소할까요?',
            body: '예약한 재고가 풀려요. 주문한 상품은 장바구니에 남아 있어서 다시 주문할 수 있어요.',
            actions: [{ label: '돌아가기' }, { label: '주문 취소하기', primary: true }],
          },
          code: 'CheckoutPage.tsx',
        },
        {
          notice: toTopupLinks(
            paymentNotice(
              err(402, 'INSUFFICIENT_BALANCE', { shortage: 18000, recommendedTopupAmount: 20000, remainingSeconds: 412 }),
              payCtx(),
            ),
          ),
          code: 'payment.tsx · CheckoutPage.tsx(부족 모달)',
        },
        { notice: EXPIRED, code: 'payment.tsx' },
        { notice: paymentNotice(err(500, 'INTERNAL_ERROR'), payCtx()), code: 'payment.tsx' },
        { notice: paymentNotice(err(409, 'PRODUCT_NOT_ON_SALE'), payCtx()), code: 'payment.tsx' },
        { notice: paymentNotice(err(409, 'ORDER_STATE_INVALID'), payCtx()), code: 'payment.tsx' },
      ],
    },
    {
      title: '예치금을 충전할 때',
      desc: 'lib/notices/topup.tsx',
      items: [
        { notice: topupNotice(err(400, 'TOPUP_AMOUNT_INVALID')), code: 'topup.tsx' },
        {
          notice: topupNotice(err(400, 'TOPUP_PAYMENT_DECLINED', { message: '한도가 초과되었습니다.' })),
          code: 'topup.tsx',
        },
        { notice: topupNotice(err(400, 'AMOUNT_MISMATCH')), code: 'topup.tsx' },
        { notice: topupNotice(err(502, 'EXTERNAL_SERVICE_ERROR')), code: 'topup.tsx' },
        { notice: topupStatusNotice('PROCESSING', null)!, code: 'topup.tsx' },
        { notice: topupNotice(err(409, 'TOPUP_ALREADY_PROCESSED')), code: 'topup.tsx' },
        { notice: topupNotice(err(409, 'TOPUP_ALREADY_USED')), code: 'topup.tsx' },
        { notice: topupCanceledNotice(), code: 'topup.tsx' },
        { notice: topupStatusNotice('READY', null)!, code: 'topup.tsx' },
        { notice: topupStatusNotice('FAILED_EXPIRED', null)!, code: 'topup.tsx · 충전' },
        { notice: orderExpiredAfterTopup(20000, 'ORD-20261009-0142'), code: 'topup.tsx' },
      ],
    },
    {
      title: '결제한 뒤',
      desc: 'lib/notices/order.tsx · pages/order/OrderListPage · OrderDetailPage',
      items: [
        {
          notice: {
            title: '구매를 확정할까요?',
            body: '확정한 뒤에는 반품을 요청할 수 없어요. 결제한 금액은 판매자에게 정산돼요.',
            actions: [{ label: '돌아가기' }, { label: '구매 확정하기', primary: true }],
          },
          code: 'OrderListPage.tsx · OrderDetailPage.tsx',
        },
        { notice: orderNotice(err(409, 'ORDER_NOT_CANCELABLE'), { status: 'CANCELED' }), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'ORDER_NOT_CANCELABLE'), { status: 'PAID' }), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'ORDER_NOT_CONFIRMABLE'), { status: 'RETURN_REQUESTED' }), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'ORDER_NOT_CONFIRMABLE'), { status: 'CONFIRMED' }), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'ORDER_NOT_CONFIRMABLE'), { status: 'CANCELED' }), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'RETURN_ALREADY_REQUESTED')), code: 'order.tsx' },
        { notice: orderNotice(err(409, 'ORDER_STATE_INVALID')), code: 'order.tsx' },
        { notice: orderNotice(err(404, 'ORDER_NOT_FOUND')), code: 'order.tsx' },
      ],
    },
  ]
}

/** 모음 화면에서는 버튼이 이동·실행하지 않게 모양만 남겨요 */
const inert = (n: Notice): Notice => ({ ...n, actions: n.actions.map((a) => ({ label: a.label, primary: a.primary })) })

/** 안내 모달 · 경고 문구 모음 (시안 Modals, 1440 보드). 실제 lib/notices 함수로 만든 모달이라 문구가 코드와 같아요 */
export default function ModalsPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.h1}>안내 모달 · 경고 문구</h1>
      <p className={styles.lead}>
        주문·결제 화면에서 실제로 띄우는 모달을 모았어요. 문구는 lib/notices 함수를 그대로 불러서 만들어요. 카드 아래 회색
        글씨는 문구가 들어 있는 파일이에요. 화면에서는 좌우 16px 여백 안에서 가운데 뜨고, 배경은 rgba(38,38,44,.56)로
        어둡게 깔려요.
      </p>
      {sections().map((sec) => (
        <section key={sec.title} className={styles.section}>
          <h2 className={styles.h2}>{sec.title}</h2>
          <p className={styles.desc}>{sec.desc}</p>
          <div className={styles.grid}>
            {sec.items.map((m, i) => (
              <div key={i} className={styles.cell}>
                <div role="dialog" aria-label={m.notice.title} className={styles.card}>
                  <NoticeCard notice={inert(m.notice)} />
                </div>
                <p className={styles.code}>{m.code}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      <section className={styles.section}>
        <h2 className={styles.h2}>화면 안 경고 문구</h2>
        <p className={styles.desc}>목록을 불러오지 못했을 때 팝업 대신 그 자리에 띄워요. 문구는 서버 오류 메시지를 그대로 보여 줘요.</p>
        <div className={styles.grid}>
          <p role="alert" className={styles.inline}>
            주문 내역 자리 · [서버가 보낸 오류 문구]
          </p>
          <p role="alert" className={styles.inline}>
            주문서 자리 · [서버가 보낸 오류 문구]
          </p>
          <p role="alert" className={styles.inline}>
            프로모션 코드 아래 · [쿠폰 검증 오류 문구]
          </p>
        </div>
      </section>
    </main>
  )
}
