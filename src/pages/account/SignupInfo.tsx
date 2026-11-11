import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { api, errorMessage } from '../../lib/api'
import { login } from '../../lib/auth'
import { SignupSteps, type SignupVerified } from './Signup'
import { afterLoginPath } from './util'
import s from './account.module.css'

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!-/:-@[-`{-~])[!-~]{8,20}$/
const FORM_ID = 'signup-info-form'

/** ⑬-1 회원가입 2단계: 이름·비밀번호·약관 → 가입 → 바로 로그인 */
export default function SignupInfoPage() {
  const navigate = useNavigate()
  const verified = useLocation().state as SignupVerified | null
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [agree, setAgree] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  // 이메일 인증 없이 들어오면(새로고침·주소 직접 입력) 1단계부터
  if (!verified?.verificationToken) return <Navigate to="/signup" replace />

  const pwRuleOk = PASSWORD_RULE.test(password)
  const pwMatch = password.length > 0 && password === password2
  const canSubmit = pwRuleOk && pwMatch && name.trim().length > 0 && agree && !pending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit || !verified) return
    setPending(true)
    setError('')
    try {
      await api('/api/v1/auth/signup', {
        method: 'POST',
        body: { email: verified.email, password, name: name.trim(), verificationToken: verified.verificationToken },
      })
      try {
        const me = await login(verified.email, password)
        navigate(afterLoginPath(me), { replace: true })
      } catch {
        navigate('/login', { replace: true })
      }
    } catch (err) {
      setError(errorMessage(err))
      setPending(false)
    }
  }

  return (
    <AppFrame
      bottom={
        <BottomBar plain>
          <div className={s.stack}>
            <Button type="submit" form={FORM_ID} size="lg" disabled={!canSubmit}>
              {pending ? '가입하는 중…' : '가입하기'}
            </Button>
            <button type="button" className={s.textBtn} onClick={() => navigate('/signup', { replace: true })}>
              이메일 다시 입력하기
            </button>
          </div>
        </BottomBar>
      }
    >
      <PageHeader title="회원가입" back="/signup" />
      <SignupSteps step={2} />
      <form id={FORM_ID} className={s.stepBody} onSubmit={onSubmit}>
        <h2 className={s.bigTitle}>정보를 입력해 주세요</h2>
        <p className={s.verified}>
          <Icon name="check" size={14} />
          {verified.email} · 인증 완료
        </p>

        <label htmlFor="su-name" className={s.fLabel}>
          이름
        </label>
        <div className={s.fRow}>
          <input
            id="su-name"
            className={s.authInput}
            autoComplete="name"
            placeholder="이름"
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <label htmlFor="su-pw1" className={s.fLabel}>
          비밀번호
        </label>
        <div className={s.fRow}>
          <input
            id="su-pw1"
            className={s.authInput}
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호"
            aria-describedby="su-pw-hint"
            aria-invalid={password.length > 0 && !pwRuleOk}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <p id="su-pw-hint" className={password && !pwRuleOk ? s.fErr : s.fHelp}>
          영문, 숫자, 특수문자를 섞어 8~20자
        </p>

        <label htmlFor="su-pw2" className={s.fLabel}>
          비밀번호 확인
        </label>
        <div className={s.fRow}>
          <input
            id="su-pw2"
            className={s.authInput}
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호 확인"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </div>
        {password2 && !pwMatch && <p className={s.fErr}>비밀번호가 서로 달라요.</p>}

        <label className={s.agree}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          이용약관과 개인정보 처리방침에 동의해요 <span>(필수)</span>
        </label>
        {error && (
          <p role="alert" className={s.alert}>
            {error}
          </p>
        )}
      </form>
    </AppFrame>
  )
}
