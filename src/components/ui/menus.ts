import type { IconName } from './Icon'

export type ConsoleMenuItem = {
  key: string
  label: string
  to: string
  /** 판매자 모바일 하단 탭바에 보일 아이콘 (없으면 모바일 탭바에서 빠짐) */
  tabIcon?: IconName
  tabLabel?: string
}

/** 판매자 센터 메뉴 (PC 사이드바 순서) */
export const SELLER_MENU: ConsoleMenuItem[] = [
  { key: 'products', label: '상품 관리', to: '/seller/products', tabIcon: 'box', tabLabel: '상품' },
  { key: 'stock', label: '재고', to: '/seller/stock', tabIcon: 'stock', tabLabel: '재고' },
  { key: 'orders', label: '주문', to: '/seller/orders', tabIcon: 'receipt', tabLabel: '주문' },
  { key: 'settlements', label: '정산', to: '/seller/settlements', tabIcon: 'won', tabLabel: '정산' },
  { key: 'partners', label: '인플루언서 협약', to: '/seller/partners' },
  { key: 'coupons', label: '상품 쿠폰', to: '/seller/coupons' },
  { key: 'info', label: '판매자 정보', to: '/seller/info', tabIcon: 'user', tabLabel: '내 정보' },
]

/** 관리자 메뉴 (PC 사이드바 · 모바일 상단 칩) */
export const ADMIN_MENU: ConsoleMenuItem[] = [
  { key: 'members', label: '회원', to: '/admin/members' },
  { key: 'sellers', label: '판매자 심사', to: '/admin/sellers' },
  { key: 'influencers', label: '인플루언서 심사', to: '/admin/influencers' },
  { key: 'products', label: '상품과 카테고리', to: '/admin/products' },
  { key: 'payments', label: '결제 조회', to: '/admin/payments' },
  { key: 'returns', label: '반품 심사', to: '/admin/returns' },
  { key: 'settlements', label: '월 정산', to: '/admin/settlements' },
  { key: 'failed', label: '실패 거래', to: '/admin/failed' },
  { key: 'reviews', label: '리뷰', to: '/admin/reviews' },
  { key: 'coupons', label: '쿠폰 · 협약', to: '/admin/coupons' },
  { key: 'docs', label: 'AI 문서', to: '/admin/docs' },
]

/** 물류 담당자 메뉴 */
export const LOGISTICS_MENU: ConsoleMenuItem[] = [
  { key: 'ready', label: '출고 대기', to: '/logistics/ready' },
  { key: 'shipping', label: '배송 중', to: '/logistics/shipping' },
  { key: 'delivered', label: '배송 완료', to: '/logistics/delivered' },
]
