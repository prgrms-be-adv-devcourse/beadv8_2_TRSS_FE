import { useCartCount } from '../../lib/cartCount'
import { HeaderIcon } from './PageHeader'

/** 헤더 장바구니 아이콘 + 담긴 항목 수 배지 (담기·삭제하면 바로 바뀌어요) */
export default function CartHeaderIcon() {
  const count = useCartCount()
  return (
    <HeaderIcon
      to="/cart"
      icon="bag"
      label={count ? `장바구니, ${count}개 담김` : '장바구니'}
      badge={count}
    />
  )
}
