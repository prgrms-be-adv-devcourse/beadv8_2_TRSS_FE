import { Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { screens } from './routes'
import ScreensPage from './pages/Screens'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {screens.map((s) => (
          <Route key={s.path} path={s.path} element={s.element} />
        ))}
        <Route path="/screens" element={<ScreensPage />} />
        <Route path="*" element={<ScreensPage />} />
      </Routes>
    </>
  )
}
