import { makeCx } from '../lib/ui'
import styles from './SellerStock.module.css'
import SellerLayout from '../components/SellerLayout'

import { useState } from 'react'

const CURRENT_STOCK = 23

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useSellerStockView() {
  const [delta, setDelta] = useState(10)
  const view = {
    deltaStr: (delta > 0 ? '+' : '') + delta,
    after: CURRENT_STOCK + delta,
    inc: () => setDelta((d) => d + 1),
    dec: () => setDelta((d) => Math.max(-CURRENT_STOCK, d - 1)),
  }
  return view
}

/** 재고 */
export default function SellerStockPage() {
  const view = useSellerStockView()
  const { after, dec, deltaStr, inc } = view
  return (
    <div className={styles.page}>
      <SellerLayout active="재고" minHeight={1000}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>재고</h1>
        <section
          className={cx('panel')}
          style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#F5E1E6',
              flex: 'none',
            }}
          >
            <img
              src="/images/toner.jpg"
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
          <div style={{ flex: '1 1 240px' }}>
            <select className={cx('in')} aria-label="상품 선택" style={{ fontWeight: '700', minWidth: '280px' }}>
              <option>약산성 수분 진정 토너 300ml</option>
            </select>
            <div className={cx('sub')} style={{ marginTop: '6px' }}>
              스킨케어, 판매중
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={cx('sub')}>지금 재고</span>
            <div className={cx('num')} style={{ fontSize: '36px', fontWeight: '700', lineHeight: '1.1' }}>
              23개
            </div>
          </div>
        </section>
        <section
          className={cx('panel')}
          style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
        >
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>재고 조정</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>늘리거나 줄일 수량</span>
              <div className={cx('step')}>
                <button onClick={dec} aria-label="줄이기">
                  −
                </button>
                <span className={cx('num')} style={{ minWidth: '64px' }}>
                  {deltaStr}
                </span>
                <button onClick={inc} aria-label="늘리기">
                  +
                </button>
              </div>
            </div>
            <button className={cx('btn btn-p')}>조정하기</button>
          </div>
          <p className={cx('num')} style={{ margin: '0', fontSize: '14px' }}>
            조정한 뒤 재고 <strong>{after}개</strong>. 0보다 적게는 줄일 수 없어요.
          </p>
        </section>
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>일시</th>
                  <th style={{ textAlign: 'left' }}>유형</th>
                  <th style={{ textAlign: 'right' }}>증감</th>
                  <th style={{ textAlign: 'right' }}>변경 후</th>
                  <th style={{ textAlign: 'left' }}>내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.09 14:06</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-blue')}>주문</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>−1</td>
                  <td style={{ textAlign: 'right' }}>23</td>
                  <td style={{ textAlign: 'left' }}>주문 ORD-20261009-0142</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.08 11:40</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>예약 해제</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>+2</td>
                  <td style={{ textAlign: 'right' }}>24</td>
                  <td style={{ textAlign: 'left' }}>결제 시간 초과 ORD-20261008-0213</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.03 17:20</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>반품</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>+1</td>
                  <td style={{ textAlign: 'right' }}>22</td>
                  <td style={{ textAlign: 'left' }}>반품 승인 ORD-20260921-0410</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>10.01 09:00</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>직접 조정</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>+10</td>
                  <td style={{ textAlign: 'right' }}>21</td>
                  <td style={{ textAlign: 'left' }}>판매자가 직접 조정</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>09.15 13:12</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>등록</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>+11</td>
                  <td style={{ textAlign: 'right' }}>11</td>
                  <td style={{ textAlign: 'left' }}>상품 등록</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </SellerLayout>
    </div>
  )
}
