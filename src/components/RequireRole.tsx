import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type MemberRole } from '../lib/auth'

/**
 * 로그인·권한이 필요한 화면을 감싸요.
 * - roles를 안 주면 로그인만 확인해요.
 * - 로그인 안 했으면 /login 으로 보내고, 돌아올 주소를 state.from 에 담아요.
 * - 권한이 없으면 / 로 보내고, 도착한 화면에서 권한 없음 안내를 띄운다 (RouteNotice).
 */
export default function RequireRole({ roles }: { roles?: MemberRole[] }) {
  const { ready, me } = useAuth()
  const location = useLocation()

  if (!ready) return null // 첫 로그인 상태 복구 중
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(me.role)) return <Navigate to="/" replace state={{ forbidden: 'role' }} />
  return <Outlet />
}
