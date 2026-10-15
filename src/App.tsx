import { Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { screens, type ScreenAuth } from './routes'
import RequireActiveSeller from './components/RequireActiveSeller'
import RequireRole from './components/RequireRole'
import type { MemberRole } from './lib/auth'
import ScreensPage from './pages/Screens'
import BuyerFooterSlot from './components/BuyerFooter'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

/** 권한별로 RequireRole이 확인할 role (undefined면 로그인만 확인) */
const GUARDS: Record<ScreenAuth, MemberRole[] | undefined> = {
  // 구매자 화면(장바구니·주문·예치금·마이페이지·판매자 신청)이라 관리자는 들어올 수 없다
  login: ['USER', 'SELLER'],
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
            {/* 판매자 센터는 판매자 상태(판매 중)까지 확인한다 */}
            <Route element={auth === 'SELLER' ? <RequireActiveSeller /> : <Outlet />}>
              {screens
                .filter((s) => s.auth === auth)
                .map((s) => (
                  <Route key={s.path} path={s.path} element={s.element} />
                ))}
            </Route>
          </Route>
        ))}
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="*" element={<ScreensPage />} />
      </Routes>
      <BuyerFooterSlot />
    </>
  )
}
