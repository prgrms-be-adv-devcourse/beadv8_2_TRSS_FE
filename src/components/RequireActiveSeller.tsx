import { Navigate, Outlet } from 'react-router-dom'
import { getMySeller } from '../lib/api/member'
import { useApi } from '../lib/useApi'

/**
 * 판매자 센터 화면을 감싼다 (RequireRole의 SELLER 확인 다음).
 * 철회·제재 뒤에도 회원 역할은 SELLER로 남으므로 판매자 상태를 한 번 더 확인한다.
 * 백엔드 판매자 API와 같이 판매 중(APPROVED)만 들어오고, 철회 심사 중을 포함한 다른 상태는
 * 상태 안내가 있는 마이페이지로 보낸다.
 */
export default function RequireActiveSeller() {
  const { data, loading, error } = useApi(getMySeller)

  if (loading) return null
  if (error || data?.status !== 'APPROVED') return <Navigate to="/mypage" replace />
  return <Outlet />
}
