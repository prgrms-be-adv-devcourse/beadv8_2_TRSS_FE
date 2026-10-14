import { makeCx } from '../lib/ui'
import styles from './AdminReturns.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 반품 심사 */
export default function AdminReturnsPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="반품 심사" minHeight={900}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>반품 심사</h1>
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
            심사 대기 2
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            승인
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            거절
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <section className={cx('panel')} style={{ flex: '999 1 480px', minWidth: '0', padding: '8px 20px 12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>요청일</th>
                    <th style={{ textAlign: 'left' }}>주문번호</th>
                    <th style={{ textAlign: 'left' }}>회원</th>
                    <th style={{ textAlign: 'left' }}>사유</th>
                    <th style={{ textAlign: 'right' }}>금액</th>
                    <th style={{ textAlign: 'left' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#F3F1F6' }}>
                    <td style={{ textAlign: 'left' }}>10.07</td>
                    <td style={{ textAlign: 'left' }}>ORD-20260928-0377</td>
                    <td style={{ textAlign: 'left' }}>buyer02@example.com</td>
                    <td style={{ textAlign: 'left' }}>상품 불량</td>
                    <td style={{ textAlign: 'right' }}>24,000원</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-blue')}>심사 대기</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>10.06</td>
                    <td style={{ textAlign: 'left' }}>ORD-20260930-0402</td>
                    <td style={{ textAlign: 'left' }}>buyer03@example.com</td>
                    <td style={{ textAlign: 'left' }}>단순 변심</td>
                    <td style={{ textAlign: 'right' }}>37,800원</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-blue')}>심사 대기</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>10.02</td>
                    <td style={{ textAlign: 'left' }}>ORD-20260921-0410</td>
                    <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                    <td style={{ textAlign: 'left' }}>오배송</td>
                    <td style={{ textAlign: 'right' }}>15,900원</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-ok')}>승인</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <aside
            className={cx('panel')}
            style={{ flex: '1 1 340px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>ORD-20260928-0377</h2>
            <dl
              style={{
                margin: '0',
                display: 'grid',
                gridTemplateColumns: '110px 1fr',
                gap: '10px 12px',
                fontSize: '14px',
              }}
            >
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                회원
              </dt>
              <dd style={{ margin: '0' }}>buyer02@example.com</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                사유
              </dt>
              <dd style={{ margin: '0' }}>상품 불량</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                돌려줄 금액
              </dt>
              <dd style={{ margin: '0' }}>
                <strong className={cx('num')}>24,000원</strong>
              </dd>
            </dl>
            <p style={{ margin: '0', fontSize: '14px', background: '#FAFAFB', borderRadius: '8px', padding: '12px' }}>
              받아보니 박음질이 터져 있었어요. 사진 첨부했어요.
            </p>
            <fieldset
              style={{
                border: 'none',
                margin: '0',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <legend style={{ fontWeight: '500', paddingBottom: '6px' }}>재고로 돌릴 상품</legend>
              <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input type="checkbox" style={{ width: '20px', height: '20px', accentColor: '#8A6A2C' }} />
                오버핏 코튼 반팔 티셔츠 × 1 <span className={cx('sub')}>데일리핏</span>
              </label>
            </fieldset>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={cx('btn')} style={{ flex: '1' }}>
                거절하기
              </button>
              <button className={cx('btn btn-p')} style={{ flex: '1' }}>
                승인하고 환불하기
              </button>
            </div>
            <p className={cx('sub')} style={{ margin: '0' }}>
              승인하면 보관 중인 금액이 구매자 예치금으로 돌아가요. 거절하면 결제 완료 상태로 돌아가고, 결제 후 7일이
              지났다면 바로 구매 확정돼요.
            </p>
          </aside>
        </div>
      </AdminLayout>
    </div>
  )
}
