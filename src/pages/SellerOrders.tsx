import { makeCx } from '../lib/ui'
import styles from './SellerOrders.module.css'
import SellerLayout from '../components/SellerLayout'

const cx = makeCx(styles)

/** 주문 항목 */
export default function SellerOrdersPage() {
  return (
    <div className={styles.page}>
      <SellerLayout active="주문 항목" minHeight={820}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문 항목</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <select className={cx('in')} aria-label="상태">
            <option>모든 상태</option>
            <option>결제 완료</option>
            <option>반품 요청</option>
            <option>구매 확정</option>
          </select>
          <select className={cx('in')} aria-label="기간">
            <option>최근 1개월</option>
            <option>최근 3개월</option>
          </select>
          <input className={cx('in')} aria-label="검색" placeholder="주문번호나 상품명" style={{ flex: '1 1 240px' }} />
        </div>
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>주문일</th>
                  <th style={{ textAlign: 'left' }}>주문번호</th>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'right' }}>수량</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.09</td>
                  <td style={{ textAlign: 'left' }}>ORD-20261009-0142</td>
                  <td style={{ textAlign: 'left' }}>약산성 수분 진정 토너 300ml</td>
                  <td style={{ textAlign: 'right' }}>1</td>
                  <td style={{ textAlign: 'right' }}>18,900원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>결제 완료</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.05</td>
                  <td style={{ textAlign: 'left' }}>ORD-20261005-0031</td>
                  <td style={{ textAlign: 'left' }}>약산성 수분 진정 토너 300ml</td>
                  <td style={{ textAlign: 'right' }}>2</td>
                  <td style={{ textAlign: 'right' }}>37,800원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>결제 완료</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>09.28</td>
                  <td style={{ textAlign: 'left' }}>ORD-20260928-0377</td>
                  <td style={{ textAlign: 'left' }}>비타민 브라이트닝 세럼 30ml</td>
                  <td style={{ textAlign: 'right' }}>1</td>
                  <td style={{ textAlign: 'right' }}>32,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-blue')}>반품 요청</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>09.21</td>
                  <td style={{ textAlign: 'left' }}>ORD-20260921-0410</td>
                  <td style={{ textAlign: 'left' }}>약산성 수분 진정 토너 300ml</td>
                  <td style={{ textAlign: 'right' }}>1</td>
                  <td style={{ textAlign: 'right' }}>18,900원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>구매 확정</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className={cx('sub')} style={{ margin: '0' }}>
          내 상품이 들어 있는 주문만 보여요. 구매 확정된 금액은 다음 달 10일 정산에 들어가요.
        </p>
      </SellerLayout>
    </div>
  )
}
