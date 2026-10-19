import { Navigate, Outlet } from 'react-router-dom'
import { getMySeller } from '../lib/api/member'
import { useApi } from '../lib/useApi'

/**
 * 판매자 센터 화면을 감싼다 (RequireRole의 SELLER 확인 다음).
 * 판매자 여부는 회원 역할이 아니라 판매자 상태로 구분하므로, 여기서 판매자 상태를 확인한다.
 * 백엔드 판매자 API와 같이 판매 중(APPROVED)만 들어오고, 철회 심사 중을 포함한 다른 상태는
 * 상태 안내가 있는 마이페이지로 보내고, 권한 없음 안내를 띄운다 (RouteNotice).
 */
export default function RequireActiveSeller() {
  const { data, loading, error } = useApi(getMySeller)

  if (loading) return null
  if (error || data?.status !== 'APPROVED') return <Navigate to="/mypage" replace state={{ forbidden: 'seller' }} />
  return <Outlet />
}
