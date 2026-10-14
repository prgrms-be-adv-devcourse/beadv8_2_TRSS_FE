import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './PaymentPopups.module.css'

const cx = makeCx(styles)

/** 결제 팝업 */
export default function PaymentPopupsPage() {
  return (
    <div className={styles.page}>
      <div
        style={{ background: 'rgba(38,38,44,.72)', minHeight: '900px', padding: '48px 32px', boxSizing: 'border-box' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
          <div>
            <h1 style={{ margin: '0', color: '#fff', fontSize: '24px', fontWeight: '700' }}>
              주문서에서 결제할 때 뜨는 팝업
            </h1>
            <p style={{ margin: '6px 0 0', color: '#D5D5DD' }}>
              결제하기 → 결제 요청 확인 → 결제 진행 중 → 결제 완료 순서로 바뀌어요.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))',
              gap: '28px',
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E8E8ED', fontSize: '14px', fontWeight: '500' }}>1. 결제 요청 확인</span>
              <section className={cx('dlg')} role="dialog" aria-labelledby="pc-t" style={{ maxWidth: 'none' }}>
                <h2 id="pc-t">72,900원을 결제할까요?</h2>
                <dl className={cx('sum')}>
                  <dt>주문번호</dt>
                  <dd>ORD-20261009-0142</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>72,900원</strong>
                  </dd>
                  <dt>결제 수단</dt>
                  <dd>예치금</dd>
                  <dt>결제 후 남는 예치금</dt>
                  <dd>27,100원</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 뒤에는 주문을 취소할 수 없고, 구매 확정 전까지 반품만 요청할 수 있어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className={cx('btn')}>돌아가기</button>
                  <button className={cx('btn btn-p')}>72,900원 결제하기</button>
                </div>
              </section>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E8E8ED', fontSize: '14px', fontWeight: '500' }}>2. 결제 진행 중</span>
              <section className={cx('dlg')} role="alertdialog" aria-labelledby="pp-t" style={{ maxWidth: 'none' }}>
                <div className={cx('spin')} aria-hidden="true"></div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 id="pp-t">결제하고 있어요</h2>
                  <p style={{ color: '#45454F' }}>
                    예치금 72,900원을 결제하는 중이에요.
                    <br />
                    창을 닫거나 새로고침하지 말고 잠시만 기다려 주세요.
                  </p>
                </div>
                <ol className={cx('steps')}>
                  <li className={cx('ok')}>주문 확인</li>
                  <li className={cx('now')} aria-current="step">
                    예치금 결제
                  </li>
                  <li>결제 완료</li>
                </ol>
              </section>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E8E8ED', fontSize: '14px', fontWeight: '500' }}>3. 결제 완료</span>
              <section className={cx('dlg')} role="dialog" aria-labelledby="pd-t" style={{ maxWidth: 'none' }}>
                <div className={cx('okmark')} aria-hidden="true">
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <h2 id="pd-t">결제를 완료했어요</h2>
                  <p style={{ color: '#45454F' }}>주문한 상품을 판매자에게 전달했어요.</p>
                </div>
                <dl className={cx('sum')}>
                  <dt>주문번호</dt>
                  <dd>ORD-20261009-0142</dd>
                  <dt>결제 금액</dt>
                  <dd>
                    <strong>72,900원</strong>
                  </dd>
                  <dt>남은 예치금</dt>
                  <dd>27,100원</dd>
                  <dt>자동 구매 확정</dt>
                  <dd>10.16 (결제 후 7일)</dd>
                </dl>
                <p className={cx('sub')} style={{ fontSize: '14px' }}>
                  결제한 금액은 구매를 확정하기 전까지 팔레트가 보관해요. 장바구니에서 결제한 상품은 빠졌어요.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <Link className={cx('btn')} to="/">
                    쇼핑 계속하기
                  </Link>
                  <Link className={cx('btn btn-p')} to="/orders/detail">
                    주문 상세 보기
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
