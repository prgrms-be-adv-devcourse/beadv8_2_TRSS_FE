import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './AdminFailed.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 실패 거래 */
export default function AdminFailedPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="실패 거래" minHeight={820}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>실패 거래</h1>
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
            전체 4
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            충전 확인 지연 1
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            결제 실패 1
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            환불 실패 1
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            정산 실패 1
          </button>
        </div>
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>발생 시각</th>
                  <th style={{ textAlign: 'left' }}>유형</th>
                  <th style={{ textAlign: 'left' }}>참조</th>
                  <th style={{ textAlign: 'left' }}>회원 또는 판매자</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th style={{ textAlign: 'left' }}>원인</th>
                  <th style={{ textAlign: 'left' }}>처리</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.09 14:05</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>충전 확인 지연</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>TOPUP-0918</td>
                  <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                  <td style={{ textAlign: 'right' }}>30,000원</td>
                  <td style={{ textAlign: 'left' }}>토스 승인 응답 없음</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('sub')}>자동 확인 대기</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.08 20:41</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>결제 실패</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>ORD-20261008-0301</td>
                  <td style={{ textAlign: 'left' }}>buyer05@example.com</td>
                  <td style={{ textAlign: 'right' }}>41,000원</td>
                  <td style={{ textAlign: 'left' }}>시스템 오류</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('sub')}>구매자가 다시 결제할 수 있어요</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.07 11:02</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>환불 실패</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>ORD-20260930-0402</td>
                  <td style={{ textAlign: 'left' }}>buyer03@example.com</td>
                  <td style={{ textAlign: 'right' }}>37,800원</td>
                  <td style={{ textAlign: 'left' }}>환불 처리 오류</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('sub')}>자동 재시도 대기</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.10 00:31</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>정산 수동 필요</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>STL-2026-09-014</td>
                  <td style={{ textAlign: 'left' }}>무드랩</td>
                  <td style={{ textAlign: 'right' }}>415,000원</td>
                  <td style={{ textAlign: 'left' }}>자동 재시도 3번 실패</td>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/admin/settlements" style={{ fontWeight: '700' }}>
                      월 정산에서 처리
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className={cx('sub')} style={{ margin: '0' }}>
          이 화면에서는 직접 고치지 않아요. 수동 처리는 월 정산에서 정산 실패 건만 할 수 있어요.
        </p>
      </AdminLayout>
    </div>
  )
}
