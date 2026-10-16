import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk'
import { errorMessage, toPageParam } from '../lib/api'
import { failTopup, getTopups, getWallet, prepareTopup, savePendingTopup, type TopupStatus } from '../lib/api/wallet'
import { useApi } from '../lib/useApi'
import { NOTICE, css, makeCx, won } from '../lib/ui'
import styles from './Wallet.module.css'
import BuyerHeader from '../components/BuyerHeader'
import Pager from '../components/Pager'

const PRESETS = [10000, 30000, 50000, 100000]
const PRESET_ON =
  'min-height:48px;border-radius:8px;border:2px solid #26262C;background:#F3F1F6;color:#26262C;font:inherit;font-weight:700;cursor:pointer'
const PRESET_OFF =
  'min-height:48px;border-radius:8px;border:1px solid #D5D5DD;background:#fff;color:#26262C;font:inherit;font-weight:500;cursor:pointer'
const TAB_ON =
  'min-height:52px;border:none;border-bottom:2px solid #26262C;margin-bottom:-1px;background:none;font:inherit;font-weight:700;color:#26262C;cursor:pointer;padding:0'
const TAB_OFF =
  'min-height:52px;border:none;border-bottom:2px solid transparent;background:none;font:inherit;color:#5F5F6A;cursor:pointer;padding:0'
const SMALL_BTN = { minHeight: '36px', fontSize: '13px', padding: '0 12px' }

/** 토스 결제위젯이 그려질 자리 (JSX의 <div id=...>와 같아야 해요) */
const WIDGET_METHOD_ID = 'toss-payment-method'
const WIDGET_AGREEMENT_ID = 'toss-agreement'

const MIN_AMOUNT = 10000
const MAX_AMOUNT = 1000000
const PAGE_SIZE = 10

/** [칩 색, 칩 글자, 오른쪽 안내 문구] */
const TOPUP_STATUS: Record<TopupStatus, [string, string, string]> = {
  READY: ['c-mute', '결제 전', '결제를 진행하지 않았어요'],
  PROCESSING: ['c-low', '확인 중', '토스 승인을 기다리고 있어요'],
  DONE: ['c-ok', '충전 완료', ''],
  CANCELED: ['c-mute', '취소됨', '충전을 취소했어요'],
  FAILED_USER_CANCEL: ['c-mute', '실패', '결제를 취소했어요'],
  FAILED_PG_DECLINED: ['c-mute', '실패', '카드사에서 승인하지 않았어요'],
  FAILED_AMOUNT_MISMATCH: ['c-mute', '실패', '금액이 맞지 않아요'],
  FAILED_EXPIRED: ['c-mute', '실패', '결제 시간이 지났어요'],
  FAILED_SYSTEM_ERROR: ['c-mute', '실패', '일시적인 오류예요'],
}

const cx = makeCx(styles)

/** 2026-10-09T14:05:00 → 10.09 14:05 */
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 토스 결제위젯(결제수단·약관)을 화면에 한 번 그리고, 충전 금액이 바뀌면 위젯 금액도 바꿔요. */
function useTossWidgets(amount: number) {
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null)
  const started = useRef(false) // StrictMode에서 두 번 그리면 '이미 렌더링됨' 오류가 나서 막아요
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (started.current) return
    started.current = true
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined
    if (!clientKey) {
      setError('토스 클라이언트 키가 없어요. .env의 VITE_TOSS_CLIENT_KEY를 확인해 주세요.')
      return
    }
    async function init(key: string) {
      try {
        const toss = await loadTossPayments(key)
        const widgets = toss.widgets({ customerKey: ANONYMOUS })
        await widgets.setAmount({ currency: 'KRW', value: amount }) // 그리기 전에 금액이 있어야 해요
        await Promise.all([
          widgets.renderPaymentMethods({ selector: `#${WIDGET_METHOD_ID}`, variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: `#${WIDGET_AGREEMENT_ID}`, variantKey: 'AGREEMENT' }),
        ])
        widgetsRef.current = widgets
        setReady(true)
      } catch {
        setError('결제 수단을 불러오지 못했어요. 새로고침해 주세요.')
      }
    }
    init(clientKey)
    // 처음 한 번만 그려요. 이후 금액 변경은 아래 effect가 맡아요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready || amount <= 0) return
    widgetsRef.current?.setAmount({ currency: 'KRW', value: amount }).catch(() => {})
  }, [amount, ready])

  return { widgetsRef, ready, error }
}

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useWalletView() {
  const [params] = useSearchParams()
  // 주문서에서 잔액 부족으로 왔을 때만 값이 있어요 (Q3: 주문서 담당과 쿼리 이름 합의)
  const shortage = Number(params.get('shortage') ?? 0)
  const orderNo = params.get('orderId')

  const [amount, setAmount] = useState(shortage > 0 ? Math.ceil(shortage / 10000) * 10000 : 30000)
  const [tab, setTab] = useState(0)
  const [page, setPage] = useState(1)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  const toss = useTossWidgets(amount)
  const wallet = useApi(getWallet, [])
  const topups = useApi(() => getTopups({ page: toPageParam(page), size: PAGE_SIZE }), [page])

  const amountValid = amount >= MIN_AMOUNT && amount <= MAX_AMOUNT && amount % 10000 === 0

  async function startTopup() {
    const widgets = toss.widgetsRef.current
    if (!widgets || !amountValid || paying) return
    setPaying(true)
    setPayError('')
    let topupId: number | null = null
    try {
      // 1) 백엔드에 충전 건을 만들고 토스 주문번호(orderId)를 받아요
      const prepared = await prepareTopup(amount)
      topupId = prepared.topupId
      // 2) 결제 요청 전에 topupId를 저장해요 (사용자 취소 시 토스가 orderId를 안 줘요)
      savePendingTopup({ topupId: prepared.topupId, orderId: prepared.orderId, orderNo })
      await widgets.setAmount({ currency: 'KRW', value: prepared.amount })
      // 3) 결제를 요청하면 토스가 successUrl 또는 failUrl로 이동시켜요
      const back = orderNo ? `orderNo=${encodeURIComponent(orderNo)}` : ''
      await widgets.requestPayment({
        orderId: prepared.orderId,
        orderName: '팔레트 예치금 충전',
        successUrl: `${window.location.origin}/wallet/topup-result${back ? `?${back}` : ''}`,
        failUrl: `${window.location.origin}/wallet/topup-result?topupId=${prepared.topupId}${back ? `&${back}` : ''}`,
      })
      // 리다이렉트되므로 성공하면 이 아래는 실행되지 않아요
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'USER_CANCEL' && topupId !== null) {
        // 결제창(팝업)을 닫은 경우: 실패를 기록해요. 다른 SDK 오류는 15분 뒤 자동 만료돼서 호출하지 않아요
        await failTopup(topupId, { code, message: (e as Error).message }).catch(() => {})
        setPayError('결제를 취소했어요. 빠져나간 돈은 없어요.')
      } else if (code) {
        setPayError((e as Error).message || '결제를 진행하지 못했어요.') // 약관 미동의 등 토스 안내 문구
      } else {
        setPayError(errorMessage(e)) // 충전 준비 API 실패 (금액 검증 등)
      }
      topups.reload()
    } finally {
      setPaying(false)
    }
  }

  const items = topups.data?.items ?? []

  return {
    // 부족액 배너
    shortage,
    orderNo,
    // 잔액
    balance: wallet.data?.balance,
    heldAmount: wallet.data?.heldAmount,
    walletError: wallet.error,
    // 충전
    presets: PRESETS.map((v) => ({
      label: won(v / 10000) + '만 원',
      on: amount === v,
      style: amount === v ? PRESET_ON : PRESET_OFF,
      pick: () => setAmount(v),
    })),
    amountStr: won(amount),
    changeAmount: (e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
    amountValid,
    widgetReady: toss.ready,
    widgetError: toss.error,
    startTopup,
    paying,
    payError,
    // 내역
    tabs: ['충전 내역', '거래 내역'].map((label, i) => ({
      label,
      on: tab === i,
      style: tab === i ? TAB_ON : TAB_OFF,
      pick: () => setTab(i),
    })),
    tabTopup: tab === 0,
    tabLedger: tab === 1,
    topupItems: items,
    topupsLoading: topups.loading,
    topupsError: topups.error,
    topupsEmpty: !topups.loading && !topups.error && items.length === 0,
    page,
    setPage,
    totalPages: topups.data?.totalPages ?? 0,
  }
}

/** 예치금 */
export default function WalletPage() {
  const v = useWalletView()
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
          {v.shortage > 0 && v.orderNo && (
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
                주문 <span className={cx('num')}>{v.orderNo}</span> 결제에{' '}
                <strong className={cx('num')}>{won(v.shortage)}원</strong>이 모자라요. 충전 금액을 {v.amountStr}원으로
                맞춰뒀어요.
              </span>
              <Link to="/checkout" style={{ fontWeight: '700' }}>
                주문서로 돌아가기
              </Link>
            </div>
          )}
          {v.walletError && (
            <p role="alert" style={NOTICE}>
              {v.walletError}
            </p>
          )}
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
                  {v.balance === undefined ? '-' : won(v.balance)}원
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
                <strong className={cx('num')}>{v.heldAmount === undefined ? '-' : won(v.heldAmount)}원</strong>
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
                {v.presets.map((p, pIndex) => (
                  <button onClick={p.pick} aria-pressed={p.on} disabled={v.paying} style={css(p.style)} key={pIndex}>
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
                  value={v.amountStr}
                  onChange={v.changeAmount}
                  disabled={v.paying} // 결제 준비 중에 금액이 바뀌면 토스 결제 금액이 충전 건과 달라져요
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
              <span className={cx('sub')} style={v.amountValid ? undefined : { color: '#A33A1F' }}>
                1만 원 단위로 1만 원부터 100만 원까지 충전할 수 있어요.
              </span>
              {/* 토스 결제위젯이 이 두 div 안에 결제수단과 약관을 그려요 */}
              <div id={WIDGET_METHOD_ID} />
              <div id={WIDGET_AGREEMENT_ID} />
              {v.widgetError && (
                <p role="alert" style={NOTICE}>
                  {v.widgetError}
                </p>
              )}
              <button
                className={cx('btn btn-p')}
                onClick={v.startTopup}
                disabled={!v.widgetReady || !v.amountValid || v.paying}
                style={{ minHeight: '56px', fontSize: '17px' }}
              >
                {v.paying ? '결제를 준비하고 있어요…' : `토스페이먼츠로 ${v.amountStr}원 충전하기`}
              </button>
              {v.payError && (
                <p role="alert" style={NOTICE}>
                  {v.payError}
                </p>
              )}
            </section>
          </div>
          <section className={cx('panel')} style={{ padding: '8px 24px 24px' }}>
            <div role="tablist" style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #E8E8ED' }}>
              {v.tabs.map((t, tIndex) => (
                <button role="tab" aria-selected={t.on} onClick={t.pick} style={css(t.style)} key={tIndex}>
                  {t.label}
                </button>
              ))}
            </div>
            {v.tabTopup && (
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
                      {v.topupsLoading && v.topupItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                            불러오는 중이에요.
                          </td>
                        </tr>
                      )}
                      {v.topupsEmpty && (
                        <tr>
                          <td colSpan={5} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                            아직 충전한 내역이 없어요.
                          </td>
                        </tr>
                      )}
                      {v.topupItems.map((t) => {
                        const [chip, label, note] = TOPUP_STATUS[t.status]
                        const cancellable = t.status === 'DONE' && t.remainingAmount === t.amount
                        return (
                          <tr key={t.topupId}>
                            <td>{fmtDateTime(t.createdAt)}</td>
                            <td title={t.orderId}>{t.orderId.slice(0, 13)}</td>
                            <td>
                              <span className={cx('chip', chip)}>{label}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>{won(t.amount)}원</td>
                            {t.status === 'DONE' ? (
                              <td style={{ textAlign: 'right' }}>
                                {cancellable ? (
                                  // Q2: 충전 취소 API가 생기면 onClick을 연결해요
                                  <button className={cx('btn')} disabled title="준비 중이에요" style={SMALL_BTN}>
                                    충전 취소하기
                                  </button>
                                ) : (
                                  <span className={cx('sub')}>일부를 써서 취소할 수 없어요</span>
                                )}
                              </td>
                            ) : (
                              <td className={cx('sub')}>{t.failReason ?? note}</td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {v.topupsError && (
                  <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
                    {v.topupsError}
                  </p>
                )}
                <Pager page={v.page} totalPages={v.totalPages} onChange={v.setPage} buttonClassName={cx('btn')} />
              </>
            )}
            {v.tabLedger && (
              // Q1: 거래 내역 API(GET /api/v1/wallet/transactions)가 생기면 표로 바꿔요
              <p className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0', margin: '0' }}>
                거래 내역은 준비 중이에요.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
