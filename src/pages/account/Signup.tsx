import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { api, errorMessage } from '../../lib/api'
import { mmss } from '../../lib/useRemaining'
import { useCountdown } from './util'
import s from './account.module.css'

/** 백엔드 정책과 맞춘 값 (application.yaml custom.member) */
const CODE_TTL_SEC = 5 * 60
const RESEND_SEC = 60

/** 이메일 인증을 마친 뒤 정보 입력 화면(/signup/info)으로 넘기는 값 */
export type SignupVerified = { email: string; verificationToken: string }

type Msg = { ok: boolean; text: string } | null

export function SignupSteps({ step }: { step: 1 | 2 }) {
  return (
    <ol aria-label="가입 단계" className={s.steps}>
      <li aria-current={step === 1 ? 'step' : undefined} className={`${s.step} ${s.stepOn}`}>
        1 이메일 확인
      </li>
      <li aria-current={step === 2 ? 'step' : undefined} className={`${s.step} ${step === 2 ? s.stepOn : ''}`}>
        2 정보 입력
      </li>
    </ol>
  )
}

/** ⑬ 회원가입 1단계: 이메일 중복 확인 → 인증코드 발송 → 확인 */
export default function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [emailMsg, setEmailMsg] = useState<Msg>(null)
  const [sent, setSent] = useState(false)
  const [code, setCode] = useState('')
  const [codeMsg, setCodeMsg] = useState<Msg>(null)
  const [token, setToken] = useState('')
  const [pending, setPending] = useState<'' | 'code' | 'verify'>('')
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [resendAt, setResendAt] = useState<number | null>(null)
  const left = useCountdown(expiresAt)
  const resendLeft = useCountdown(resendAt)

  /** 중복 확인 후 인증코드 발송 (다시 받기도 같음) */
  async function sendCode() {
    const value = email.trim()
    if (!value) return setEmailMsg({ ok: false, text: '이메일을 입력해 주세요.' })
    setPending('code')
    setEmailMsg(null)
    try {
      await api('/api/v1/auth/email/check', { method: 'POST', body: { email: value } })
      await api('/api/v1/auth/email/code', { method: 'POST', body: { email: value } })
      setEmailMsg({ ok: true, text: '가입할 수 있는 이메일이에요. 인증코드를 보냈어요.' })
      setSent(true)
      setExpiresAt(Date.now() + CODE_TTL_SEC * 1000)
      setResendAt(Date.now() + RESEND_SEC * 1000)
      setCode('')
      setCodeMsg(null)
      setToken('')
    } catch (e) {
      setEmailMsg({ ok: false, text: errorMessage(e) })
    } finally {
      setPending('')
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) return setCodeMsg({ ok: false, text: '인증코드 숫자 6자리를 입력해 주세요.' })
    setPending('verify')
    setCodeMsg(null)
    try {
      const d = await api<{ verificationToken: string }>('/api/v1/auth/email/verify', {
        method: 'POST',
        body: { email: email.trim(), code },
      })
      setToken(d.verificationToken)
      setCodeMsg({ ok: true, text: '이메일 인증이 완료됐어요.' })
      setExpiresAt(null)
    } catch (e) {
      setCodeMsg({ ok: false, text: errorMessage(e) })
    } finally {
      setPending('')
    }
  }

  /** 이메일을 바꾸면 처음부터 다시 */
  function changeEmail(v: string) {
    setEmail(v)
    setSent(false)
    setToken('')
    setExpiresAt(null)
    setCodeMsg(null)
    setEmailMsg(null)
  }

  const next = () =>
    navigate('/signup/info', { state: { email: email.trim(), verificationToken: token } satisfies SignupVerified })

  return (
    <AppFrame
      tabBar={false}
      bottom={
        <BottomBar
          plain
          note={
            <>
              이미 회원이신가요?{' '}
              <Link to="/login" className={s.inlineLink}>
                로그인
              </Link>
            </>
          }
        >
          <Button size="lg" disabled={!token} onClick={next}>
            다음
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="회원가입" back="/login" />
      <SignupSteps step={1} />
      <div className={s.stepBody}>
        <h2 className={s.bigTitle}>이메일을 인증해 주세요</h2>
        <p className={s.lead}>가입하면 예치금 지갑이 함께 만들어져요.</p>

        <label htmlFor="su-email" className={s.fLabel}>
          이메일
        </label>
        <div className={s.fRow}>
          <input
            id="su-email"
            className={s.authInput}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => changeEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !sent) {
                e.preventDefault()
                void sendCode()
              }
            }}
          />
          <Button variant="outline" onClick={sendCode} disabled={pending === 'code' || sent}>
            {pending === 'code' ? '확인 중…' : '중복 확인'}
          </Button>
        </div>
        {emailMsg && (
          <p role="status" className={emailMsg.ok ? s.fOk : s.fErr}>
            {emailMsg.ok && <Icon name="check" size={14} />}
            {emailMsg.text}
          </p>
        )}

        {sent && (
          <>
            <label htmlFor="su-code" className={s.fLabel}>
              인증코드
            </label>
            <div className={s.fRow}>
              <div className={s.codeBox}>
                <input
                  id="su-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="인증코드 6자리"
                  disabled={!!token}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void verifyCode()
                    }
                  }}
                />
                {!token && <span className={s.timer}>{mmss(left)}</span>}
              </div>
              <Button onClick={verifyCode} disabled={!!token || pending === 'verify' || left === 0}>
                {pending === 'verify' ? '확인 중…' : '확인'}
              </Button>
            </div>
            {codeMsg && (
              <p role="status" className={codeMsg.ok ? s.fOk : s.fErr}>
                {codeMsg.ok && <Icon name="check" size={14} />}
                {codeMsg.text}
              </p>
            )}
            {!token && (
              <p className={s.resend}>
                {left === 0 ? '인증 시간이 지났어요.' : '코드가 오지 않았나요?'}
                <button
                  type="button"
                  className={s.textBtn}
                  disabled={resendLeft > 0 || pending === 'code'}
                  onClick={sendCode}
                >
                  {resendLeft > 0 ? `${resendLeft}초 후 다시 받기` : '코드 다시 받기'}
                </button>
              </p>
            )}
          </>
        )}
      </div>
    </AppFrame>
  )
}
