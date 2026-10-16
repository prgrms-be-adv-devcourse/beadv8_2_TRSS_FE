import type { ReactNode } from 'react'
import ConsoleLayout, { type MenuItem } from './ConsoleLayout'

export const ADMIN_MENU: MenuItem[] = [
  { label: '판매자 심사', to: '/admin/sellers' },
  { label: '회원', to: '/admin/members' },
  { label: '상품과 카테고리', to: '/admin/products' },
  { label: '결제 조회', to: '/admin/payments' },
  { label: '실패 거래', to: '/admin/failed' },
  { label: '월 정산', to: '/admin/settlements' },
]

/** 관리자 화면 레이아웃 */
export default function AdminLayout({
  active,
  minHeight,
  children,
}: {
  active: string
  minHeight?: number
  children: ReactNode
}) {
  return (
    <ConsoleLayout
      variant="admin"
      badge="관리자"
      account="admin@palette"
      who="관리자"
      homePath="/admin/sellers"
      menu={ADMIN_MENU}
      active={active}
      minHeight={minHeight}
    >
      {children}
    </ConsoleLayout>
  )
}
