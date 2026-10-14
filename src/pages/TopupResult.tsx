import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
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
    title: '30,000원을 충전했어요',
    desc: '이제 주문 ORD-20261009-0142를 결제할 수 있어요.',
    iconBg: 'background:#E3F5EC;color:#1C6B47',
    k3: '사용할 수 있는 예치금',
    v3: '78,000원',
  },
  실패: {
    fail: true,
    title: '충전하지 못했어요',
    desc: '결제를 취소해서 충전되지 않았어요. 빠져나간 돈은 없어요.',
    iconBg: 'background:#EFEFF3;color:#45454F',
    k3: '사유',
    v3: '사용자 취소',
  },
}

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useTopupResultView({ result = '완료' }: { result?: TopupResultState }) {
  const s: View = {
    wait: false,
    done: false,
    fail: false,
    title: '',
    desc: '',
    iconBg: '',
    k3: '',
    v3: '',
    ...RESULT[result],
  }
  const view = { s }
  return view
}

/** 충전 결과 */
export default function TopupResultPage(props: { result?: TopupResultState }) {
  const view = useTopupResultView(props)
  const { s } = view
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
              <dd style={{ margin: '0', textAlign: 'right' }}>TOPUP-0918</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                충전 금액
              </dt>
              <dd style={{ margin: '0', textAlign: 'right', fontWeight: '700' }}>30,000원</dd>
              <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                {s.k3}
              </dt>
              <dd style={{ margin: '0', textAlign: 'right' }}>{s.v3}</dd>
            </dl>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {s.done && (
                <>
                  <Link className={cx('btn btn-p')} to="/checkout" style={{ minHeight: '56px', fontSize: '17px' }}>
                    주문서로 돌아가 결제하기
                  </Link>
                  <Link className={cx('btn btn-q')} to="/wallet">
                    예치금 보기
                  </Link>
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
