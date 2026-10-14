import { makeCx } from '../lib/ui'
import styles from './AdminProducts.module.css'
import AdminLayout from '../components/AdminLayout'

const cx = makeCx(styles)

/** 관리자 · 상품과 카테고리 */
export default function AdminProductsPage() {
  return (
    <div className={styles.page}>
      <AdminLayout active="상품과 카테고리" minHeight={1700}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>상품과 카테고리</h1>
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매 중지 요청</h2>
            <span className={cx('chip c-blue')}>1건</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>요청일</th>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'left' }}>사유</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.09</td>
                  <td style={{ textAlign: 'left' }}>저자극 데일리 선크림 SPF50+</td>
                  <td style={{ textAlign: 'left' }}>하루담</td>
                  <td style={{ textAlign: 'left' }}>재료 수급이 어려워 판매를 멈추려고 해요.</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                        반려
                      </button>
                      <button
                        className={cx('btn btn-p')}
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        승인
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className={cx('sub')} style={{ margin: '4px 0 0' }}>
            승인하면 판매가 멈추고 결제 대기 주문이 취소돼요. 반려할 때는 사유를 남겨요.
          </p>
        </section>
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>전체 상품</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <input className={cx('in')} placeholder="상품명" aria-label="상품명" style={{ flex: '1 1 200px' }} />
            <select className={cx('in')} aria-label="판매자">
              <option>모든 판매자</option>
            </select>
            <select className={cx('in')} aria-label="상태">
              <option>모든 상태</option>
              <option>판매중</option>
              <option>품절</option>
              <option>판매 중지</option>
              <option>삭제됨</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'left' }}>카테고리</th>
                  <th style={{ textAlign: 'right' }}>가격</th>
                  <th style={{ textAlign: 'right' }}>재고</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>약산성 수분 진정 토너 300ml</td>
                  <td style={{ textAlign: 'left' }}>온결</td>
                  <td style={{ textAlign: 'left' }}>스킨케어</td>
                  <td style={{ textAlign: 'right' }}>18,900원</td>
                  <td style={{ textAlign: 'right' }}>23</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>판매중</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
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
                      바로 판매 중지
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>오버핏 코튼 반팔 티셔츠</td>
                  <td style={{ textAlign: 'left' }}>데일리핏</td>
                  <td style={{ textAlign: 'left' }}>상의</td>
                  <td style={{ textAlign: 'right' }}>24,000원</td>
                  <td style={{ textAlign: 'right' }}>2</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>판매중</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
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
                      바로 판매 중지
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>아쿠아 젤 클렌저 200ml</td>
                  <td style={{ textAlign: 'left' }}>온결</td>
                  <td style={{ textAlign: 'left' }}>클렌징</td>
                  <td style={{ textAlign: 'right' }}>14,000원</td>
                  <td style={{ textAlign: 'right' }}>8</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>판매 중지</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={cx('sub')}>다시 열 수 없어요</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>카테고리</h2>
            <button className={cx('btn btn-p')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
              소분류 추가하기
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ padding: '6px 0' }}>뷰티</strong>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>스킨케어</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>메이크업</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>선케어</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>클렌징</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>마스크팩</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>바디케어</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>헤어케어</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>건강식품</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <strong style={{ padding: '6px 0' }}>의류</strong>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>상의</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>아우터</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>바지</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>원피스와 스커트</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>신발</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>가방</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>모자</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderTop: '1px solid #E8E8ED',
                  fontSize: '14px',
                }}
              >
                <span>소품</span>
                <span style={{ display: 'flex', gap: '4px' }}>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    이름 바꾸기
                  </button>
                  <button className={cx('btn btn-q')} style={{ minHeight: '32px', padding: '0 8px', fontSize: '13px' }}>
                    숨기기
                  </button>
                </span>
              </div>
            </div>
          </div>
          <p className={cx('sub')} style={{ margin: '0' }}>
            같은 대분류 안에서는 이름이 겹칠 수 없어요.
          </p>
        </section>
      </AdminLayout>
    </div>
  )
}
