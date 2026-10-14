import type { ReactNode } from 'react'
import ConsoleLayout, { type MenuItem } from './ConsoleLayout'

export const SELLER_MENU: MenuItem[] = [
  { label: '상품 관리', to: '/seller/products' },
  { label: '상품 등록', to: '/seller/products/new' },
  { label: '재고', to: '/seller/stock' },
  { label: '주문 항목', to: '/seller/orders' },
  { label: '정산', to: '/seller/settlements' },
  { label: '판매자 정보', to: '/seller/info' },
]

/** 판매자 센터 레이아웃 */
export default function SellerLayout({
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
      variant="seller"
      badge="판매자 센터"
      account="온결"
      who="판매자 센터"
      homePath="/seller/products"
      menu={SELLER_MENU}
      active={active}
      minHeight={minHeight}
    >
      {children}
    </ConsoleLayout>
  )
}
