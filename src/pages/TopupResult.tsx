import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../lib/api'
import {
  clearPendingTopup,
  confirmTopup,
  failTopup,
  getTopup,
  getTopups,
  readPendingTopup,
  type TopupStatus,
} from '../lib/api/wallet'
import { makeCx, css, won } from '../lib/ui'
import styles from './TopupResult.module.css'
import BuyerHeader from '../components/BuyerHeader'

export type TopupResultState = '확인 중' | '완료' | '실패'
type View = {
  wait: boolean
  done: boolean
  fail: boolean
  title: string
  desc: string
  iconBg: string
  k3: string
  v3: string
}
const RESULT: Record<TopupResultState, Partial<View>> = {
  '확인 중': {
    wait: true,
    title: '충전을 확인하고 있어요',
    desc: '토스페이먼츠의 승인 결과를 기다리고 있어요. 화면을 닫아도 승인되면 예치금에 들어와요.',
    iconBg: 'background:#FFF1E8;color:#A33A1F',
    k3: '상태',
    v3: '승인 확인 중',
  },
  완료: {
    done: true,
    title: '충전했어요', // 실제 문구는 useTopupResultView에서 금액을 넣어 만들어요
    desc: '이제 예치금으로 결제할 수 있어요.',
    iconBg: 'background:#E3F5EC;color:#1C6B47',
    k3: '사용할 수 있는 예치금',
    v3: '-',
  },
  실패: {
    fail: true,
    title: '충전하지 못했어요',
    desc: '결제가 끝나지 않아 충전되지 않았어요. 빠져나간 돈은 없어요.',
    iconBg: 'background:#EFEFF3;color:#45454F',
    k3: '사유',
    v3: '-',
  },
}

const cx = makeCx(styles)

const toResult = (s: TopupStatus): TopupResultState =>
  s === 'DONE' ? '완료' : s === 'PROCESSING' || s === 'READY' ? '확인 중' : '실패'

type Info = { orderId: string; amount: number; balance: number | null; reason: string }

/**
 * 토스가 돌려보낸 URL을 읽고 승인·실패 기록 API를 한 번 불러요.
 * - 성공: ?paymentKey&orderId&amount            → 승인(confirm). 승인이 안 되면(거절·이미 처리됨) 상세 조회
 * - 실패: ?topupId&code&message(&orderId)       → 실패 기록(fail) 후 상세 조회
 * - 새로고침: ?topupId                          → 상세 조회
 */
function useTopupResultView() {
  const [params, setParams] = useSearchParams()
  const started = useRef(false)
  const [result, setResult] = useState<TopupResultState>('확인 중')
  const [info, setInfo] = useState<Info>({ orderId: '', amount: 0, balance: null, reason: '' })
  const [error, setError] = useState('')
  const pending = readPendingTopup()
  const orderNo = params.get('orderNo') ?? pending?.orderNo ?? null // TODO 주문서에서 잔액 부족으로 왔을 때만 값이 있어요. 주문서가 /wallet?orderId=주문번호&shortage=부족금액으로 넘겨야 함

  useEffect(() => {
    if (started.current) return // StrictMode에서 두 번 실행되면 승인 API가 409가 나서 막아요
    started.current = true
    const paymentKey = params.get('paymentKey')
    const orderId = params.get('orderId')
    const amount = Number(params.get('amount'))
    const code = params.get('code')
    // failUrl에 붙인 topupId가 우선, 없으면 결제 요청 전에 저장해 둔 값
    const topupId = Number(params.get('topupId')) || pending?.topupId || 0

    /** 상세를 다시 읽어 화면에 반영하고, URL을 ?topupId로 바꿔 새로고침해도 같은 화면이 나오게 해요 */
    async function showTopup(id: number) {
      const t = await getTopup(id)
      setInfo({ orderId: t.orderId, amount: t.amount, balance: null, reason: t.failReason ?? '' })
      setResult(toResult(t.status))
      setParams({ topupId: String(id), ...(orderNo ? { orderNo } : {}) }, { replace: true })
      clearPendingTopup()
    }

    /** 토스 주문번호로 충전 건을 찾아요. 저장해 둔 값이 없으면(다른 탭·북마크로 다시 연 경우) 최근 충전 내역에서 찾아요 */
    async function findTopupId(tossOrderId: string) {
      if (pending?.orderId === tossOrderId) return pending.topupId
      const recent = await getTopups({ size: 20 })
      return recent.items.find((t) => t.orderId === tossOrderId)?.topupId ?? null
    }

    async function run() {
      try {
        if (paymentKey && orderId) {
          try {
            const r = await confirmTopup({ paymentKey, orderId, amount })
            setInfo({ orderId: r.orderId, amount: r.amount, balance: r.balance, reason: '' })
            setResult(toResult(r.status))
            setParams({ topupId: String(r.topupId), ...(orderNo ? { orderNo } : {}) }, { replace: true })
            clearPendingTopup()
            return
          } catch (e) {
            // 네트워크 오류·5xx는 결과를 알 수 없어요. 토스는 이미 결제했고 백엔드가 PROCESSING으로 두었을 수 있어요
            const unknown = !(e instanceof ApiError) || e.status === 0 || e.status >= 500
            // 승인이 안 됐거나(409 이미 처리됨, 400 카드사 거절·금액 불일치) 결과를 모를 때는 충전 건의 실제 상태와 사유를 보여 줘요.
            // URL도 ?topupId로 바뀌어서 새로고침해도 승인 API를 다시 부르지 않아요
            if (unknown || (e instanceof ApiError && (e.status === 409 || e.status === 400))) {
              try {
                const id = await findTopupId(orderId)
                if (id) {
                  await showTopup(id)
                  return
                }
              } catch {
                // 상태를 못 읽으면 아래에서 처리해요
              }
            }
            if (unknown) {
              // 상태도 못 읽었으면 실패가 아니라 확인 중으로 안내해요 (승인되면 예치금에 들어와요)
              setInfo({ orderId, amount, balance: null, reason: '' })
              setResult('확인 중')
              return
            }
            throw e
          }
        }
        if (topupId && code) {
          // 실패 URL로 돌아온 경우: 토스 에러 코드·메시지를 그대로 기록해요 (이미 처리된 건이면 409라 무시)
          await failTopup(topupId, { code, message: params.get('message') ?? undefined }).catch((e) => {
            if (!(e instanceof ApiError && e.status === 409)) throw e
          })
        }
        if (topupId) {
          await showTopup(topupId)
          return
        }
        setError('충전 정보를 찾지 못했어요. 예치금 화면에서 충전 내역을 확인해 주세요.')
        setResult('실패')
      } catch (e) {
        // 404: 다른 사람의 충전 건이거나 없는 충전 건
        setError(errorMessage(e))
        setResult('실패')
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const base = RESULT[result]
  const s: View = {
    wait: false,
    done: false,
    fail: false,
    title: '',
    desc: '',
    iconBg: '',
    k3: '',
    v3: '',
    ...base,
    ...(result === '완료' && {
      title: `${won(info.amount)}원을 충전했어요`,
      desc: orderNo ? `이제 주문 ${orderNo}를 결제할 수 있어요.` : '이제 예치금으로 결제할 수 있어요.',
      v3: info.balance !== null ? `${won(info.balance)}원` : '예치금 화면에서 확인해 주세요',
    }),
    ...(result === '실패' && { desc: error || base.desc, v3: info.reason || '-' }),
  }
  return { s, info, orderNo }
}

/** 충전 결과 */
export default function TopupResultPage() {
  const { s, info, orderNo } = useTopupResultView()
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="wallet" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '56px 24px 72px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <section
            className={cx('panel')}
            style={{
              maxWidth: '520px',
              width: '100%',
              margin: '0 auto',
              padding: '40px 36px',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={css(
                `width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;${s.iconBg}`,
              )}
            >
              {s.wait && (
                <>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 8v4l3 2" />
                  </svg>
                </>
              )}
              {s.done && (
                <>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                </>
              )}
              {s.fail && (
                <>
                  <svg
                    width="30"
                    height="30"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M7 7l10 10M17 7 7 17" />
                  </svg>
                </>
              )}
            </div>
            <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>{s.title}</h1>
            <p style={{ margin: '0', color: '#45454F', maxWidth: '380px' }}>{s.desc}</p>
            <dl
              className={cx('num')}
              style={{
                margin: '0',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '10px 16px',
                textAlign: 'left',
                background: '#FAFAFB',
                borderRadius: '10px',
                padding: '18px',
                fontSize: '14px',
              }}
            >
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                충전번호
              </dt>
              <dd style={{ margin: '0', textAlign: 'right' }} title={info.orderId}>
                {info.orderId ? info.orderId.slice(0, 13) : '-'}
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                충전 금액
              </dt>
              <dd style={{ margin: '0', textAlign: 'right', fontWeight: '700' }}>
                {info.amount ? `${won(info.amount)}원` : '-'}
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                {s.k3}
              </dt>
              <dd style={{ margin: '0', textAlign: 'right' }}>{s.v3}</dd>
            </dl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {s.done && (
                <>
                  {orderNo ? (
                    <>
                      <Link className={cx('btn btn-p')} to="/checkout" style={{ minHeight: '56px', fontSize: '17px' }}>
                        주문서로 돌아가 결제하기
                      </Link>
                      <Link className={cx('btn btn-q')} to="/wallet">
                        예치금 보기
                      </Link>
                    </>
                  ) : (
                    <Link className={cx('btn btn-p')} to="/wallet" style={{ minHeight: '56px', fontSize: '17px' }}>
                      예치금 보기
                    </Link>
                  )}
                </>
              )}
              {s.fail && (
                <>
                  <Link className={cx('btn btn-p')} to="/wallet" style={{ minHeight: '56px', fontSize: '17px' }}>
                    다시 충전하기
                  </Link>
                </>
              )}
              {s.wait && (
                <>
                  <Link className={cx('btn')} to="/wallet" style={{ minHeight: '56px' }}>
                    예치금으로 가기
                  </Link>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
