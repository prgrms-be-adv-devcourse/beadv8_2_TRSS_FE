import { useLocation, useNavigate } from 'react-router-dom'
import { FORBIDDEN, type ForbiddenKind } from '../lib/notices/common'
import NoticeModal from './NoticeModal'

/**
 * 이동하면서 넘긴 안내를 보여 준다.
 * 권한 가드(RequireRole·RequireActiveSeller)가 location.state.forbidden을 담아 보내면, 도착한 화면 위에 권한 없음 안내를 띄운다.
 * 닫으면 state를 비워 새로고침·뒤로 가기 때 다시 뜨지 않게 한다.
 */
export default function RouteNotice() {
  const location = useLocation()
  const navigate = useNavigate()
  const kind = (location.state as { forbidden?: ForbiddenKind } | null)?.forbidden
  const notice = kind ? FORBIDDEN[kind] : null

  return (
    <NoticeModal
      notice={notice}
      onClose={() => navigate(location.pathname + location.search, { replace: true, state: null })}
    />
  )
}
