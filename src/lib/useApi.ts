import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

/**
 * 화면이 열릴 때 API를 불러오고 로딩·에러 상태를 같이 관리해요.
 *
 * @example
 * const { data, loading, error, reload } = useApi(() => getOrders({ page }), [page])
 *
 * - deps가 바뀌면 다시 불러와요.
 * - 응답이 늦게 도착해 순서가 뒤바뀌어도 마지막 요청 결과만 반영해요.
 * - 저장·삭제처럼 버튼을 눌러 부르는 API는 이 훅 말고 직접 호출한 뒤 reload()를 불러요.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const seq = useRef(0)

  const load = useCallback(async () => {
    const id = ++seq.current
    setLoading(true)
    setError(null)
    try {
      const res = await fetcher()
      if (id === seq.current) setData(res)
    } catch (e) {
      if (id === seq.current) setError(errorMessage(e))
    } finally {
      if (id === seq.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    load()
  }, [load])

  return { data, setData, loading, error, reload: load }
}
