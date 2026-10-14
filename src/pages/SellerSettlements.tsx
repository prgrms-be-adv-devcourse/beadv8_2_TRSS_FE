import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './SellerSettlements.module.css'
import SellerLayout from '../components/SellerLayout'

const cx = makeCx(styles)

/** 정산 */
export default function SellerSettlementsPage() {
  return (
    <div className={styles.page}>
      <SellerLayout active="정산" minHeight={1100}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>정산</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              이번 달 구매 확정 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
              642,000원
            </div>
            <span className={cx('sub')}>11월 10일에 정산돼요</span>
          </section>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              예상 수수료 10%
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
              64,200원
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              최근 받은 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700', color: '#8A6A2C' }}>
              1,116,000원
            </div>
            <span className={cx('sub')}>10월 10일 예치금으로 들어왔어요</span>
          </section>
        </div>
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>월별 정산서</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>정산월</th>
                  <th style={{ textAlign: 'right' }}>판매 금액</th>
                  <th style={{ textAlign: 'right' }}>수수료</th>
                  <th style={{ textAlign: 'right' }}>받는 금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'left' }}>지급일</th>
                  <th style={{ textAlign: 'left' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 9월</td>
                  <td style={{ textAlign: 'right' }}>1,240,000원</td>
                  <td style={{ textAlign: 'right' }}>124,000원</td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>1,116,000원</strong>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>지급 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>10.10</td>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/settlements">자세히</Link>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 8월</td>
                  <td style={{ textAlign: 'right' }}>980,000원</td>
                  <td style={{ textAlign: 'right' }}>98,000원</td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>882,000원</strong>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>지급 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>09.10</td>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/settlements">자세히</Link>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 7월</td>
                  <td style={{ textAlign: 'right' }}>415,000원</td>
                  <td style={{ textAlign: 'right' }}>41,500원</td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>373,500원</strong>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>확인 중</span>
                  </td>
                  <td style={{ textAlign: 'left' }}></td>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/settlements">자세히</Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </SellerLayout>
    </div>
  )
}
