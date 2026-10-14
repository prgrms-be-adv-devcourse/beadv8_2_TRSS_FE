import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../lib/auth'
import { errorMessage } from '../lib/api'
import { makeCx } from '../lib/ui'
import styles from './Login.module.css'

const cx = makeCx(styles)

/** 로그인 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      await login(email.trim(), password)
      navigate('/', { replace: true })
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
