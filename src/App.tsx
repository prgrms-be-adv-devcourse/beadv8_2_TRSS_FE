import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { screens, type ScreenAuth } from './routes'
import RequireRole from './components/RequireRole'
import type { MemberRole } from './lib/auth'
import ScreensPage from './pages/Screens'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** 권한별로 RequireRole이 확인할 role (undefined면 로그인만 확인) */
const GUARDS: Record<ScreenAuth, MemberRole[] | undefined> = {
  login: undefined,
  SELLER: ['SELLER'],
  ADMIN: ['ADMIN'],
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {screens
          .filter((s) => !s.auth)
          .map((s) => (
            <Route key={s.path} path={s.path} element={s.element} />
          ))}
        {(Object.keys(GUARDS) as ScreenAuth[]).map((auth) => (
          <Route key={auth} element={<RequireRole roles={GUARDS[auth]} />}>
            {screens
              .filter((s) => s.auth === auth)
              .map((s) => (
                <Route key={s.path} path={s.path} element={s.element} />
              ))}
          </Route>
        ))}
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="*" element={<ScreensPage />} />
      </Routes>
    </>
  )
}
