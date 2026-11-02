import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { linkKakao } from '../lib/api/member'
import { kakaoLogin, loadMe, useAuth } from '../lib/auth'
import { KAKAO_CANCELED, KAKAO_STATE_MISMATCH, kakaoErrorMessage, takeKakaoAuth, type KakaoPurpose } from '../lib/kakao'
import { makeCx } from '../lib/ui'
import styles from './Login.module.css'

const cx = makeCx(styles)

/** 로그인 화면으로 넘기는 표시 (location.state.kakaoError) */
export type KakaoLoginState = { kakaoError?: string; from?: string }
/** 마이페이지로 넘기는 연결 결과 (location.state.kakao) */
export type KakaoLinkState = { kakao?: { ok: boolean; message: string } }

/**
 * 카카오 인가 화면이 돌려보내는 콜백 (/oauth/kakao/callback?code&state, 실패면 ?error&state)
 * - state가 저장한 값과 다르면 API를 부르지 않고 중단한다 (CSRF 방지)
 * - 로그인: 카카오 로그인 API → 원래 화면으로. 실패하면 로그인 화면에서 안내
 * - 연결: 카카오 연결 API → 마이페이지에서 결과 안내
 * 새로고침하면 저장한 state가 이미 지워져 있어 다시 부르지 않는다 (인가 코드는 한 번만 쓸 수 있음)
 */
export default function KakaoCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { ready } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    // 연결은 로그인 상태가 필요해, 새로 연 화면에서 로그인 복구(initAuth)가 끝난 뒤 시작한다
    if (!ready || started.current) return
    started.current = true // StrictMode에서 두 번 실행되면 같은 인가 코드를 두 번 쓰게 되어 막는다

    const saved = takeKakaoAuth()
    const purpose: KakaoPurpose = saved?.purpose ?? 'login'
    const code = params.get('code')

    function fail(message: string) {
      if (purpose === 'link') {
        navigate('/mypage', { replace: true, state: { kakao: { ok: false, message } } satisfies KakaoLinkState })
      } else {
        navigate('/login', {
          replace: true,
          state: { kakaoError: message, from: saved?.from } satisfies KakaoLoginState,
        })
      }
    }

    if (!saved || saved.state !== params.get('state')) return fail(KAKAO_STATE_MISMATCH)
    if (params.get('error') || !code) return fail(KAKAO_CANCELED[purpose])

    if (purpose === 'login') {
      kakaoLogin(code)
        .then(() => {
          const from = saved.from
          navigate(from?.startsWith('/') ? from : '/', { replace: true })
        })
        .catch((e) => fail(kakaoErrorMessage(e)))
    } else {
      linkKakao(code)
        // 연결은 됐으니 내 정보 갱신(kakaoLinked)이 실패해도 성공으로 안내한다
        .then(() => loadMe().catch(() => null))
        .then(() =>
          navigate('/mypage', {
            replace: true,
            state: {
              kakao: { ok: true, message: '카카오 계정을 연결했어요. 이제 카카오로 로그인할 수 있어요.' },
            } satisfies KakaoLinkState,
          }),
        )
        .catch((e) => fail(kakaoErrorMessage(e)))
    }
  }, [ready, params, navigate])

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
        <p
          className={cx('panel')}
          role="status"
          aria-busy="true"
          style={{ margin: '0', padding: '32px 36px', fontSize: '16px', color: '#45454F' }}
        >
          카카오 계정을 확인하고 있어요…
        </p>
      </div>
    </div>
  )
}
