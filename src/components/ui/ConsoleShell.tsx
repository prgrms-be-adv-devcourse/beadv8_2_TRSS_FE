import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useActiveSeller } from '../../lib/activeSeller'
import { useIsDesktop } from '../../lib/useMedia'
import { HeaderIcon } from './PageHeader'
import PageHeader from './PageHeader'
import TabBar from './TabBar'
import { ADMIN_MENU, LOGISTICS_MENU, SELLER_MENU, type ConsoleMenuItem } from './menus'
import styles from './ConsoleShell.module.css'

export type ConsoleVariant = 'seller' | 'admin' | 'logistics'

const CONFIG: Record<ConsoleVariant, { badge: string; menu: ConsoleMenuItem[] }> = {
  seller: { badge: '판매자 센터', menu: SELLER_MENU },
  admin: { badge: '관리자', menu: ADMIN_MENU },
  logistics: { badge: '물류', menu: LOGISTICS_MENU },
}
const MOBILE_BADGE: Record<ConsoleVariant, string> = { seller: '판매자', admin: '관리자', logistics: '물류' }

type Props = {
  variant: ConsoleVariant
  /** 지금 메뉴의 key (menus.ts) */
  active: string
  /** 화면 제목. PC는 24px, 모바일 헤더는 18px */
  title: ReactNode
  /** PC 제목 아래 설명 */
  description?: ReactNode
  /** PC 제목 오른쪽 버튼 */
  actions?: ReactNode
  /** 모바일 헤더 오른쪽 (기본: 구매 화면으로 / 물류는 로그아웃) */
  mobileRight?: ReactNode
  /** 모바일에서 뒤로 버튼을 보일 때 (상세·등록 화면) */
  back?: boolean | string
  /** 메뉴 옆 건수 (물류 출고 대기 12 등) */
  counts?: Partial<Record<string, number>>
  /** 모바일 하단 탭바·메뉴 칩을 숨길 때 (등록 폼처럼 하단 고정 버튼이 있는 화면) */
  hideMobileNav?: boolean
  /** 하단 고정 영역 (모바일) */
  bottom?: ReactNode
  children: ReactNode
}

/** 판매자 센터 · 관리자 · 물류 반응형 틀 */
export default function ConsoleShell({
  variant,
  active,
  title,
  description,
  actions,
  mobileRight,
  back,
  counts,
  hideMobileNav,
  bottom,
  children,
}: Props) {
  const desktop = useIsDesktop()
  const { me } = useAuth()
  const { seller } = useActiveSeller()
  const { badge, menu } = CONFIG[variant]
  const account =
    variant === 'seller' ? (seller?.businessName ?? '판매자') : (me?.name ?? me?.email ?? MOBILE_BADGE[variant])

  if (desktop) {
    return (
      <div className={`${styles.root} ${styles[variant]}`}>
        <aside className={styles.side}>
          <div className={styles.brand}>
            <Link to={menu[0].to} aria-label={`팔레트 ${badge} 홈`}>
              <img src="/images/logo.png" alt="Palette" />
            </Link>
            <span className={styles.brandBadge}>{badge}</span>
          </div>
          <nav aria-label={`${badge} 메뉴`} className={styles.nav}>
            {menu.map((m) => (
              <Link
                key={m.key}
                to={m.to}
                aria-current={m.key === active ? 'page' : undefined}
                className={`${styles.item} ${m.key === active ? styles.itemOn : ''}`}
              >
                {m.label}
                {counts?.[m.key] !== undefined && <span className={styles.count}>{counts[m.key]}</span>}
              </Link>
            ))}
          </nav>
          {variant === 'logistics' ? (
            <>
              <div className={styles.who}>
                {account}
                <br />
                <span>물류 담당자 · 배송 기능만 사용</span>
              </div>
              <Link to="/" state={{ logout: true }} className={styles.sideLink}>
                로그아웃
              </Link>
            </>
          ) : (
            <>
              <div className={styles.who}>
                {account}
                <br />
                <span>{badge}</span>
              </div>
              <Link to="/" className={styles.sideLink}>
                구매 화면으로 ↗
              </Link>
              <Link to="/" state={{ logout: true }} className={styles.sideLink}>
                로그아웃
              </Link>
            </>
          )}
        </aside>
        <main className={styles.main}>
          <div className={styles.pcHead}>
            <div>
              <h1 className={styles.pcTitle}>{title}</h1>
              {description && <p className={styles.pcDesc}>{description}</p>}
            </div>
            {actions && <div className={styles.pcActions}>{actions}</div>}
          </div>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
    )
  }

  const right =
    mobileRight ??
    (variant === 'logistics' ? (
      <HeaderIcon to="/" state={{ logout: true }} icon="logout" label="로그아웃" />
    ) : (
      <HeaderIcon to="/" icon="shop" label="구매 화면으로" />
    ))
  const showChips = !hideMobileNav && variant !== 'seller'
  const sellerTabs = SELLER_MENU.filter((m) => m.tabIcon).map((m) => ({
    key: m.key,
    label: m.tabLabel ?? m.label,
    to: m.to,
    icon: m.tabIcon!,
  }))
  // 판매자 하단 탭바에 없는 메뉴(협약·쿠폰)는 '내 정보' 탭으로 켜 둔다
  const sellerTabActive = sellerTabs.some((t) => t.key === active) ? active : 'info'

  return (
    <div className={`${styles.root} ${styles[variant]}`}>
      <PageHeader title={title} back={back} badge={back ? undefined : MOBILE_BADGE[variant]} right={right} dark={variant === 'admin'} />
      {showChips && (
        <nav
          aria-label={`${badge} 메뉴`}
          className={`${styles.chips} ${variant === 'admin' ? styles.adminChips : ''}`}
        >
          {menu.map((m) => (
            <Link
              key={m.key}
              to={m.to}
              aria-current={m.key === active ? 'page' : undefined}
              className={`${styles.chip} ${m.key === active ? styles.chipOn : ''}`}
            >
              {m.label}
              {counts?.[m.key] !== undefined && <span>{counts[m.key]}</span>}
            </Link>
          ))}
        </nav>
      )}
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
      {bottom}
      {variant === 'seller' && !hideMobileNav && <TabBar items={sellerTabs} active={sellerTabActive} label="판매자 메뉴" />}
    </div>
  )
}
