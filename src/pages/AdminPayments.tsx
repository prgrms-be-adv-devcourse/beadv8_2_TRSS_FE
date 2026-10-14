import { makeCx } from '../lib/ui'
import styles from './AdminPayments.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 결제 조회 */
export default function AdminPaymentsPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="결제 조회" minHeight={820}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>결제 조회</h1>
          <span className={cx('chip c-mute')}>조회 전용</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            className={cx('btn')}
            style={{
              minHeight: '36px',
              fontSize: '13px',
              padding: '0 12px',
              borderColor: '#26262C',
              background: '#26262C',
              color: '#fff',
            }}
          >
            결제
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            충전
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            환불
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            className={cx('in')}
            placeholder="주문번호, 충전번호, 회원 이메일"
            aria-label="검색"
            style={{ flex: '1 1 300px' }}
          />
          <select className={cx('in')} aria-label="기간">
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>기간 직접 고르기</option>
          </select>
        </div>
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>결제일</th>
                  <th style={{ textAlign: 'left' }}>주문번호</th>
                  <th style={{ textAlign: 'left' }}>회원</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th style={{ textAlign: 'left' }}>결제 상태</th>
                  <th style={{ textAlign: 'left' }}>보관 금액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.09 14:06</td>
                  <td style={{ textAlign: 'left' }}>ORD-20261009-0142</td>
                  <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                  <td style={{ textAlign: 'right' }}>72,900원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>결제 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>보관 중</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.05 09:12</td>
                  <td style={{ textAlign: 'left' }}>ORD-20261005-0031</td>
                  <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                  <td style={{ textAlign: 'right' }}>52,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>결제 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>보관 중</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>09.28 16:30</td>
                  <td style={{ textAlign: 'left' }}>ORD-20260921-0410</td>
                  <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                  <td style={{ textAlign: 'right' }}>24,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-blue')}>환불</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>환불 완료</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>09.03 12:10</td>
                  <td style={{ textAlign: 'left' }}>ORD-20260827-0112</td>
                  <td style={{ textAlign: 'left' }}>buyer04@example.com</td>
                  <td style={{ textAlign: 'right' }}>37,800원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>결제 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>정산됨</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </AdminLayout>
    </div>
  )
}
