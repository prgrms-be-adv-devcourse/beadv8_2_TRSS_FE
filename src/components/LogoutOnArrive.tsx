import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { logout } from '../lib/auth'

/**
 * 로그아웃 링크는 state.logout을 담아 메인(/)으로 이동만 하고, 도착한 뒤 여기서 로그아웃한다.
 * 이동과 로그아웃을 함께 하면 로그아웃 상태가 먼저 반영돼, 떠나는 화면의 권한 가드가 /login으로 보내 버리기 때문이다.
 */
export default function LogoutOnArrive() {
  const location = useLocation()
  const navigate = useNavigate()
  const requested = (location.state as { logout?: boolean } | null)?.logout === true

  useEffect(() => {
    if (!requested) return
    void logout()
    // 새로고침·뒤로 가기 때 다시 로그아웃하지 않도록 state를 비운다
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [requested, location.key, location.pathname, location.search, navigate])

  return null
}
