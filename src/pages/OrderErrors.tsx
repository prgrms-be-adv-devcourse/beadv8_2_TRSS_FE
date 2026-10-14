import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './OrderErrors.module.css'

const cx = makeCx(styles)

/** 주문 결제 안내 */
export default function OrderErrorsPage() {
  return (
    <div className={styles.page}>
      <div
        style={{ background: 'rgba(38,38,44,.72)', minHeight: '3400px', padding: '48px 32px', boxSizing: 'border-box' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '48px' }}>
          <h1 style={{ margin: '0', color: '#fff', fontSize: '24px', fontWeight: '700' }}>
            주문하거나 결제할 때 뜨는 안내
          </h1>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>
                장바구니에 담거나 주문할 때
              </h2>
              <p style={{ margin: '4px 0 0', color: '#D5D5DD', fontSize: '14px' }}>
                가격·재고·판매 상태를 다시 확인해요
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
                gap: '32px 28px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 PRICE_CHANGED
                </span>
                <section
                  role="dialog"
                  aria-label="가격이 바뀐 상품이 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>가격이 바뀐 상품이 있어요</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                    <span>시카 리페어 크림 50ml</span>
                    <span className={cx('num')}>
                      <s className={cx('sub')}>24,000원</s> <strong>27,000원</strong>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px solid #E8E8ED',
                      paddingTop: '12px',
                    }}
                  >
                    <span>바뀐 결제 금액</span>
                    <strong className={cx('num')}>72,900원</strong>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/cart">
                      장바구니로
                    </Link>
                    <Link className={cx('btn btn-p')} to="/checkout">
                      바뀐 금액으로 주문하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 OUT_OF_STOCK
                </span>
                <section
                  role="dialog"
                  aria-label="재고가 모자라요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>재고가 모자라요</h3>
                  <p style={{ margin: '0' }}>
                    시카 리페어 크림 50ml는 지금 <strong className={cx('num')}>1개</strong>까지 주문할 수 있어요. 수량을
                    줄인 뒤 다시 주문해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      수량 바꾸기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 STOCK_EXCEEDED
                </span>
                <section
                  role="dialog"
                  aria-label="담을 수 있는 수량을 넘었어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>담을 수 있는 수량을 넘었어요</h3>
                  <p style={{ margin: '0' }}>
                    시카 리페어 크림 50ml는 지금 재고가 <strong className={cx('num')}>3개</strong>라 3개까지 담을 수
                    있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 VALIDATION_FAILED · quantity
                </span>
                <section
                  role="dialog"
                  aria-label="수량은 1개부터 99개까지 담을 수 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    수량은 1개부터 99개까지 담을 수 있어요
                  </h3>
                  <p style={{ margin: '0' }}>
                    한 상품은 장바구니에 최대 99개까지 담을 수 있어요. 수량을 다시 정해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 PRODUCT_NOT_ON_SALE · 품절
                </span>
                <section
                  role="dialog"
                  aria-label="품절된 상품이에요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>품절된 상품이에요</h3>
                  <p style={{ margin: '0' }}>
                    진정 마스크팩 10매는 지금 재고가 없어요. 재고가 다시 들어오면 담을 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 PRODUCT_NOT_ON_SALE
                </span>
                <section
                  role="dialog"
                  aria-label="판매하지 않는 상품이 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>판매하지 않는 상품이 있어요</h3>
                  <p style={{ margin: '0' }}>
                    비타민 브라이트닝 세럼 30ml는 판매가 중지됐어요. 장바구니에서 빼고 다시 주문해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      장바구니로
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 CART_ITEM_IN_PENDING_ORDER
                </span>
                <section
                  role="dialog"
                  aria-label="결제를 기다리는 주문이 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>결제를 기다리는 주문이 있어요</h3>
                  <p style={{ margin: '0' }}>
                    순한 아미노 클렌징폼 150ml는 주문 <span className={cx('num')}>ORD-20261009-0142</span>에 들어
                    있어요. 그 주문을 결제하거나 취소한 뒤 다시 주문할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/cart">
                      닫기
                    </Link>
                    <Link className={cx('btn btn-p')} to="/checkout">
                      그 주문 보기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 SELF_PURCHASE_NOT_ALLOWED
                </span>
                <section
                  role="dialog"
                  aria-label="내 상품은 주문할 수 없어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>내 상품은 주문할 수 없어요</h3>
                  <p style={{ margin: '0' }}>
                    오버핏 코튼 반팔 티셔츠는 내가 판매하는 상품이에요. 장바구니에서 빼고 다시 주문해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      장바구니로
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>결제할 때</h2>
              <p style={{ margin: '4px 0 0', color: '#D5D5DD', fontSize: '14px' }}>
                주문 후 15분 안에 예치금으로 결제해요
              </p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
                gap: '32px 28px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  402 INSUFFICIENT_BALANCE
                </span>
                <section
                  role="dialog"
                  aria-label="예치금이 18,000원 모자라요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>예치금이 18,000원 모자라요</h3>
                  <span className={cx('chip c-low num')} style={{ alignSelf: 'flex-start' }}>
                    결제 가능 시간 06:52 남음
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      background: '#FAFAFB',
                      borderRadius: '12px',
                      padding: '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span className={cx('sub')} style={{ fontSize: '15px' }}>
                        결제할 금액
                      </span>
                      <span className={cx('num')}>66,000원</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span className={cx('sub')} style={{ fontSize: '15px' }}>
                        내 예치금
                      </span>
                      <span className={cx('num')}>48,000원</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                      <span className={cx('sub')} style={{ fontSize: '15px' }}>
                        모자란 금액
                      </span>
                      <span className={cx('num')}>18,000원</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #E8E8ED',
                        paddingTop: '12px',
                      }}
                    >
                      <strong>충전할 금액</strong>
                      <strong className={cx('num')} style={{ color: '#6E5322' }}>
                        20,000원
                      </strong>
                    </div>
                  </div>
                  <p style={{ margin: '0' }}>
                    충전하면 이 주문을 그대로 결제할 수 있어요. 충전 금액은 10,000원 단위로 올려 계산했어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/checkout">
                      나중에 하기
                    </Link>
                    <Link className={cx('btn btn-p')} to="/wallet">
                      20,000원 충전하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 ORDER_EXPIRED
                </span>
                <section
                  role="dialog"
                  aria-label="결제 시간이 지났어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>결제 시간이 지났어요</h3>
                  <p style={{ margin: '0' }}>
                    15분 안에 결제하지 않아 주문이 취소됐고, 예약한 재고도 풀렸어요. 장바구니에 담긴 상품으로 다시
                    주문할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      다시 주문하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  500 INTERNAL_ERROR · 주문 PAYMENT_FAILED
                </span>
                <section
                  role="dialog"
                  aria-label="결제를 마치지 못했어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>결제를 마치지 못했어요</h3>
                  <span className={cx('chip c-low num')} style={{ alignSelf: 'flex-start' }}>
                    결제 가능 시간 11:20 남음
                  </span>
                  <p style={{ margin: '0' }}>
                    일시적인 오류로 결제되지 않았고, 예치금도 빠져나가지 않았어요. 남은 시간 안에 같은 주문을 다시
                    결제할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/checkout">
                      다시 결제하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 PRODUCT_NOT_ON_SALE · 결제 시점
                </span>
                <section
                  role="dialog"
                  aria-label="결제할 수 없는 상품이 들어 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    결제할 수 없는 상품이 들어 있어요
                  </h3>
                  <p style={{ margin: '0' }}>
                    주문한 뒤 비타민 브라이트닝 세럼 30ml의 판매 정보가 바뀌어 이 주문으로는 결제할 수 없어요. 주문을
                    취소하고 장바구니에서 다시 주문해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/checkout">
                      닫기
                    </Link>
                    <Link className={cx('btn btn-p')} to="/orders">
                      주문 취소하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 ORDER_STATE_INVALID · 결제
                </span>
                <section
                  role="dialog"
                  aria-label="이미 처리된 주문이에요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>이미 처리된 주문이에요</h3>
                  <p style={{ margin: '0' }}>
                    이 주문은 이미 결제했거나 취소됐어요. 주문 내역에서 지금 상태를 확인해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/orders">
                      주문 내역 보기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  401 AUTH_TOKEN_EXPIRED
                </span>
                <section
                  role="dialog"
                  aria-label="다시 로그인해 주세요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>다시 로그인해 주세요</h3>
                  <p style={{ margin: '0' }}>
                    로그인한 지 오래되어 안전을 위해 로그아웃됐어요. 다시 로그인하면 주문을 이어서 결제할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/login">
                      로그인하기
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>예치금을 충전할 때</h2>
              <p style={{ margin: '4px 0 0', color: '#D5D5DD', fontSize: '14px' }}>토스페이먼츠로 10,000원 단위 충전</p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
                gap: '32px 28px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 TOPUP_AMOUNT_INVALID
                </span>
                <section
                  role="dialog"
                  aria-label="충전 금액을 다시 입력해 주세요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>충전 금액을 다시 입력해 주세요</h3>
                  <p style={{ margin: '0' }}>
                    예치금은 10,000원 단위로, 한 번에 10,000원부터 1,000,000원까지 충전할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 TOPUP_PAYMENT_DECLINED
                </span>
                <section
                  role="dialog"
                  aria-label="카드사에서 결제를 승인하지 않았어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    카드사에서 결제를 승인하지 않았어요
                  </h3>
                  <span
                    className={cx('sub')}
                    style={{ background: '#FAFAFB', borderRadius: '10px', padding: '10px 12px' }}
                  >
                    카드사 안내: 한도가 초과되었습니다.
                  </span>
                  <p style={{ margin: '0' }}>
                    한도 초과나 카드 정보 오류로 승인되지 않았어요. 다른 결제 수단으로 다시 충전해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      다시 충전하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  400 AMOUNT_MISMATCH
                </span>
                <section
                  role="dialog"
                  aria-label="충전 금액이 달라 충전하지 않았어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    충전 금액이 달라 충전하지 않았어요
                  </h3>
                  <p style={{ margin: '0' }}>
                    요청한 금액과 결제 금액이 달라 충전을 멈췄어요. 빠져나간 돈은 없어요. 처음부터 다시 충전해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      다시 충전하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  502 EXTERNAL_SERVICE_ERROR
                </span>
                <section
                  role="dialog"
                  aria-label="결제 서비스에 연결하지 못했어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>결제 서비스에 연결하지 못했어요</h3>
                  <p style={{ margin: '0' }}>
                    토스페이먼츠 응답에 문제가 있어 충전하지 못했어요. 잠시 후 다시 시도해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/wallet">
                      닫기
                    </Link>
                    <Link className={cx('btn btn-p')} to="/wallet">
                      다시 시도하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  200-1 · data.status PROCESSING
                </span>
                <section
                  role="dialog"
                  aria-label="충전 결과를 확인하고 있어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>충전 결과를 확인하고 있어요</h3>
                  <p style={{ margin: '0' }}>
                    결제사 응답이 늦어지고 있어요. 승인되면 예치금에 자동으로 들어오니, 같은 금액으로 다시 충전하지
                    마세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      예치금 보기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  충전 완료 · 409 ORDER_EXPIRED
                </span>
                <section
                  role="dialog"
                  aria-label="충전은 됐지만 주문 시간이 지났어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    충전은 됐지만 주문 시간이 지났어요
                  </h3>
                  <p style={{ margin: '0' }}>
                    20,000원은 예치금에 들어왔어요. 주문 <span className={cx('num')}>ORD-20261009-0142</span>는 15분이
                    지나 취소됐으니 장바구니에서 다시 주문해 주세요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/cart">
                      장바구니로
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 TOPUP_ALREADY_PROCESSED
                </span>
                <section
                  role="dialog"
                  aria-label="이미 처리된 충전이에요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>이미 처리된 충전이에요</h3>
                  <p style={{ margin: '0' }}>이 충전은 이미 예치금에 들어왔어요. 예치금 내역에서 확인해 주세요.</p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      예치금 내역 보기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 TOPUP_ALREADY_USED
                </span>
                <section
                  role="dialog"
                  aria-label="이 충전 건은 취소할 수 없어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>이 충전 건은 취소할 수 없어요</h3>
                  <p style={{ margin: '0' }}>
                    일부라도 사용한 충전 건은 취소할 수 없어요. 한 번도 쓰지 않은 충전 건만 전액 취소할 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/wallet">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
          <section style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <h2 style={{ margin: '0', color: '#fff', fontSize: '20px', fontWeight: '700' }}>결제한 뒤</h2>
              <p style={{ margin: '4px 0 0', color: '#D5D5DD', fontSize: '14px' }}>취소·반품·구매 확정</p>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))',
                gap: '32px 28px',
                alignItems: 'start',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 ORDER_STATE_INVALID · 취소
                </span>
                <section
                  role="dialog"
                  aria-label="결제한 주문은 취소할 수 없어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>결제한 주문은 취소할 수 없어요</h3>
                  <p style={{ margin: '0' }}>결제를 마친 주문은 구매 확정 전까지 반품을 요청할 수 있어요.</p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn')} to="/orders/detail">
                      닫기
                    </Link>
                    <Link className={cx('btn btn-p')} to="/orders/detail">
                      반품 요청하기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 RETURN_ALREADY_REQUESTED
                </span>
                <section
                  role="dialog"
                  aria-label="이미 반품을 요청한 주문이에요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>이미 반품을 요청한 주문이에요</h3>
                  <p style={{ margin: '0' }}>
                    반품은 주문당 한 번만 요청할 수 있어요. 관리자 확인 결과는 주문 상세에서 볼 수 있어요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/orders/detail">
                      주문 상세 보기
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 ORDER_STATE_INVALID · 반품
                </span>
                <section
                  role="dialog"
                  aria-label="구매 확정한 주문은 반품할 수 없어요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>
                    구매 확정한 주문은 반품할 수 없어요
                  </h3>
                  <p style={{ margin: '0' }}>
                    구매 확정 후에는 반품을 요청할 수 없어요. 결제 후 7일이 지나면 자동으로 구매 확정돼요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/orders/detail">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className={cx('sub num')} style={{ color: '#E8E8ED' }}>
                  409 ORDER_STATE_INVALID · 구매 확정
                </span>
                <section
                  role="dialog"
                  aria-label="반품을 확인하고 있는 주문이에요"
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    boxShadow: '0 18px 40px rgba(0,0,0,.25)',
                  }}
                >
                  <h3 style={{ margin: '0', fontSize: '19px', fontWeight: '700' }}>반품을 확인하고 있는 주문이에요</h3>
                  <p style={{ margin: '0' }}>
                    관리자가 반품 요청을 확인하는 동안에는 구매 확정할 수 없어요. 결과가 나오면 주문 상세에서 알려
                    드려요.
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                      marginTop: '6px',
                    }}
                  >
                    <Link className={cx('btn btn-p')} to="/orders/detail">
                      확인
                    </Link>
                  </div>
                </section>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
