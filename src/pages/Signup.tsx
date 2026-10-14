import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { login } from '../lib/auth'
import { makeCx } from '../lib/ui'
import styles from './Signup.module.css'

const cx = makeCx(styles)

/** 백엔드 정책과 맞춘 값 (application.yaml custom.member) */
const CODE_TTL_SEC = 5 * 60
const RESEND_SEC = 60
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!-/:-@[-`{-~])[!-~]{8,20}$/

type Step = 1 | 2 | 3

/** 1초마다 줄어드는 남은 시간(초) */
function useCountdown(until: number | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!until) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [until])
  return until ? Math.max(0, Math.ceil((until - now) / 1000)) : 0
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function stepStyle(on: boolean) {
  return on
    ? { borderTop: '3px solid #8A6A2C', paddingTop: '8px', color: '#8A6A2C', fontWeight: '700' }
    : { borderTop: '3px solid #E8E8ED', paddingTop: '8px', color: '#5F5F6A' }
}

/** 회원가입 */
export default function SignupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)

  const [email, setEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [verificationToken, setVerificationToken] = useState('')

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [pending, setPending] = useState<'' | 'code' | 'verify' | 'signup'>('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const left = useCountdown(expiresAt)
  const resendLeft = useCountdown(resendAt)

  /** 1단계: 중복 확인 후 인증코드 발송 */
  async function sendCode() {
    const value = email.trim()
    if (!value) return setEmailMsg({ ok: false, text: '이메일을 입력해 주세요.' })
    setPending('code')
    setEmailMsg(null)
    try {
      await api('/api/v1/auth/email/check', { method: 'POST', body: { email: value } })
      await api('/api/v1/auth/email/code', { method: 'POST', body: { email: value } })
      setEmailMsg({ ok: true, text: '가입할 수 있는 이메일이에요. 인증코드를 보냈어요.' })
      setExpiresAt(Date.now() + CODE_TTL_SEC * 1000)
      setResendAt(Date.now() + RESEND_SEC * 1000)
      setCode('')
      setCodeMsg(null)
      setStep(2)
    } catch (e) {
      setEmailMsg({ ok: false, text: errorMessage(e) })
    } finally {
      setPending('')
    }
  }

  /** 2단계: 인증코드 확인 */
  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) return setCodeMsg({ ok: false, text: '인증코드 숫자 6자리를 입력해 주세요.' })
    setPending('verify')
    setCodeMsg(null)
    try {
      const d = await api<{ verificationToken: string }>('/api/v1/auth/email/verify', {
        method: 'POST',
        body: { email: email.trim(), code },
      })
      setVerificationToken(d.verificationToken)
      setCodeMsg({ ok: true, text: '이메일 인증이 완료됐어요.' })
      setExpiresAt(null)
      setStep(3)
    } catch (e) {
      setCodeMsg({ ok: false, text: errorMessage(e) })
    } finally {
      setPending('')
    }
  }

  const pwRuleOk = PASSWORD_RULE.test(password)
  const pwMatch = password.length > 0 && password === password2
  const canSubmit = step === 3 && pwRuleOk && pwMatch && name.trim().length > 0 && agree && !pending

  /** 3단계: 가입 → 바로 로그인 */
  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setPending('signup')
    setSubmitError('')
    try {
      await api('/api/v1/auth/signup', {
        method: 'POST',
        body: { email: email.trim(), password, name: name.trim(), verificationToken },
      })
      try {
        await login(email.trim(), password)
        navigate('/', { replace: true })
      } catch {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      setSubmitError(errorMessage(err))
    } finally {
      setPending('')
    }
  }

  /** 이메일을 바꾸면 처음부터 다시 */
  function changeEmail(v: string) {
    setEmail(v)
    if (step !== 1) {
      setStep(1)
      setVerificationToken('')
      setExpiresAt(null)
      setCodeMsg(null)
    }
    setEmailMsg(null)
  }

  const msgColor = (ok: boolean) => (ok ? '#1C6B47' : '#A33A1F')

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 24px 64px', boxSizing: 'border-box' }}>
        <form
          onSubmit={onSubmit}
          className={cx('panel')}
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <Link
            to="/"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#26262C', textDecoration: 'none' }}
          >
            <img
              src="/images/logo.png"
              alt="Palette"
              width="164"
              height="56"
              style={{ display: 'block', height: '56px', width: 'auto' }}
            />
          </Link>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700' }}>회원가입</h1>
          <ol
            style={{
              listStyle: 'none',
              margin: '0',
              padding: '0',
              display: 'grid',
              gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
              gap: '8px',
              fontSize: '13px',
            }}
          >
            <li style={stepStyle(step >= 1)}>1 이메일 확인</li>
            <li style={stepStyle(step >= 2)}>2 인증코드</li>
            <li style={stepStyle(step >= 3)}>3 정보 입력</li>
          </ol>

          {/* 1. 이메일 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="se" style={{ fontSize: '14px', fontWeight: '500' }}>
              이메일
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="se"
                className={cx('in')}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => changeEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && step === 1) {
                    e.preventDefault()
                    void sendCode()
                  }
                }}
                placeholder="you@example.com"
                style={{ flex: '1', minWidth: '0' }}
              />
              <button
                type="button"
                className={cx('btn')}
                onClick={sendCode}
                disabled={pending === 'code' || step !== 1}
              >
                {pending === 'code' ? '확인 중…' : '중복 확인'}
              </button>
            </div>
            {emailMsg && (
              <span role="status" style={{ fontSize: '13px', color: msgColor(emailMsg.ok), fontWeight: '500' }}>
                {emailMsg.text}
              </span>
            )}
          </div>

          {/* 2. 인증코드 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              opacity: step >= 2 ? 1 : 0.5,
            }}
          >
            <label htmlFor="sc" style={{ fontSize: '14px', fontWeight: '500' }}>
              인증코드 6자리
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="sc"
                className={cx('in num')}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                disabled={step !== 2}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void verifyCode()
                  }
                }}
                style={{ flex: '1', minWidth: '0', letterSpacing: '4px' }}
              />
              <button
                type="button"
                className={cx('btn btn-p')}
                onClick={verifyCode}
                disabled={step !== 2 || pending === 'verify' || left === 0}
              >
                {pending === 'verify' ? '확인 중…' : '확인'}
              </button>
            </div>
            {step === 2 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span className={cx('num')} style={{ color: '#A33A1F', fontWeight: '500' }}>
                  {left > 0 ? `${mmss(left)} 남음` : '인증 시간이 지났어요. 코드를 다시 받아 주세요.'}
                </span>
                <button
                  type="button"
                  className={cx('btn btn-q')}
                  onClick={() => {
                    setStep(1)
                    void sendCode()
                  }}
                  disabled={resendLeft > 0 || pending === 'code'}
                  style={{ minHeight: '28px', padding: '0', fontSize: '13px' }}
                >
                  {resendLeft > 0 ? `${resendLeft}초 후 다시 받기` : '코드 다시 받기'}
                </button>
              </div>
            )}
            {codeMsg && (
              <span role="status" style={{ fontSize: '13px', color: msgColor(codeMsg.ok), fontWeight: '500' }}>
                {codeMsg.text}
              </span>
            )}
          </div>

          {/* 3. 정보 입력 */}
          <fieldset
            disabled={step !== 3}
            style={{
              border: 'none',
              margin: '0',
              padding: '20px 0 0',
              borderTop: '1px solid #E8E8ED',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              opacity: step === 3 ? 1 : 0.5,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="p1" style={{ fontSize: '14px', fontWeight: '500' }}>
                비밀번호
              </label>
              <input
                id="p1"
                className={cx('in')}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%' }}
              />
              <span className={cx('sub')} style={password && !pwRuleOk ? { color: '#A33A1F' } : undefined}>
                영문, 숫자, 특수문자를 섞어 8~20자
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="p2" style={{ fontSize: '14px', fontWeight: '500' }}>
                비밀번호 확인
              </label>
              <input
                id="p2"
                className={cx('in')}
                type="password"
                autoComplete="new-password"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                style={{ width: '100%' }}
              />
              {password2 && !pwMatch && (
                <span style={{ fontSize: '13px', color: '#A33A1F' }}>비밀번호가 서로 달라요.</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="nm" style={{ fontSize: '14px', fontWeight: '500' }}>
                이름
              </label>
              <input
                id="nm"
                className={cx('in')}
                type="text"
                autoComplete="name"
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <label style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                style={{ width: '20px', height: '20px', accentColor: '#8A6A2C' }}
              />
              이용약관과 개인정보 처리방침에 동의해요 (필수)
            </label>
          </fieldset>

          {submitError && (
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
              {submitError}
            </p>
          )}
          <button
            type="submit"
            className={cx('btn btn-p')}
            disabled={!canSubmit}
            style={{ minHeight: '52px', fontSize: '16px' }}
          >
            {pending === 'signup' ? '가입하는 중…' : '가입하기'}
          </button>
          <p className={cx('sub')} style={{ margin: '0', textAlign: 'center' }}>
            가입하면 예치금 지갑이 함께 만들어져요.
          </p>
          <p style={{ margin: '0', textAlign: 'center', fontSize: '14px', color: '#5F5F6A' }}>
            이미 회원이신가요?{' '}
            <Link to="/login" style={{ fontWeight: '700' }}>
              로그인
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
