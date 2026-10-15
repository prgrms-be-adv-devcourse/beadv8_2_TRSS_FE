import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type MemberRole } from '../lib/auth'

/**
 * 로그인·권한이 필요한 화면을 감싸요.
 * - roles를 안 주면 로그인만 확인해요.
 * - 로그인 안 했으면 /login 으로 보내고, 돌아올 주소를 state.from 에 담아요.
 * - 권한이 없으면 / 로 보내요.
 *
 * 참고: 판매자 승인 직후에는 토큰의 role이 아직 USER일 수 있어요. 승인 후 다시 로그인하거나 토큰을 재발급해야 SELLER 화면에 들어가요.
 */
export default function RequireRole({ roles }: { roles?: MemberRole[] }) {
  const { ready, me } = useAuth()
  const location = useLocation()

  if (!ready) return null // 첫 로그인 상태 복구 중
  if (!me) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (roles && !roles.includes(me.role)) return <Navigate to="/" replace />
  return <Outlet />
}
