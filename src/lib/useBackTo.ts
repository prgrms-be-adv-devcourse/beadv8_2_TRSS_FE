import { useLocation, useNavigate } from 'react-router-dom'

/** 목록 → 상세처럼 앱 안에서 들어왔다는 표시. 링크의 state로 넘겨요 */
export const FROM_LIST_STATE = { fromList: true } as const

/**
 * 상세 화면의 뒤로 버튼.
 * 목록에서 들어왔으면(state.fromList) 브라우저 기록으로 돌아가요. 목록 주소를 새로 쌓으면 목록의 뒤로가 상세로 다시 와요.
 * 링크로 바로 들어왔으면 지금 기록을 목록 주소로 바꿔서, 목록의 뒤로가 상세 이전 화면으로 가게 해요.
 */
export function useBackTo(fallback: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const fromList = (location.state as { fromList?: boolean } | null)?.fromList === true
  return () => (fromList ? navigate(-1) : navigate(fallback, { replace: true }))
}
