import { useEffect, useState } from 'react'

/**
 * 입력이 멈추고 ms만큼 지나면 값을 바꿔요. 검색창처럼 글자마다 API를 부르지 않게 할 때 써요.
 *
 * @example
 * const q = useDebounced(keyword.trim())
 * const list = useApi(() => search({ keyword: q }), [q])
 */
export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
