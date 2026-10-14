import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './OrderDetail.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useState } from 'react'

export type OrderStatus = '결제 대기' | '결제 완료' | '반품 요청' | '구매 확정'
const STATUS: Record<OrderStatus, { chip: string; at: number; hold: string }> = {
  '결제 대기': { chip: 'c-low', at: 0, hold: '아직 결제하지 않았어요.' },
  '결제 완료': {
    chip: 'c-ok',
    at: 1,
    hold: '구매를 확정하기 전까지 팔레트가 보관해요. 10월 16일에 자동으로 확정돼요.',
  },
  '반품 요청': { chip: 'c-blue', at: 1, hold: '반품이 승인되면 예치금으로 돌려드려요.' },
  '구매 확정': { chip: 'c-mute', at: 2, hold: '판매자에게 정산될 금액이에요.' },
}

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useOrderDetailView({ status = '결제 완료' }: { status?: OrderStatus }) {
  const [ret, setRet] = useState(false)
  const m = STATUS[status] ?? STATUS['결제 완료']
  const labels: Array<[string, string]> = [
    ['주문 생성', '10.09 14:02'],
    ['결제 완료', m.at >= 1 ? '10.09 14:06' : '결제 전'],
    ['구매 확정', m.at >= 2 ? '10.16 00:00' : '10.16 자동 확정 예정'],
  ]
  const view = {
    steps: labels.map(([label, when], i) => ({
      n: i + 1,
      label,
      when,
      dot:
        i <= m.at
          ? 'background:#26262C;color:#fff'
          : 'background:#fff;color:#5F5F6A;box-shadow:inset 0 0 0 1.5px #D5D5DD',
      line: i < m.at ? '#26262C' : i === 2 ? 'transparent' : '#E8E8ED',
      color: i <= m.at ? '#26262C' : '#5F5F6A',
    })),
    st: {
      label: status,
      chip: m.chip,
      hold: m.hold,
      created: status === '결제 대기',
      paid: status === '결제 완료',
      returning: status === '반품 요청',
    },
    showReturn: ret && status === '결제 완료',
    openReturn: () => setRet(true),
    closeReturn: () => setRet(false),
  }
  return view
}

/** 주문 상세 */
export default function OrderDetailPage(props: { status?: OrderStatus }) {
  const view = useOrderDetailView(props)
  const { closeReturn, openReturn, showReturn, st, steps } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="orders" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '24px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Link to="/orders" className={cx('sub')} style={{ fontWeight: '500' }}>
            ‹ 주문 내역
          </Link>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className={cx('sub num')}>2026년 10월 9일 주문</span>
              <h1
                className={cx('num')}
                style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}
              >
                ORD-20261009-0142
              </h1>
              <span
                className={cx(`chip ${st.chip}`)}
                style={{ alignSelf: 'flex-start', fontSize: '13px', minHeight: '28px', padding: '0 10px' }}
              >
                {st.label}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {st.created && (
                <>
                  <Link className={cx('btn btn-p')} to="/checkout">
                    결제하기
                  </Link>
                  <button className={cx('btn')}>주문 취소하기</button>
                </>
              )}
              {st.paid && (
                <>
                  <button className={cx('btn btn-p')}>구매 확정하기</button>
                  <button className={cx('btn')} onClick={openReturn}>
                    반품 요청하기
                  </button>
                </>
              )}
            </div>
          </div>
          {st.created && (
            <>
              <div style={{ background: '#FFF1E8', borderRadius: '6px', padding: '14px 18px', color: '#9A3209' }}>
                <strong className={cx('num')}>14:32</strong> 안에 결제하지 않으면 주문이 취소돼요.
              </div>
            </>
          )}
          {st.returning && (
            <>
              <div style={{ background: '#F3F1F6', borderRadius: '6px', padding: '14px 18px', color: '#45454F' }}>
                반품 요청을 관리자가 확인하고 있어요. 승인되면 예치금으로 돌려드려요.
              </div>
            </>
          )}
          <section className={cx('panel')} style={{ padding: '24px 28px' }}>
            <ol
              style={{
                listStyle: 'none',
                margin: '0',
                padding: '0',
                display: 'grid',
                gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
                gap: '12px',
              }}
            >
              {steps.map((s, sIndex) => (
                <li style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} key={sIndex}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      className={cx('num')}
                      style={css(
                        `width:28px;height:28px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;${s.dot}`,
                      )}
                    >
                      {s.n}
                    </span>
                    <span style={css(`flex:1;height:2px;background:${s.line}`)}></span>
                  </div>
                  <strong style={css(`font-size:15px;color:${s.color}`)}>{s.label}</strong>
                  <span className={cx('sub num')}>{s.when}</span>
                </li>
              ))}
            </ol>
          </section>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <div style={{ flex: '999 1 600px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <section className={cx('panel')} style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700' }}>주문 상품</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className={cx('num')}>
                    <thead>
                      <tr>
                        <th>상품</th>
                        <th>판매자</th>
                        <th>단가</th>
                        <th>수량</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>약산성 수분 진정 토너 300ml</td>
                        <td>온결</td>
                        <td>18,900원</td>
                        <td>1</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>18,900원</td>
                      </tr>
                      <tr>
                        <td>시카 리페어 크림 50ml</td>
                        <td>무드랩</td>
                        <td>27,000원</td>
                        <td>2</td>
                        <td style={{ textAlign: 'right', fontWeight: '700' }}>54,000원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <section className={cx('panel')} style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: '700' }}>결제 시도</h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className={cx('num')}>
                    <thead>
                      <tr>
                        <th>시각</th>
                        <th>결과</th>
                        <th>내용</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>14:03</td>
                        <td>
                          <span className={cx('chip c-low')}>잔액 부족</span>
                        </td>
                        <td>48,000원 보유, 24,900원 부족</td>
                        <td style={{ textAlign: 'right' }}>72,900원</td>
                      </tr>
                      <tr>
                        <td>14:06</td>
                        <td>
                          <span className={cx('chip c-ok')}>결제 완료</span>
                        </td>
                        <td>예치금에서 결제, 구매 확정까지 보관</td>
                        <td style={{ textAlign: 'right' }}>72,900원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              {showReturn && (
                <>
                  <section
                    id="return"
                    className={cx('panel')}
                    style={{
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      outline: '2px solid #26262C',
                    }}
                  >
                    <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>반품 요청</h2>
                    <p className={cx('sub')} style={{ margin: '0' }}>
                      주문 전체를 반품해요. 한 주문에 한 번만 요청할 수 있어요.
                    </p>
                    <div>
                      <label
                        htmlFor="rs"
                        style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}
                      >
                        사유
                      </label>
                      <select id="rs" className={cx('in')} style={{ width: '100%', maxWidth: '320px' }}>
                        <option>단순 변심</option>
                        <option>상품 불량</option>
                        <option>오배송</option>
                        <option>기타</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="rd"
                        style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}
                      >
                        자세한 내용
                      </label>
                      <textarea
                        id="rd"
                        className={cx('in')}
                        style={{ width: '100%', minHeight: '96px', padding: '12px 14px' }}
                      ></textarea>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className={cx('btn')} onClick={closeReturn}>
                        닫기
                      </button>
                      <button className={cx('btn btn-p')}>반품 요청하기</button>
                    </div>
                  </section>
                </>
              )}
            </div>
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>결제 정보</h2>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={cx('sub')} style={{ fontSize: '15px' }}>
                  결제 수단
                </span>
                <span>예치금</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span className={cx('sub')} style={{ fontSize: '15px' }}>
                  결제 금액
                </span>
                <strong className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
                  72,900원
                </strong>
              </div>
              <div style={{ background: '#FAFAFB', borderRadius: '8px', padding: '14px', fontSize: '14px' }}>
                {st.hold}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
