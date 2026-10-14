import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './Wallet.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useState, type ChangeEvent } from 'react'
import { won } from '../lib/ui'

const PRESETS = [10000, 30000, 50000, 100000]
const PRESET_ON =
  'min-height:48px;border-radius:8px;border:2px solid #26262C;background:#F3F1F6;color:#26262C;font:inherit;font-weight:700;cursor:pointer'
const PRESET_OFF =
  'min-height:48px;border-radius:8px;border:1px solid #D5D5DD;background:#fff;color:#26262C;font:inherit;font-weight:500;cursor:pointer'
const TAB_ON =
  'min-height:52px;border:none;border-bottom:2px solid #26262C;margin-bottom:-1px;background:none;font:inherit;font-weight:700;color:#26262C;cursor:pointer;padding:0'
const TAB_OFF =
  'min-height:52px;border:none;border-bottom:2px solid transparent;background:none;font:inherit;color:#5F5F6A;cursor:pointer;padding:0'

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useWalletView() {
  const [amount, setAmount] = useState(30000)
  const [tab, setTab] = useState(0)
  const view = {
    presets: PRESETS.map((v) => ({
      label: won(v / 10000) + '만 원',
      on: amount === v,
      style: amount === v ? PRESET_ON : PRESET_OFF,
      pick: () => setAmount(v),
    })),
    amountStr: won(amount),
    changeAmount: (e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
    tabs: ['충전 내역', '거래 내역'].map((label, i) => ({
      label,
      on: tab === i,
      style: tab === i ? TAB_ON : TAB_OFF,
      pick: () => setTab(i),
    })),
    tabTopup: tab === 0,
    tabLedger: tab === 1,
  }
  return view
}

/** 예치금 */
export default function WalletPage() {
  const view = useWalletView()
  const { amountStr, changeAmount, presets, tabLedger, tabTopup, tabs } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="wallet" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '28px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>예치금</h1>
          <div
            style={{
              background: '#F3F1F6',
              borderRadius: '6px',
              padding: '14px 18px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 16px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              주문 <span className={cx('num')}>ORD-20261009-0142</span> 결제에{' '}
              <strong className={cx('num')}>24,900원</strong>이 모자라요. 충전 금액을 30,000원으로 맞춰뒀어요.
            </span>
            <Link to="/checkout" style={{ fontWeight: '700' }}>
              주문서로 돌아가기
            </Link>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'stretch' }}>
            <section
              className={cx('panel')}
              style={{ flex: '1 1 360px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              <div>
                <span className={cx('sub')} style={{ fontSize: '14px' }}>
                  사용할 수 있는 예치금
                </span>
                <div
                  className={cx('num')}
                  style={{ fontSize: '40px', fontWeight: '700', letterSpacing: '-1px', lineHeight: '1.2' }}
                >
                  48,000원
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #E8E8ED',
                  paddingTop: '16px',
                }}
              >
                <span>구매 확정을 기다리는 금액</span>
                <strong className={cx('num')}>72,900원</strong>
              </div>
              <p className={cx('sub')} style={{ margin: '0' }}>
                구매가 확정되면 판매자에게 넘어가고, 반품이 승인되면 예치금으로 돌아와요.
              </p>
            </section>
            <section
              className={cx('panel')}
              style={{ flex: '2 1 480px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>충전하기</h2>
              <div
                role="group"
                aria-label="충전 금액"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '8px' }}
              >
                {presets.map((p, pIndex) => (
                  <button onClick={p.pick} aria-pressed={p.on} style={css(p.style)} key={pIndex}>
                    {p.label}
                  </button>
                ))}
              </div>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  border: '1px solid #D5D5DD',
                  borderRadius: '8px',
                  padding: '0 16px',
                  minHeight: '56px',
                }}
              >
                <span className={cx('sub')} style={{ fontSize: '14px', flex: 'none' }}>
                  충전 금액
                </span>
                <input
                  className={cx('num')}
                  value={amountStr}
                  onChange={changeAmount}
                  inputMode="numeric"
                  aria-label="충전 금액"
                  style={{
                    flex: '1',
                    minWidth: '0',
                    border: 'none',
                    outline: 'none',
                    font: 'inherit',
                    fontSize: '22px',
                    fontWeight: '700',
                    textAlign: 'right',
                    background: 'transparent',
                  }}
                />
                <span style={{ fontWeight: '500' }}>원</span>
              </label>
              <span className={cx('sub')}>1만 원 단위로 1만 원부터 100만 원까지 충전할 수 있어요.</span>
              <Link
                className={cx('btn btn-p')}
                to="/wallet/topup-result"
                style={{ minHeight: '56px', fontSize: '17px' }}
              >
                토스페이먼츠로 {amountStr}원 충전하기
              </Link>
            </section>
          </div>
          <section className={cx('panel')} style={{ padding: '8px 24px 24px' }}>
            <div role="tablist" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E8E8ED' }}>
              {tabs.map((t, tIndex) => (
                <button role="tab" aria-selected={t.on} onClick={t.pick} style={css(t.style)} key={tIndex}>
                  {t.label}
                </button>
              ))}
            </div>
            {tabTopup && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className={cx('num')}>
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>충전번호</th>
                        <th>상태</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>10.09 14:05</td>
                        <td>TOPUP-0918</td>
                        <td>
                          <span className={cx('chip c-low')}>확인 중</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>30,000원</td>
                        <td className={cx('sub')}>토스 승인을 기다리고 있어요</td>
                      </tr>
                      <tr>
                        <td>10.02 10:21</td>
                        <td>TOPUP-0877</td>
                        <td>
                          <span className={cx('chip c-ok')}>충전 완료</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>50,000원</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className={cx('btn')}
                            style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                          >
                            충전 취소하기
                          </button>
                        </td>
                      </tr>
                      <tr>
                        <td>09.21 18:40</td>
                        <td>TOPUP-0802</td>
                        <td>
                          <span className={cx('chip c-ok')}>충전 완료</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>100,000원</td>
                        <td className={cx('sub')} style={{ textAlign: 'right' }}>
                          일부를 써서 취소할 수 없어요
                        </td>
                      </tr>
                      <tr>
                        <td>09.21 18:37</td>
                        <td>TOPUP-0801</td>
                        <td>
                          <span className={cx('chip c-mute')}>실패</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>100,000원</td>
                        <td className={cx('sub')}>결제를 취소했어요</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {tabLedger && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className={cx('num')}>
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>내용</th>
                        <th style={{ textAlign: 'right' }}>금액</th>
                        <th style={{ textAlign: 'right' }}>잔액</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>10.05 09:12</td>
                        <td>주문 ORD-20261005-0031 결제</td>
                        <td style={{ textAlign: 'right' }}>−52,000원</td>
                        <td style={{ textAlign: 'right' }}>48,000원</td>
                      </tr>
                      <tr>
                        <td>10.02 10:21</td>
                        <td>충전 TOPUP-0877</td>
                        <td style={{ textAlign: 'right', color: '#26262C' }}>+50,000원</td>
                        <td style={{ textAlign: 'right' }}>100,000원</td>
                      </tr>
                      <tr>
                        <td>09.28 16:30</td>
                        <td>주문 ORD-20260921-0410 반품 환불</td>
                        <td style={{ textAlign: 'right', color: '#26262C' }}>+24,000원</td>
                        <td style={{ textAlign: 'right' }}>50,000원</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
