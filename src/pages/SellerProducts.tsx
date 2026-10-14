import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './SellerProducts.module.css'
import SellerLayout from '../components/SellerLayout'

import { useState } from 'react'

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useSellerProductsView() {
  const [stop, setStop] = useState(true)
  const view = { stop, openStop: () => setStop(true), closeStop: () => setStop(false) }
  return view
}

/** 상품 관리 */
export default function SellerProductsPage() {
  const view = useSellerProductsView()
  const { closeStop, openStop, stop } = view
  return (
    <div className={styles.page}>
      <SellerLayout active="상품 관리" minHeight={1100}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>상품 관리</h1>
          <Link className={cx('btn btn-p')} to="/seller/products/new">
            상품 등록하기
          </Link>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
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
            판매중 2
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            품절 1
          </button>
          <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
            판매 중지 1
          </button>
          <input
            className={cx('in')}
            aria-label="상품명 검색"
            placeholder="상품명으로 찾기"
            style={{ marginLeft: 'auto', minWidth: '240px' }}
          />
        </div>
        <section className={cx('panel')} style={{ padding: '8px 20px' }}>
          <div style={{ overflowX: 'auto', position: 'relative' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>카테고리</th>
                  <th style={{ textAlign: 'left' }}>가격</th>
                  <th style={{ textAlign: 'left' }}>재고</th>
                  <th style={{ textAlign: 'left', position: 'relative' }}>상태</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/products/new" style={{ color: '#26262C', fontWeight: '500' }}>
                      약산성 수분 진정 토너 300ml
                    </Link>
                  </td>
                  <td style={{ textAlign: 'left' }}>스킨케어</td>
                  <td style={{ textAlign: 'left', position: 'relative' }}>18,900원</td>
                  <td style={{ textAlign: 'left', position: 'relative' }}>
                    <span>24</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>판매중</span>
                  </td>
                  <td style={{ textAlign: 'right', position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link
                        className={cx('btn')}
                        to="/seller/products/new"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        수정
                      </Link>
                      <Link
                        className={cx('btn')}
                        to="/seller/stock"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        재고
                      </Link>
                      <button
                        className={cx('btn')}
                        onClick={openStop}
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        판매 중지 요청
                      </button>
                      <button
                        className={cx('btn btn-q')}
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/products/new" style={{ color: '#26262C', fontWeight: '500' }}>
                      비타민 브라이트닝 세럼 30ml
                    </Link>
                  </td>
                  <td style={{ textAlign: 'left' }}>스킨케어</td>
                  <td style={{ textAlign: 'left' }}>32,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span style={{ color: '#A33A1F', fontWeight: '700' }}>0</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>품절</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link
                        className={cx('btn')}
                        to="/seller/products/new"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        수정
                      </Link>
                      <Link
                        className={cx('btn')}
                        to="/seller/stock"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        재고
                      </Link>
                      <button
                        className={cx('btn')}
                        onClick={openStop}
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        판매 중지 요청
                      </button>
                      <button
                        className={cx('btn btn-q')}
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/products/new" style={{ color: '#26262C', fontWeight: '500' }}>
                      저자극 데일리 선크림 SPF50+
                    </Link>
                  </td>
                  <td style={{ textAlign: 'left' }}>선케어</td>
                  <td style={{ textAlign: 'left' }}>21,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span>12</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>판매중</span>{' '}
                    <span className={cx('chip c-low')}>중지 요청 심사 중</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Link
                        className={cx('btn')}
                        to="/seller/products/new"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        수정
                      </Link>
                      <Link
                        className={cx('btn')}
                        to="/seller/stock"
                        style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                      >
                        재고
                      </Link>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>
                    <Link to="/seller/products/new" style={{ color: '#26262C', fontWeight: '500' }}>
                      아쿠아 젤 클렌저 200ml
                    </Link>
                  </td>
                  <td style={{ textAlign: 'left' }}>클렌징</td>
                  <td style={{ textAlign: 'left' }}>14,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span>8</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>판매 중지</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={cx('sub')}>관리자가 중지했어요. 사유: 성분 표기 오류</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        {stop && (
          <>
            <section
              className={cx('panel')}
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                maxWidth: '560px',
                outline: '2px solid #8A6A2C',
              }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매 중지를 요청할까요?</h2>
              <p style={{ margin: '0', color: '#45454F' }}>약산성 수분 진정 토너 300ml</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="rs" style={{ fontSize: '14px', fontWeight: '500' }}>
                  사유 (필수)
                </label>
                <textarea
                  id="rs"
                  className={cx('in')}
                  style={{ minHeight: '96px', padding: '12px 14px' }}
                  defaultValue="재료 수급이 어려워 판매를 멈추려고 해요."
                ></textarea>
              </div>
              <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                관리자가 승인하면 판매가 멈추고, 결제를 기다리는 주문은 취소돼요. 한 번 중지된 상품은 다시 판매할 수
                없어요.
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className={cx('btn')} onClick={closeStop}>
                  닫기
                </button>
                <button className={cx('btn btn-p')}>중지 요청하기</button>
              </div>
            </section>
          </>
        )}
      </SellerLayout>
    </div>
  )
}
