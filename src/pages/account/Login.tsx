import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import { errorMessage } from '../../lib/api'
import { login } from '../../lib/auth'
import { startKakao } from '../../lib/kakao'
import type { KakaoLoginState } from './KakaoCallback'
import { afterLoginPath } from './util'
import s from './account.module.css'

/** 카카오 말풍선 심볼 (카카오 로그인 디자인 가이드) */
export function KakaoSymbol() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#000"
        d="M9 1.5C4.58 1.5 1 4.3 1 7.75c0 2.2 1.46 4.13 3.67 5.24l-.93 3.42c-.08.3.26.54.52.37l4.07-2.7c.22.02.44.03.67.03 4.42 0 8-2.8 8-6.36S13.42 1.5 9 1.5z"
      />
    </svg>
  )
}

/** ⑫ 로그인 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const st = location.state as KakaoLoginState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // 카카오 로그인이 실패해 콜백 화면에서 돌아온 경우 그 안내를 먼저 보여 준다
  const [error, setError] = useState(st?.kakaoError ?? '')
  const [pending, setPending] = useState(false)
  // 로그인이 필요한 화면(RequireRole)이나 장바구니 담기에서 왔으면 로그인 뒤 그 화면으로 돌아간다 (카카오도 같음)
  const from = st?.from

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    setError('')
    setPending(true)
    try {
      const me = await login(email.trim(), password)
      navigate(afterLoginPath(me, from), { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setPending(false)
    }
  }

  return (
    <AppFrame>
      <h1 className={s.authLogo}>
        <Link to="/">
          <img src="/images/logo.png" alt="Palette" />
        </Link>
      </h1>
      <form className={s.authForm} onSubmit={onSubmit}>
        <input
          id="login-email"
          className={s.authInput}
          type="email"
          autoComplete="email"
          placeholder="이메일"
          aria-label="이메일"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          id="login-pw"
          className={s.authInput}
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          aria-label="비밀번호"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className={s.alert}>
            {error}
          </p>
        )}
        <Button type="submit" size="lg" block className={s.authSubmit} disabled={pending}>
          {pending ? '로그인 중…' : '로그인'}
        </Button>
      </form>
      <div className={s.divider} aria-hidden="true">
        <span />
        또는
        <span />
      </div>
      <div className={s.kakaoWrap}>
        <button
          type="button"
          className={s.kakao}
          onClick={() => {
            setError('')
            // 카카오 REST API 키(VITE_KAKAO_REST_API_KEY)가 없으면 인가 화면으로 가지 않아요
            if (!startKakao('login', from))
              setError('카카오 로그인을 아직 사용할 수 없어요. 잠시 후 다시 시도해 주세요.')
          }}
        >
          <KakaoSymbol />
          카카오 로그인
        </button>
      </div>
      <p className={s.authFoot}>
        처음이신가요? <Link to="/signup">회원가입</Link>
      </p>
    </AppFrame>
  )
}
