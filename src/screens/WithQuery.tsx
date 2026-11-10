import type { ComponentType } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * 화면 상태를 URL 쿼리로 바꿔 볼 수 있어요.
 * 예: /orders/1?status=구매 확정, /mypage?sellerStatus=APPROVED
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function WithQuery({ page: Page }: { page: ComponentType<any> }) {
  const [params] = useSearchParams()
  return <Page {...Object.fromEntries(params)} />
}
