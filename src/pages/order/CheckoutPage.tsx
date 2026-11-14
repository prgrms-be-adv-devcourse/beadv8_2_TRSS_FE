import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import PageHeader from '../../components/ui/PageHeader'
import f from '../../components/ui/form.module.css'
import { ApiError, errorMessage } from '../../lib/api'
import { getCart, type CartItem } from '../../lib/api/cart'
import { formatPostcodeAddress, loadPostcode } from '../../lib/postcode'
import { getCartCoupons, validateProductCoupon, type CartCoupon } from '../../lib/api/coupon'
import { cancelOrder, isPayable, newIdempotencyKey } from '../../lib/api/order'
import { getWallet } from '../../lib/api/wallet'
import { codeOf } from '../../lib/notices/common'
import { cartNotice, orderNotice } from '../../lib/notices/order'
import { EXPIRED, paymentNotice } from '../../lib/notices/payment'
import { productImage } from '../../lib/products'
import { useApi } from '../../lib/useApi'
import { mmss, useRemaining } from '../../lib/useRemaining'
import {
  createOrderX,
  getOrderDetail,
  payAmountOf,
  type OrderCreateBody,
  type OrderDetailX,
  type ShippingAddress,
} from './api'
import { NoticeModal, toTopupLinks, topupUrl, useProductThumbs, type Notice } from './common'
import type { ProgressState } from './PayPages'
import styles from './Checkout.module.css'
import { shippingFeeFor } from '../../lib/shipping'

/** 장바구니에서 넘겨주는 값 (CartPage의 order) */
type FromCart = { cartItemIds: number[]; expectedTotalPrice?: number; idempotencyKey?: string }
/** 결제 진행 화면에서 실패하고 돌아올 때 넘기는 오류 (router state라 글자·숫자만) */
export type PayErrorState = { status: number; resultCode: string; msg: string; data: unknown }
type CheckoutState = Partial<FromCart> & { payError?: PayErrorState; openShort?: boolean }

/** 응답을 받지 못해 주문이 만들어졌는지 모르는 경우 (네트워크 오류·서버 오류). 같은 키로 다시 시도해요 */
const isUnknownResult = (e: unknown) => e instanceof ApiError && (e.status === 0 || e.status >= 500)

/** 1만 원 단위로 올린 충전 금액 */
const roundUp = (n: number) => Math.ceil(n / 10000) * 10000

/**
 * 주문 결제 (시안 ⑥ Checkout · ⑥-1 CheckoutShort · ⑥-2 CheckoutModal · ⑥-5 CouponSheet)
 *
 * - 장바구니에서 오면(state: cartItemIds·idempotencyKey) 아직 주문이 없어요. 배송지·쿠폰을 고르고
 *   결제하기(또는 충전하고 결제하기)를 누를 때 주문을 만들어요. 쿠폰·배송지는 주문 생성 요청에만 넣을 수 있어서예요.
 *   주문을 만들면 URL을 /checkout?orderId=로 바꿔서, 새로고침해도 주문이 다시 만들어지지 않아요.
 * - /checkout?orderId=로 오면(주문 내역·주문 상세·예치금 충전 후) 만들어 둔 주문을 남은 시간 안에 결제해요.
 */
export default function CheckoutPage() {
  const [params] = useSearchParams()
  const location = useLocation()
  const orderId = Number(params.get('orderId')) || 0
  const state = (location.state as CheckoutState | null) ?? {}
  if (orderId) return <OrderCheckout key={orderId} orderId={orderId} />
  if (state.cartItemIds?.length) return <DraftCheckout from={state as FromCart} />
  return (
    <AppFrame>
      <PageHeader title="주문 결제" back="/cart" />
      <Empty
        title="주문할 상품이 없어요"
        action={
          <Button to="/cart" variant="outline">
            장바구니로 가기
          </Button>
        }
      >
        장바구니에서 상품을 골라 주문해 주세요.
      </Empty>
    </AppFrame>
  )
}

// ── 배송지 ─────────────────────────────────────────────

const MEMOS = ['선택 안 함', '문 앞에 놓아주세요', '경비실에 맡겨주세요', '배송 전에 연락주세요', '직접 입력']

type AddressForm = {
  name: string
  phone: string
  zip: string
  addr: string
  addr2: string
  memo: string
  memoText: string
}
const EMPTY_ADDRESS: AddressForm = { name: '', phone: '', zip: '', addr: '', addr2: '', memo: MEMOS[0], memoText: '' }

/** 입력 오류 (BE ShippingAddressRequest 검증과 같은 기준) */
function addressErrors(a: AddressForm) {
  const phone = a.phone.replace(/\D/g, '')
  return {
    name: !a.name.trim()
      ? '받는 분 이름을 입력해 주세요.'
      : a.name.trim().length > 50
        ? '50자까지 입력할 수 있어요.'
        : '',
    phone: !/^0\d{8,10}$/.test(phone) ? '연락처는 0으로 시작하는 숫자 9~11자리로 입력해 주세요.' : '',
    zip: !/^\d{5}$/.test(a.zip) ? '주소 검색으로 우편번호와 주소를 넣어 주세요.' : '',
    addr: !a.addr.trim() ? '주소 검색으로 우편번호와 주소를 넣어 주세요.' : '',
  }
}

function toShippingAddress(a: AddressForm): ShippingAddress {
  const memo = a.memo === '직접 입력' ? a.memoText.trim() : a.memo === MEMOS[0] ? '' : a.memo
  return {
    receiverName: a.name.trim(),
    receiverPhone: a.phone.replace(/\D/g, ''),
    zipCode: a.zip,
    address: a.addr.trim(),
    addressDetail: a.addr2.trim() || null,
    requestMessage: memo || null,
  }
}

/** "010-1234-5678" */
const phoneText = (n: string) => {
  const d = n.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return n
}

function AddressFormSection({
  value,
  onChange,
  showErrors,
}: {
  value: AddressForm
  onChange: (v: AddressForm) => void
  showErrors: boolean
}) {
  const [search, setSearch] = useState(false)
  const err = showErrors ? addressErrors(value) : { name: '', phone: '', zip: '', addr: '' }
  const set = (k: keyof AddressForm) => (e: { target: { value: string } }) =>
    onChange({ ...value, [k]: e.target.value })
  return (
    <section aria-labelledby="ship" className={styles.firstSection}>
      <div className={styles.sectionHead}>
        <h2 id="ship" className={styles.h2}>
          배송지 입력
        </h2>
        <span className={styles.reqNote}>
          <b>*</b> 필수
        </span>
      </div>
      <div className={styles.addrGrid}>
        <div className={styles.two}>
          <div>
            <label htmlFor="ship-name" className={styles.label}>
              받는 분 <b>*</b>
            </label>
            <input
              id="ship-name"
              className={f.input}
              autoComplete="name"
              placeholder="이름"
              maxLength={50}
              value={value.name}
              onChange={set('name')}
              aria-invalid={!!err.name}
            />
            {err.name && <p className={f.error}>{err.name}</p>}
          </div>
          <div>
            <label htmlFor="ship-tel" className={styles.label}>
              연락처 <b>*</b>
            </label>
            <input
              id="ship-tel"
              className={f.input}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="010-0000-0000"
              value={value.phone}
              onChange={set('phone')}
              aria-invalid={!!err.phone}
            />
            {err.phone && <p className={f.error}>{err.phone}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="ship-zip" className={styles.label}>
            주소 <b>*</b>
          </label>
          <div className={styles.zipRow}>
            <input
              id="ship-zip"
              className={`${f.input} ${f.soft}`}
              readOnly
              placeholder="우편번호"
              value={value.zip}
              aria-invalid={!!err.zip}
              onClick={() => setSearch(true)}
            />
            <Button onClick={() => setSearch(true)}>주소 검색</Button>
          </div>
          <label htmlFor="ship-addr1" className={styles.srOnly}>
            기본 주소
          </label>
          <input
            id="ship-addr1"
            className={`${f.input} ${f.soft} ${styles.mt8}`}
            readOnly
            placeholder="주소 검색으로 입력돼요"
            value={value.addr}
            onClick={() => setSearch(true)}
          />
          <label htmlFor="ship-addr2" className={styles.srOnly}>
            상세 주소
          </label>
          <input
            id="ship-addr2"
            className={`${f.input} ${styles.mt8}`}
            placeholder="상세 주소 (동·호수)"
            maxLength={200}
            value={value.addr2}
            onChange={set('addr2')}
          />
          {(err.zip || err.addr) && <p className={f.error}>{err.zip || err.addr}</p>}
        </div>
        <div>
          <label htmlFor="ship-memo" className={styles.label}>
            배송 요청사항
          </label>
          <select id="ship-memo" className={f.select} value={value.memo} onChange={set('memo')}>
            {MEMOS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          {value.memo === '직접 입력' && (
            <input
              aria-label="배송 요청사항 직접 입력"
              className={`${f.input} ${styles.mt8}`}
              placeholder="100자까지 입력할 수 있어요"
              maxLength={100}
              value={value.memoText}
              onChange={set('memoText')}
            />
          )}
        </div>
      </div>
      {search && (
        <AddressSearchSheet
          zip={value.zip}
          addr={value.addr}
          onClose={() => setSearch(false)}
          onPick={(zip, addr) => {
            onChange({ ...value, zip, addr })
            setSearch(false)
            // 기본 주소를 채운 뒤 상세 주소 칸으로 바로 옮겨요
            window.setTimeout(() => document.getElementById('ship-addr2')?.focus(), 0)
          }}
        />
      )}
    </section>
  )
}

/**
 * 주소 검색 시트: 다음(카카오) 우편번호 서비스를 시트 안에 펼쳐요.
 * 주소를 고르면 우편번호·기본 주소를 채우고 닫혀요. 서비스를 불러오지 못하면 직접 입력으로 바꿔요.
 */
function AddressSearchSheet({
  zip: z0,
  addr: a0,
  onClose,
  onPick,
}: {
  zip: string
  addr: string
  onClose: () => void
  onPick: (zip: string, addr: string) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const pickRef = useRef(onPick)
  pickRef.current = onPick
  const [failed, setFailed] = useState(false)
  const [zip, setZip] = useState(z0)
  const [addr, setAddr] = useState(a0)
  const ok = /^\d{5}$/.test(zip) && !!addr.trim()

  useEffect(() => {
    let alive = true
    loadPostcode()
      .then((Postcode) => {
        if (!alive || !boxRef.current) return
        new Postcode({
          width: '100%',
          height: '100%',
          animation: true,
          oncomplete: (d) => pickRef.current(d.zonecode, formatPostcodeAddress(d)),
        }).embed(boxRef.current, { autoClose: false })
      })
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  if (!failed)
    return (
      <Sheet title="주소 검색" onClose={onClose}>
        <div ref={boxRef} className={styles.postcode} aria-label="우편번호 검색" />
      </Sheet>
    )

  return (
    <Sheet
      title="주소 검색"
      onClose={onClose}
      footer={
        <Button size="lg" disabled={!ok} onClick={() => onPick(zip, addr.trim())}>
          이 주소로 입력하기
        </Button>
      }
    >
      <p className={f.help}>주소 검색을 불러오지 못했어요. 우편번호와 주소를 직접 입력해 주세요.</p>
      <div className={`${f.field} ${styles.mt14}`}>
        <label htmlFor="as-zip" className={f.label}>
          우편번호
        </label>
        <input
          id="as-zip"
          className={f.input}
          inputMode="numeric"
          maxLength={5}
          placeholder="숫자 5자리"
          value={zip}
          onChange={(e) => setZip(e.target.value.replace(/\D/g, ''))}
        />
      </div>
      <div className={f.field}>
        <label htmlFor="as-addr" className={f.label}>
          기본 주소
        </label>
        <input
          id="as-addr"
          className={f.input}
          maxLength={200}
          placeholder="도로명 주소"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
        />
      </div>
    </Sheet>
  )
}

function AddressReadOnly({ a }: { a: ShippingAddress | null | undefined }) {
  return (
    <section aria-labelledby="ship" className={styles.firstSection}>
      <h2 id="ship" className={styles.h2}>
        배송지
      </h2>
      {a ? (
        <div className={styles.addrBox}>
          <b>
            {a.receiverName} · {phoneText(a.receiverPhone)}
          </b>
          <span>
            ({a.zipCode}) {a.address}
            {a.addressDetail ? ` ${a.addressDetail}` : ''}
          </span>
          {a.requestMessage && <span className={styles.muted}>{a.requestMessage}</span>}
        </div>
      ) : (
        <p className={styles.mutedP}>배송지 없이 만든 주문이에요.</p>
      )}
      <p className={styles.mutedP}>주문을 만든 뒤에는 배송지를 바꿀 수 없어요.</p>
    </section>
  )
}

// ── 주문 상품 ───────────────────────────────────────────

type Row = {
  key: number
  img: string | null
  name: string
  option: string
  qty: number
  line: number
  discount?: number
}

function ItemsSection({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false)
  return (
    <section aria-labelledby="items" className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 id="items" className={styles.h2}>
          주문 상품 {rows.length}개
        </h2>
        <button type="button" className={styles.fold} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '접기 ⌃' : '펼치기 ⌄'}
        </button>
      </div>
      {open ? (
        <ul className={styles.itemList}>
          {rows.map((r) => (
            <li key={r.key}>
              <Thumb src={r.img} alt="" width={52} height={52} radius={6} />
              <div>
                <p className={styles.itemName}>{r.name}</p>
                <p className={styles.muted}>
                  {r.option ? `${r.option} · ` : ''}
                  {r.qty}개
                </p>
              </div>
              <div className={styles.itemPrice}>
                <b>{won(r.line)}</b>
                {!!r.discount && <span>−{won(r.discount)}</span>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.thumbRow}>
          {rows.map((r) => (
            <Thumb key={r.key} src={r.img} alt={r.name} width={52} height={52} radius={6} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── 금액 ───────────────────────────────────────────────

function AmountList({
  subtotal,
  couponDiscount,
  promoDiscount,
  shipping,
  pay,
}: {
  subtotal: number
  couponDiscount: number
  promoDiscount: number
  shipping: number
  pay: number
}) {
  return (
    <dl className={styles.amounts}>
      <div>
        <dt>상품 금액</dt>
        <dd>{won(subtotal)}</dd>
      </div>
      <div>
        <dt>쿠폰 할인</dt>
        <dd className={couponDiscount ? styles.minus : styles.zero}>
          {couponDiscount ? `−${won(couponDiscount)}` : '0원'}
        </dd>
      </div>
      <div>
        <dt>프로모션 할인</dt>
        <dd className={promoDiscount ? styles.minus : styles.zero}>
          {promoDiscount ? `−${won(promoDiscount)}` : '0원'}
        </dd>
      </div>
      <div>
        <dt>배송비</dt>
        {shipping ? <dd>{won(shipping)}</dd> : <dd className={styles.free}>무료</dd>}
      </div>
      <div className={styles.total}>
        <dt>결제 금액</dt>
        <dd>{won(pay)}</dd>
      </div>
    </dl>
  )
}

/** 결제 수단 (예치금 보유·부족) */
function PaySection({
  balance,
  pay,
  walletReady,
  otherTopupUrl,
  children,
}: {
  balance: number
  pay: number
  walletReady: boolean
  /** 부족할 때 '다른 금액으로 충전하기' 주소. 주문이 아직 없으면 null */
  otherTopupUrl: string | null
  children?: ReactNode
}) {
  const short = walletReady && balance < pay
  const gap = Math.max(0, pay - balance)
  return (
    <section aria-labelledby="pay" className={styles.section}>
      <h2 id="pay" className={`${styles.h2} ${styles.mb12}`}>
        결제 수단
      </h2>
      {!walletReady ? (
        <p className={styles.mutedP}>예치금을 불러오고 있어요.</p>
      ) : !short ? (
        <>
          <div role="radio" aria-checked="true" className={styles.method}>
            <span aria-hidden="true" className={styles.radioOn} />
            <b>예치금</b>
            <span>{won(balance)} 보유</span>
          </div>
          <dl className={styles.amounts}>
            <div>
              <dt>보유 예치금</dt>
              <dd>{won(balance)}</dd>
            </div>
            <div>
              <dt>결제할 금액</dt>
              <dd>−{won(pay)}</dd>
            </div>
            <div className={styles.totalSmall}>
              <dt>결제 후 잔액</dt>
              <dd>{won(balance - pay)}</dd>
            </div>
          </dl>
        </>
      ) : (
        <>
          <dl className={styles.amounts}>
            <div>
              <dt>보유 예치금</dt>
              <dd>{won(balance)}</dd>
            </div>
            <div>
              <dt>결제할 금액</dt>
              <dd>{won(pay)}</dd>
            </div>
            <div className={styles.totalSmall}>
              <dt>부족한 금액</dt>
              <dd className={styles.red}>{won(gap)}</dd>
            </div>
          </dl>
          <p className={styles.shortText}>
            부족한 금액을 1만 원 단위로 올려 <b>{won(roundUp(gap))}</b>을 충전해요. 충전이 끝나면 이 주문서로 돌아와요.
          </p>
          {otherTopupUrl && (
            <Link to={otherTopupUrl} className={styles.underline}>
              다른 금액으로 충전하기
            </Link>
          )}
        </>
      )}
      <p className={styles.keepNote}>
        결제한 금액은 구매 확정 전까지 팔레트가 보관해요. 결제 후에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만
        요청할 수 있어요.
      </p>
      {children}
    </section>
  )
}

/** 결제 확인 모달 (시안 Modals "72,900원을 결제할까요?") */
const confirmNotice = (pay: number, balance: number, onPay: () => void): Notice => ({
  title: `${won(pay)}을 결제할까요?`,
  rows: [
    { label: '결제 수단', value: '예치금' },
    { label: '결제 후 남는 예치금', value: won(Math.max(0, balance - pay)) },
    { label: '결제 금액', value: won(pay), strong: true },
  ],
  body: '결제한 뒤에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만 요청할 수 있어요.',
  actions: [{ label: '돌아가기' }, { label: `${won(pay)} 결제하기`, primary: true, onClick: onPay }],
})

/** 예치금 부족 모달 (⑥-2 CheckoutModal) */
const shortNotice = (o: OrderDetailX, balance: number, until: number): Notice => {
  const pay = payAmountOf(o)
  const gap = Math.max(0, pay - balance)
  return {
    title: `예치금이 ${won(gap)} 모자라요`,
    countdown: { label: '결제 가능 시간', until },
    rows: [
      { label: '결제할 금액', value: won(pay) },
      { label: '내 예치금', value: won(balance) },
      { label: '모자란 금액', value: won(gap) },
      { label: '충전할 금액', value: won(roundUp(gap)), strong: true },
    ],
    body: '충전하면 이 주문을 그대로 결제할 수 있어요. 충전 금액은 10,000원 단위로 올려 계산했어요.',
    actions: [
      { label: '나중에 하기' },
      { label: `${won(roundUp(gap))} 충전하기`, to: topupUrl(o.orderId, o.orderNumber, gap), primary: true },
    ],
  }
}

// ── 쿠폰 ───────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0')
const mmdd = (s: string) => {
  const d = new Date(s)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/**
 * 장바구니 쿠폰 할인액. 백엔드와 같이 '상품 쿠폰 할인 후 상품 금액 합계'가 넘는 구간 중 가장 높은 구간 하나만 적용해요.
 * (GET /coupons/cart의 expectedDiscountAmount는 상품 쿠폰을 빼기 전 금액 기준이라 직접 계산해요)
 */
function cartCouponDiscount(c: CartCoupon, base: number) {
  if (c.used || c.soldOut) return 0
  const now = Date.now()
  if (new Date(c.validFrom).getTime() > now || new Date(c.validUntil).getTime() <= now) return 0
  const tier = [...c.tiers].reverse().find((t) => base >= t.minOrderAmount)
  return tier ? Math.min(tier.discountAmount, base) : 0
}

function couponOffReason(c: CartCoupon, base: number) {
  if (c.used) return '이미 썼거나 다른 주문에 예약된 쿠폰이에요'
  if (c.soldOut) return '쿠폰이 모두 소진됐어요'
  if (new Date(c.validFrom).getTime() > Date.now()) return `${mmdd(c.validFrom)}부터 쓸 수 있어요`
  const min = c.tiers[0]?.minOrderAmount ?? 0
  if (base < min) return `상품 금액이 ${won(min)} 이상일 때 쓸 수 있어요`
  return '이 주문에 쓸 수 없는 쿠폰이에요'
}

function CouponSheet({
  coupons,
  loading,
  error,
  base,
  selected,
  onClose,
  onApply,
}: {
  coupons: CartCoupon[]
  loading: boolean
  error: string | null
  base: number
  selected: number | null
  onClose: () => void
  onApply: (couponId: number | null) => void
}) {
  const [sel, setSel] = useState<number | null>(selected)
  const picked = coupons.find((c) => c.couponId === sel)
  const save = picked ? cartCouponDiscount(picked, base) : 0
  return (
    <Sheet
      title={
        <>
          쿠폰 선택 <span className={styles.sheetCount}>보유 {coupons.length}장</span>
        </>
      }
      onClose={onClose}
      footer={
        <Button size="lg" onClick={() => onApply(save > 0 ? sel : null)}>
          {save > 0 ? `${won(save)} 할인 적용하기` : '쿠폰 없이 결제하기'}
        </Button>
      }
    >
      {loading && <Loading label="쿠폰을 불러오고 있어요" />}
      {error && <ErrorView message={error} />}
      <div role="radiogroup" aria-label="내 쿠폰" className={styles.couponList}>
        {coupons.map((c) => {
          const d = cartCouponDiscount(c, base)
          const off = d === 0
          const on = sel === c.couponId
          const max = c.tiers.length ? c.tiers[c.tiers.length - 1].discountAmount : 0
          return (
            <button
              key={c.couponId}
              type="button"
              role="radio"
              aria-checked={on}
              aria-disabled={off}
              className={`${styles.coupon} ${off ? styles.couponOff : on ? styles.couponOn : ''}`}
              onClick={() => !off && setSel(c.couponId)}
            >
              <span className={on ? styles.dotOn : styles.dot} />
              <span className={styles.couponText}>
                <span className={styles.couponAmount}>{off ? `최대 ${won(max)}` : won(d)}</span>
                <span className={styles.couponName}>{c.name}</span>
                <span className={styles.couponCond}>
                  {c.tiers.map((t) => `${won(t.minOrderAmount)} 이상 ${won(t.discountAmount)}`).join(' · ')} ·{' '}
                  {mmdd(c.validUntil)}까지
                </span>
                {off && <span className={styles.couponReason}>{couponOffReason(c, base)}</span>}
              </span>
            </button>
          )
        })}
        <button
          type="button"
          role="radio"
          aria-checked={sel === null}
          className={`${styles.coupon} ${styles.couponNone} ${sel === null ? styles.couponOn : ''}`}
          onClick={() => setSel(null)}
        >
          <span className={sel === null ? styles.dotOn : styles.dot} />
          쿠폰 사용 안 함
        </button>
      </div>
    </Sheet>
  )
}

// ── 장바구니에서 온 주문서 (주문 생성 전) ─────────────────

type ProductCouponPick = { cartItemId: number; code: string; name: string; discount: number }

function DraftCheckout({ from }: { from: FromCart }) {
  const navigate = useNavigate()
  const idsKey = from.cartItemIds.join(',')
  const cart = useApi(getCart, [])
  const wallet = useApi(getWallet, [])
  const coupons = useApi(() => getCartCoupons(idsKey.split(',').map(Number)), [idsKey])

  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS)
  const [showErrors, setShowErrors] = useState(false)
  const [couponId, setCouponId] = useState<number | null>(null)
  const [couponSheet, setCouponSheet] = useState(false)
  const [promo, setPromo] = useState('')
  const [promoError, setPromoError] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [productCoupon, setProductCoupon] = useState<ProductCouponPick | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  // 멱등 키는 장바구니에서 받은 값을 써요. 응답 전에 새로고침하거나 다시 시도해도 같은 키라 주문은 한 건만 생겨요
  const idempotencyKey = useRef(from.idempotencyKey || newIdempotencyKey())

  const items: CartItem[] = (cart.data?.items ?? []).filter((i) => from.cartItemIds.includes(i.itemId))
  const blocked = items.some((i) => !i.orderable)
  const subtotal = items.reduce((s, i) => s + i.lineAmount, 0)
  const productDisc = productCoupon?.discount ?? 0
  const base = subtotal - productDisc
  const selectedCoupon = coupons.data?.coupons.find((c) => c.couponId === couponId) ?? null
  const cartDisc = selectedCoupon ? cartCouponDiscount(selectedCoupon, base) : 0
  /** 쿠폰 할인 후 금액 (배송비 제외) — 주문 생성 때 expectedTotalPrice로 보내요 */
  const payBeforeShipping = Math.max(0, base - cartDisc)
  /** 배송비: 상품 쿠폰 할인 후 상품 금액(base) 기준. 장바구니 쿠폰은 기준에 영향 없어요 */
  const shipping = items.some((i) => i.orderable) ? shippingFeeFor(base) : 0
  const pay = payBeforeShipping + shipping
  const balance = wallet.data?.balance ?? 0
  const short = !!wallet.data && balance < pay
  const usable = (coupons.data?.coupons ?? []).filter((c) => cartCouponDiscount(c, base) > 0).length

  /** 프로모션 코드(상품 쿠폰): 주문 상품 중 그 쿠폰을 쓸 수 있는 항목을 찾아요 */
  async function applyPromo() {
    const code = promo.trim().toUpperCase()
    if (!code || promoBusy) return
    setPromoBusy(true)
    setPromoError('')
    const errors: unknown[] = []
    try {
      for (const it of items.filter((i) => i.orderable)) {
        try {
          const v = await validateProductCoupon(code, it.itemId)
          setProductCoupon({ cartItemId: it.itemId, code, name: v.couponName, discount: v.expectedDiscountAmount })
          setPromo('')
          return
        } catch (e) {
          errors.push(e)
          // 상품이 달라서 못 쓰는 경우만 다음 항목으로 넘어가요
          if (codeOf(e) !== 'COUPON_NOT_APPLICABLE') break
        }
      }
      const e = errors.find((x) => codeOf(x) !== 'COUPON_NOT_APPLICABLE') ?? errors[0]
      setPromoError(e ? errorMessage(e) : '쿠폰을 확인하지 못했어요.')
    } finally {
      setPromoBusy(false)
    }
  }

  function create(next: 'pay' | 'topup', renewed = false) {
    const body: OrderCreateBody = {
      cartItemIds: items.map((i) => i.itemId),
      expectedTotalPrice: payBeforeShipping,
      shippingAddress: toShippingAddress(address),
      ...(productCoupon
        ? { productCoupons: [{ cartItemId: productCoupon.cartItemId, code: productCoupon.code }] }
        : {}),
      ...(cartDisc > 0 && couponId ? { cartCouponId: couponId } : {}),
    }
    setBusy(true)
    createOrderX(body, idempotencyKey.current)
      .then((r) => {
        // 주문서 주소를 ?orderId=로 바꿔서 뒤로 오거나 새로고침해도 주문이 다시 만들어지지 않게 해요
        if (next === 'pay') {
          navigate(`/checkout?orderId=${r.orderId}`, { replace: true })
          const s: ProgressState = {
            orderId: r.orderId,
            orderNumber: r.orderNumber,
            amount: r.payAmount ?? r.totalPrice,
            balance,
          }
          navigate('/checkout/progress', { state: s })
        } else {
          navigate(`/checkout?orderId=${r.orderId}`, { replace: true, state: { openShort: true } })
        }
      })
      .catch((e) => {
        setBusy(false)
        // 이 키로 만든 주문이 이미 취소됐으면 새 키로 한 번만 다시 만들어요. 새로고침해도 새 키를 쓰게 화면 상태에도 남겨요
        if (codeOf(e) === 'IDEMPOTENCY_KEY_EXPIRED' && !renewed) {
          idempotencyKey.current = newIdempotencyKey()
          navigate('/checkout', { replace: true, state: { ...from, idempotencyKey: idempotencyKey.current } })
          create(next, true)
          return
        }
        if (isUnknownResult(e)) {
          setNotice({
            title: '주문 결과를 확인하지 못했어요',
            body: '연결이 불안정해 주문이 만들어졌는지 확인하지 못했어요. 다시 시도해도 주문은 한 번만 만들어져요.',
            actions: [
              { label: '장바구니로 가기', to: '/cart' },
              { label: '다시 시도', primary: true, onClick: () => create(next, renewed) },
            ],
          })
          return
        }
        const code = codeOf(e)
        if (code === 'ORDER_COUPON_NOT_AVAILABLE' || code.startsWith('COUPON_')) {
          setProductCoupon(null)
          setCouponId(null)
          coupons.reload()
          setNotice({
            title: code === 'ORDER_COUPON_NOT_AVAILABLE' ? '지금은 쿠폰을 쓸 수 없어요' : '쿠폰을 쓸 수 없어요',
            body: `${errorMessage(e)} 쿠폰을 뺐으니 금액을 확인하고 다시 결제해 주세요.`,
            actions: [{ label: '확인', primary: true }],
          })
          return
        }
        if (code === 'PRICE_CHANGED') {
          cart.reload()
          coupons.reload()
        }
        const n = cartNotice(e)
        // 주문이 만들어지지 않았으니 장바구니에서 고칠 수 있게 해요
        setNotice({
          ...n,
          actions: n.actions.some((a) => a.to)
            ? n.actions
            : [{ label: '닫기' }, { label: '장바구니로 가기', to: '/cart', primary: true }],
        })
      })
  }

  function submit(next: 'pay' | 'topup') {
    if (busy) return
    const err = addressErrors(address)
    if (Object.values(err).some(Boolean)) {
      setShowErrors(true)
      setNotice({
        title: '배송지를 입력해 주세요',
        body: '받는 분, 연락처, 주소는 꼭 입력해야 해요.',
        actions: [{ label: '확인', primary: true }],
      })
      return
    }
    if (next === 'pay') setNotice(confirmNotice(pay, balance, () => create('pay')))
    else create('topup')
  }

  const rows: Row[] = items.map((i) => ({
    key: i.itemId,
    img: i.thumbnailUrl || productImage(i.productName ?? '') || null,
    name: i.productName ?? '판매하지 않는 상품',
    option: i.optionName ?? '',
    qty: i.quantity,
    line: i.lineAmount,
    discount: productCoupon?.cartItemId === i.itemId ? productDisc : 0,
  }))

  const loading = cart.loading && !cart.data
  const empty = !!cart.data && items.length === 0
  const bottom =
    !loading && !empty ? (
      <BottomBar>
        {short ? (
          <Button size="lg" onClick={() => submit('topup')} disabled={busy || blocked}>
            {won(roundUp(pay - balance))} 충전하고 결제하기
          </Button>
        ) : (
          <Button size="lg" onClick={() => submit('pay')} disabled={busy || blocked || !wallet.data}>
            {won(pay)} 결제하기
          </Button>
        )}
      </BottomBar>
    ) : undefined

  return (
    <AppFrame bottom={bottom}>
      <PageHeader title="주문 결제" back="/cart" />
      {loading && <Loading label="주문서를 준비하고 있어요" />}
      {cart.error && !cart.data && <ErrorView message={cart.error} onRetry={cart.reload} />}
      {empty && (
        <Empty
          title="주문할 상품이 없어요"
          action={
            <Button to="/cart" variant="outline">
              장바구니로 가기
            </Button>
          }
        >
          다른 화면에서 장바구니를 바꿨어요. 장바구니에서 다시 골라 주세요.
        </Empty>
      )}
      {!loading && !empty && cart.data && (
        <div className={styles.page}>
          <div className={styles.timerBox}>
            <div className={styles.timerHead}>
              <span className={styles.timerIcon}>
                <Icon name="clock" size={15} />
              </span>
              <span className={styles.timerText}>
                <b>결제 가능 시간</b>
                <span>결제하기를 누르면 15분 동안 상품이 예약돼요</span>
              </span>
              <b className={styles.timerClock}>15:00</b>
            </div>
          </div>
          {blocked && (
            <p role="alert" className={styles.alert}>
              주문할 수 없는 상품이 있어요. <Link to="/cart">장바구니</Link>에서 확인해 주세요
            </p>
          )}
          <AddressFormSection value={address} onChange={setAddress} showErrors={showErrors} />
          <ItemsSection rows={rows} />
          <section aria-labelledby="disc" className={styles.section}>
            <h2 id="disc" className={`${styles.h2} ${styles.mb12}`}>
              할인
            </h2>
            <button type="button" className={styles.couponBtn} onClick={() => setCouponSheet(true)}>
              <Icon name="sparkle" size={20} />
              <span className={styles.couponLabel}>쿠폰</span>
              {selectedCoupon && cartDisc > 0 ? (
                <span>
                  {selectedCoupon.name} <b>−{won(cartDisc)}</b>
                </span>
              ) : (
                <span>
                  사용 가능 <b>{usable}장</b>
                </span>
              )}
              <Icon name="chevron" size={16} />
            </button>
            <label htmlFor="promo" className={`${styles.label} ${styles.mt14}`}>
              프로모션 코드
            </label>
            {productCoupon ? (
              <div className={styles.promoApplied}>
                <span>
                  <b>{productCoupon.name}</b> ({productCoupon.code}) −{won(productCoupon.discount)}
                </span>
                <button type="button" className={styles.textBtn} onClick={() => setProductCoupon(null)}>
                  해제
                </button>
              </div>
            ) : (
              <>
                <div className={styles.promoRow}>
                  <input
                    id="promo"
                    className={`${f.input} ${styles.promoInput}`}
                    autoCapitalize="characters"
                    placeholder="코드를 입력해 주세요"
                    maxLength={20}
                    value={promo}
                    onChange={(e) => {
                      setPromo(e.target.value)
                      setPromoError('')
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                    aria-invalid={!!promoError}
                  />
                  <Button variant="outline" onClick={applyPromo} disabled={!promo.trim() || promoBusy}>
                    적용
                  </Button>
                </div>
                {promoError && <p className={f.error}>{promoError}</p>}
              </>
            )}
            <AmountList
              subtotal={subtotal}
              couponDiscount={cartDisc}
              promoDiscount={productDisc}
              shipping={shipping}
              pay={pay}
            />
          </section>
          <PaySection balance={balance} pay={pay} walletReady={!!wallet.data} otherTopupUrl={null} />
        </div>
      )}
      {couponSheet && (
        <CouponSheet
          coupons={coupons.data?.coupons ?? []}
          loading={coupons.loading && !coupons.data}
          error={coupons.error}
          base={base}
          selected={couponId}
          onClose={() => setCouponSheet(false)}
          onApply={(id) => {
            setCouponId(id)
            setCouponSheet(false)
          }}
        />
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}

// ── 만들어 둔 주문 결제 (/checkout?orderId=) ──────────────

function OrderCheckout({ orderId }: { orderId: number }) {
  const navigate = useNavigate()
  const location = useLocation()
  const order = useApi(() => getOrderDetail(orderId), [orderId])
  const wallet = useApi(getWallet, [])
  const o = order.data
  const remaining = useRemaining(o)
  const thumbOf = useProductThumbs(o?.items ?? [])
  const [notice, setNotice] = useState<Notice | null>(null)
  const [busy, setBusy] = useState(false)

  // 결제 진행 화면에서 실패해 돌아왔거나(payError), 충전하고 결제하기로 주문을 막 만들었으면(openShort) 한 번만 모달을 띄워요
  const arrived = useRef((location.state as CheckoutState | null) ?? {})
  const pendingArrival = !!(arrived.current.payError || arrived.current.openShort)

  const pay = o ? payAmountOf(o) : 0
  const balance = wallet.data?.balance ?? 0
  const gap = Math.max(0, pay - balance)
  const expired = !!o && remaining === 0
  const short = !!wallet.data && gap > 0
  /** 결제 가능 시간 전체(초). 남은 시간 막대 길이에 써요 */
  const limit = o ? Math.max(1, (new Date(o.expiresAt).getTime() - new Date(o.orderedAt).getTime()) / 1000) : 1

  async function cancel() {
    if (!o || busy) return
    setBusy(true)
    try {
      await cancelOrder(o.orderId)
      navigate('/cart', { replace: true })
    } catch (e) {
      setNotice(orderNotice(e, { status: o.status }))
      order.reload()
    } finally {
      setBusy(false)
    }
  }

  const startPay = () => {
    if (!o) return
    const s: ProgressState = { orderId: o.orderId, orderNumber: o.orderNumber, amount: pay, balance }
    navigate('/checkout/progress', { state: s })
  }
  const openConfirm = () => setNotice(confirmNotice(pay, balance, startPay))

  useEffect(() => {
    if (!o || !wallet.data || !pendingArrival) return
    const { payError, openShort } = arrived.current
    arrived.current = {}
    navigate(`/checkout?orderId=${o.orderId}`, { replace: true, state: null })
    const until = Date.now() + remaining * 1000
    if (payError) {
      const e = new ApiError(payError.status, payError.resultCode, payError.msg, payError.data ?? null)
      setNotice(
        toTopupLinks(
          paymentNotice(e, {
            orderId: o.orderId,
            orderNumber: o.orderNumber,
            total: payAmountOf(o),
            until,
            productName: o.items.length === 1 ? o.items[0].productName : undefined,
            onCancel: cancel,
            // 남은 시간이 있으면 결제 확인 모달을 다시 열어요
            onRetry: () => (Date.now() < until ? openConfirm() : setNotice(EXPIRED)),
          }),
        ),
      )
    } else if (openShort && isPayable(o.status) && remaining > 0 && wallet.data.balance < payAmountOf(o)) {
      setNotice(shortNotice(o, wallet.data.balance, until))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o, wallet.data])

  // 결제할 수 없는 주문(결제 완료·취소 등)이면 주문 상세로 보내요. 안내 모달이 떠 있거나 띄울 예정이면 기다려요
  useEffect(() => {
    if (o && !isPayable(o.status) && !notice && !pendingArrival) navigate(`/orders/${o.orderId}`, { replace: true })
  }, [o, notice, pendingArrival, navigate])

  const ready = !!o && isPayable(o.status)
  const productDisc = o?.productDiscountAmount ?? 0
  const cartDisc = o?.cartCouponDiscountAmount ?? 0

  let bottom: ReactNode = undefined
  if (ready) {
    bottom = (
      <BottomBar>
        {expired ? (
          <Button size="lg" to="/cart">
            장바구니에서 다시 주문하기
          </Button>
        ) : short ? (
          <Button size="lg" onClick={() => setNotice(shortNotice(o, balance, Date.now() + remaining * 1000))}>
            {won(roundUp(gap))} 충전하고 결제하기
          </Button>
        ) : (
          <Button size="lg" onClick={openConfirm} disabled={!wallet.data || busy}>
            {won(pay)} 결제하기
          </Button>
        )}
      </BottomBar>
    )
  }

  return (
    <AppFrame bottom={bottom}>
      <PageHeader title="주문 결제" back="/cart" />
      {order.loading && !o && <Loading label="주문서를 불러오고 있어요" />}
      {order.error && !o && <ErrorView message={order.error} onRetry={order.reload} />}
      {ready && (
        <div className={styles.page}>
          <div
            className={`${styles.timerBox} ${expired ? styles.timerExpired : remaining <= 180 ? styles.timerLow : ''}`}
          >
            {expired ? (
              <div className={styles.timerHead}>
                <span className={styles.timerIcon}>
                  <Icon name="clock" size={15} />
                </span>
                <span className={styles.timerText}>
                  <b>결제 시간이 지났어요</b>
                  <span>주문이 취소되고 예약한 재고가 풀렸어요. 장바구니에서 다시 주문해 주세요</span>
                </span>
                <b className={styles.timerClock}>00:00</b>
              </div>
            ) : (
              <>
                <div className={styles.timerHead}>
                  <span className={styles.timerIcon}>
                    <Icon name="clock" size={15} />
                  </span>
                  <span className={styles.timerText}>
                    <b>결제 가능 시간</b>
                    <span>
                      {remaining <= 180
                        ? '곧 주문이 취소돼요. 서둘러 결제해 주세요'
                        : '시간 안에 결제하지 않으면 주문이 취소돼요'}
                    </span>
                  </span>
                  <b role="timer" className={styles.timerClock}>
                    {mmss(remaining)}
                  </b>
                </div>
                <div
                  role="progressbar"
                  aria-label="남은 결제 시간"
                  aria-valuenow={Math.round((remaining / limit) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className={styles.bar}
                >
                  <div style={{ width: `${Math.min(100, (remaining / limit) * 100)}%` }} />
                </div>
              </>
            )}
            <p className={styles.orderNo}>주문번호 {o.orderNumber}</p>
          </div>
          <AddressReadOnly a={o.shippingAddress} />
          <ItemsSection
            rows={o.items.map((r) => ({
              key: r.orderItemId,
              img: thumbOf(r),
              name: r.productName,
              option: r.optionName,
              qty: r.quantity,
              line: r.lineAmount,
              discount: r.discountAmount ?? 0,
            }))}
          />
          <section aria-labelledby="disc" className={styles.section}>
            <h2 id="disc" className={`${styles.h2} ${styles.mb12}`}>
              할인
            </h2>
            <p className={styles.mutedP}>
              {productDisc || cartDisc ? '주문할 때 고른 쿠폰이 적용돼 있어요.' : '쿠폰 없이 만든 주문이에요.'} 주문을
              만든 뒤에는 쿠폰을 바꿀 수 없어요.
            </p>
            <AmountList
              subtotal={o.totalPrice}
              couponDiscount={cartDisc}
              promoDiscount={productDisc}
              shipping={o.shippingFee ?? 0}
              pay={pay}
            />
          </section>
          <PaySection
            balance={balance}
            pay={pay}
            walletReady={!!wallet.data}
            otherTopupUrl={topupUrl(o.orderId, o.orderNumber, gap)}
          >
            {!expired && (
              <button
                type="button"
                className={styles.cancel}
                disabled={busy}
                onClick={() =>
                  setNotice({
                    title: '주문을 취소할까요?',
                    body: '예약한 재고가 풀려요. 주문한 상품은 장바구니에 남아 있어서 다시 주문할 수 있어요.',
                    actions: [{ label: '돌아가기' }, { label: '주문 취소하기', primary: true, onClick: cancel }],
                  })
                }
              >
                주문 취소하기
              </button>
            )}
          </PaySection>
        </div>
      )}
      <NoticeModal notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}
