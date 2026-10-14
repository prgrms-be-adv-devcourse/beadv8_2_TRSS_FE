import { makeCx } from '../lib/ui'
import styles from './AdminSellers.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 판매자 심사 */
export default function AdminSellersPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="판매자 심사" minHeight={1000}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>판매자 심사</h1>
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
            심사 대기 3
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            승인
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            반려
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            철회 요청 1
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            철회됨
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'flex-start' }}>
          <section className={cx('panel')} style={{ flex: '999 1 480px', minWidth: '0', padding: '8px 20px 12px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>신청일</th>
                    <th style={{ textAlign: 'left' }}>상호명</th>
                    <th style={{ textAlign: 'left' }}>사업자번호</th>
                    <th style={{ textAlign: 'left' }}>카테고리</th>
                    <th style={{ textAlign: 'left' }}>신청자</th>
                    <th style={{ textAlign: 'left' }}>상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: '#F3F1F6' }}>
                    <td style={{ textAlign: 'left' }}>10.08</td>
                    <td style={{ textAlign: 'left' }}>하루담</td>
                    <td style={{ textAlign: 'left' }}>234-56-78901</td>
                    <td style={{ textAlign: 'left' }}>뷰티</td>
                    <td style={{ textAlign: 'left' }}>haru@example.com</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-blue')}>심사 대기</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>10.08</td>
                    <td style={{ textAlign: 'left' }}>데일리핏</td>
                    <td style={{ textAlign: 'left' }}>345-67-89012</td>
                    <td style={{ textAlign: 'left' }}>의류</td>
                    <td style={{ textAlign: 'left' }}>daily@example.com</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-blue')}>심사 대기</span>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textAlign: 'left' }}>10.07</td>
                    <td style={{ textAlign: 'left' }}>무드랩</td>
                    <td style={{ textAlign: 'left' }}>456-78-90123</td>
                    <td style={{ textAlign: 'left' }}>뷰티</td>
                    <td style={{ textAlign: 'left' }}>mood@example.com</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip c-blue')}>심사 대기</span>
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
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>하루담</h2>
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
                사업자번호
              </dt>
              <dd style={{ margin: '0' }}>
                <span className={cx('num')}>234-56-78901</span>
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                카테고리
              </dt>
              <dd style={{ margin: '0' }}>뷰티</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                휴대폰
              </dt>
              <dd style={{ margin: '0' }}>
                <span className={cx('num')}>010-2222-3333</span>
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                정산 계좌
              </dt>
              <dd style={{ margin: '0' }}>국민은행 끝자리 1234</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                신청자
              </dt>
              <dd style={{ margin: '0' }}>haru@example.com</dd>
            </dl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="rj" style={{ fontSize: '14px', fontWeight: '500' }}>
                반려 사유 (반려할 때 필수)
              </label>
              <textarea id="rj" className={cx('in')} style={{ minHeight: '72px', padding: '10px 12px' }}></textarea>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className={cx('btn')} style={{ flex: '1' }}>
                반려하기
              </button>
              <button className={cx('btn btn-p')} style={{ flex: '1' }}>
                승인하기
              </button>
            </div>
            <p className={cx('sub')} style={{ margin: '0' }}>
              승인하면 이 계정에 판매자 권한이 생겨요.
            </p>
            <div
              style={{
                borderTop: '1px solid #E8E8ED',
                paddingTop: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <strong style={{ fontSize: '15px' }}>승인된 판매자일 때</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                  철회 승인
                </button>
                <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                  철회 거절
                </button>
                <button
                  className={cx('btn')}
                  style={{
                    minHeight: '36px',
                    fontSize: '13px',
                    padding: '0 12px',
                    borderColor: '#C2410C',
                    color: '#A33A1F',
                  }}
                >
                  제재하기
                </button>
              </div>
              <p className={cx('sub')} style={{ margin: '0' }}>
                제재하면 바로 판매가 철회되고, 결제 대기 주문 취소와 모든 상품 판매 중지, 정산 보류까지 함께 처리돼요.
                사유를 꼭 남겨요.
              </p>
            </div>
          </aside>
        </div>
      </AdminLayout>
    </div>
  )
}
