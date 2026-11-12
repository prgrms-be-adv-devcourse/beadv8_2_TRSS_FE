import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import Icon, { type IconName } from './Icon'
import styles from './TabBar.module.css'

/** state: 이동할 화면에 넘길 router state (로그아웃은 { logout: true }) */
export type TabItem = { key: string; label: string; to: string; icon: IconName; state?: unknown }

export const BUYER_TABS: TabItem[] = [
  { key: 'home', label: '홈', to: '/', icon: 'home' },
  { key: 'cart', label: '장바구니', to: '/cart', icon: 'bag' },
  { key: 'category', label: '카테고리', to: '/category', icon: 'grid' },
  { key: 'wish', label: '찜', to: '/wishlist', icon: 'heart' },
  { key: 'my', label: '마이페이지', to: '/mypage', icon: 'user' },
]
export type TabKey = 'home' | 'cart' | 'category' | 'wish' | 'my'

/**
 * 관리자·물류 담당자는 장바구니·주문·마이(구매자 전용)를 쓸 수 없어요.
 * 구매 화면에 들어와도 자기 화면으로 돌아갈 수 있게 탭을 바꿔 보여 줘요.
 */
const ADMIN_TABS: TabItem[] = [
  { key: 'home', label: '홈', to: '/', icon: 'home' },
  { key: 'staff', label: '관리자 페이지', to: '/admin/members', icon: 'grid' },
  { key: 'logout', label: '로그아웃', to: '/', icon: 'logout', state: { logout: true } },
]
const LOGISTICS_TABS: TabItem[] = [
  { key: 'home', label: '홈', to: '/', icon: 'home' },
  { key: 'staff', label: '배송 관리', to: '/logistics/ready', icon: 'truck' },
  { key: 'logout', label: '로그아웃', to: '/', icon: 'logout', state: { logout: true } },
]

/** 하단 탭바. items를 주지 않으면 구매자 탭(홈·장바구니·카테고리·찜·마이). 주문 내역은 마이에서 들어가요 */
export default function TabBar({
  active,
  items: given,
  label = '하단 메뉴',
}: {
  active?: string
  items?: TabItem[]
  label?: string
}) {
  const { me } = useAuth()
  const items = given ?? (me?.role === 'ADMIN' ? ADMIN_TABS : me?.role === 'LOGISTICS' ? LOGISTICS_TABS : BUYER_TABS)
  return (
    <div className={styles.wrap}>
      <nav aria-label={label} className={styles.bar}>
        {items.map((t) => (
          <Link
            key={t.key}
            to={t.to}
            state={t.state}
            aria-current={t.key === active ? 'page' : undefined}
            className={`${styles.item} ${t.key === active ? styles.on : ''}`}
          >
            <span className={styles.icon}>
              <Icon name={t.icon} size={20} />
            </span>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
