import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import { errorMessage } from '../lib/api'
import { makeCx } from '../lib/ui'
import { kakaoEnabled, startKakao } from '../lib/kakao'
import type { KakaoLoginState } from './KakaoCallback'
import styles from './Login.module.css'

const cx = makeCx(styles)

/** 카카오 말풍선 심볼 (카카오 로그인 디자인 가이드) */
function KakaoSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#000"
        d="M9 1.5C4.58 1.5 1 4.3 1 7.75c0 2.2 1.46 4.13 3.67 5.24l-.93 3.42c-.08.3.26.54.52.37l4.07-2.7c.22.02.44.03.67.03 4.42 0 8-2.8 8-6.36S13.42 1.5 9 1.5z"
      />
    </svg>
  )
}

/** 로그인 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // 카카오 로그인이 실패해 콜백 화면에서 돌아온 경우 그 안내를 먼저 보여 준다
  const [error, setError] = useState((location.state as KakaoLoginState | null)?.kakaoError ?? '')
  const [pending, setPending] = useState(false)
  // 로그인이 필요한 화면에서 왔으면 로그인 뒤 그 화면으로 돌아간다 (카카오 로그인도 같음)
  const from = (location.state as { from?: string } | null)?.from

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      await login(email.trim(), password)
      // 로그인이 필요한 화면(RequireRole)이나 상품 상세의 장바구니 담기에서 왔으면 그 화면으로 돌아가요.
      navigate(from?.startsWith('/') ? from : '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className={styles.page}>
      <div
        style={{
          minHeight: '820px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          boxSizing: 'border-box',
        }}
      >
        <form
          onSubmit={onSubmit}
          className={cx('panel')}
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#26262C',
              textDecoration: 'none',
              alignSelf: 'center',
            }}
          >
            <img
              src="/images/logo.png"
              alt="Palette"
              width="164"
              height="56"
              style={{ display: 'block', height: '56px', width: 'auto' }}
            />
          </Link>
          <h1 style={{ margin: '8px 0 0', fontSize: '22px', fontWeight: '700', textAlign: 'center' }}>로그인</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="em" style={{ fontSize: '14px', fontWeight: '500' }}>
              이메일
            </label>
            <input
              id="em"
              className={cx('in')}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="pw" style={{ fontSize: '14px', fontWeight: '500' }}>
              비밀번호
            </label>
            <input
              id="pw"
              className={cx('in')}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {error && (
            <p
              role="alert"
              style={{
                margin: '0',
                padding: '12px 14px',
                borderRadius: '8px',
                background: '#FFF1E8',
                color: '#9A3209',
                fontSize: '14px',
              }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            className={cx('btn btn-p')}
            disabled={pending}
            style={{ minHeight: '52px', fontSize: '16px' }}
          >
            {pending ? '로그인 중…' : '로그인'}
          </button>
          {kakaoEnabled && (
            <>
              <div
                aria-hidden="true"
                style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#83838F', fontSize: '13px' }}
              >
                <span style={{ flex: '1', borderTop: '1px solid #E8E8ED' }} />
                또는
                <span style={{ flex: '1', borderTop: '1px solid #E8E8ED' }} />
              </div>
              <button
                type="button"
                className={cx('btn btn-kakao')}
                onClick={() => {
                  setError('')
                  startKakao('login', from)
                }}
                style={{ minHeight: '52px', fontSize: '16px' }}
              >
                <KakaoSymbol />
                카카오로 로그인
              </button>
            </>
          )}
          <p style={{ margin: '0', textAlign: 'center', fontSize: '14px', color: '#5F5F6A' }}>
            처음이신가요?{' '}
            <Link to="/signup" style={{ fontWeight: '700' }}>
              회원가입
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
