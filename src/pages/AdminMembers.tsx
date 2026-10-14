import { makeCx } from '../lib/ui'
import styles from './AdminMembers.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 회원 */
export default function AdminMembersPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="회원" minHeight={900}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>회원</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <input
            className={cx('in')}
            placeholder="이메일이나 이름"
            aria-label="회원 검색"
            style={{ flex: '1 1 260px' }}
          />
          <select className={cx('in')} aria-label="역할">
            <option>모든 역할</option>
            <option>구매자</option>
            <option>판매자</option>
            <option>관리자</option>
          </select>
          <select className={cx('in')} aria-label="상태">
            <option>모든 상태</option>
            <option>활성</option>
            <option>탈퇴</option>
          </select>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <section className={cx('panel')} style={{ flex: '999 1 480px', minWidth: '0', padding: '8px 20px 12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>가입일</th>
                    <th style={{ textAlign: 'left' }}>이메일</th>
                    <th style={{ textAlign: 'left' }}>이름</th>
                    <th style={{ textAlign: 'left' }}>역할</th>
                    <th style={{ textAlign: 'left' }}>판매자 상태</th>
                    <th style={{ textAlign: 'left' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#F3F1F6' }}>
                    <td style={{ textAlign: 'left' }}>10.09</td>
                    <td style={{ textAlign: 'left' }}>buyer01@example.com</td>
                    <td style={{ textAlign: 'left' }}>김하늘</td>
                    <td style={{ textAlign: 'left' }}>판매자</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-ok')}>APPROVED</span>
                    </td>
                    <td style={{ textAlign: 'left' }}>활성</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>10.08</td>
                    <td style={{ textAlign: 'left' }}>buyer02@example.com</td>
                    <td style={{ textAlign: 'left' }}>이도윤</td>
                    <td style={{ textAlign: 'left' }}>구매자</td>
                    <td style={{ textAlign: 'left' }}></td>
                    <td style={{ textAlign: 'left' }}>활성</td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>09.30</td>
                    <td style={{ textAlign: 'left' }}>탈퇴한 회원</td>
                    <td style={{ textAlign: 'left' }}></td>
                    <td style={{ textAlign: 'left' }}>구매자</td>
                    <td style={{ textAlign: 'left' }}></td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('sub')}>탈퇴</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          <aside
            className={cx('panel')}
            style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>김하늘</h2>
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
                이메일
              </dt>
              <dd style={{ margin: '0' }}>buyer01@example.com</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                역할
              </dt>
              <dd style={{ margin: '0' }}>구매자, 판매자</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                판매자 상태
              </dt>
              <dd style={{ margin: '0' }}>APPROVED (온결)</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                예치금
              </dt>
              <dd style={{ margin: '0' }}>
                <span className={cx('num')}>48,000원</span>
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                구매 확정 대기
              </dt>
              <dd style={{ margin: '0' }}>
                <span className={cx('num')}>72,900원</span>
              </dd>
            </dl>
            <strong style={{ fontSize: '15px', borderTop: '1px solid #E8E8ED', paddingTop: '14px' }}>최근 주문</strong>
            <div
              className={cx('num')}
              style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ORD-20261009-0142</span>
                <span>72,900원 결제 완료</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ORD-20261005-0031</span>
                <span>52,000원 결제 완료</span>
              </div>
            </div>
            <p className={cx('sub')} style={{ margin: '0' }}>
              회원 정보는 조회만 할 수 있어요.
            </p>
          </aside>
        </div>
      </AdminLayout>
    </div>
  )
}
