import { Link } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import styles from './TabBar.module.css'

export type TabItem = { key: string; label: string; to: string; icon: IconName }

export const BUYER_TABS: TabItem[] = [
  { key: 'home', label: '홈', to: '/', icon: 'home' },
  { key: 'cart', label: '장바구니', to: '/cart', icon: 'bag' },
  { key: 'orders', label: '주문', to: '/orders', icon: 'receipt' },
  { key: 'my', label: '마이', to: '/mypage', icon: 'user' },
]
export type TabKey = 'home' | 'cart' | 'orders' | 'my'

/** 하단 탭바. items를 주지 않으면 구매자 탭(홈·장바구니·주문·마이). 카테고리는 홈 검색창 왼쪽 버튼으로 가요 */
export default function TabBar({
  active,
  items = BUYER_TABS,
  label = '하단 메뉴',
}: {
  active?: string
  items?: TabItem[]
  label?: string
}) {
  return (
    <div className={styles.wrap}>
      <nav aria-label={label} className={styles.bar}>
        {items.map((t) => (
          <Link
            key={t.key}
            to={t.to}
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
