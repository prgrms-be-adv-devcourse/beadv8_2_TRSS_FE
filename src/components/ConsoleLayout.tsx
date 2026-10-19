import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './ConsoleLayout.module.css'

export type MenuItem = { label: string; to: string }

type Props = {
  variant: 'admin' | 'seller'
  /** 헤더 배지 문구 (관리자 / 판매자 센터) */
  badge: string
  /** 헤더 오른쪽과 사이드바에 보이는 계정 이름 */
  account: string
  /** 사이드바 맨 위 설명 */
  who: string
  homePath: string
  menu: MenuItem[]
  /** 지금 화면의 메뉴 이름 */
  active: string
  minHeight?: number
  children: ReactNode
}

/** 관리자·판매자 화면 공통 레이아웃: 상단 헤더 + 왼쪽 메뉴 */
export default function ConsoleLayout({
  variant,
  badge,
  account,
  who,
  homePath,
  menu,
  active,
  minHeight,
  children,
}: Props) {
  return (
    <div className={`${styles.root} ${styles[variant]}`} style={{ minHeight }}>
      <header className={styles.header}>
        <div className={styles.bar}>
          <Link to={homePath} aria-label={`팔레트 ${badge} 홈`} className={styles.logo}>
            <img src="/images/logo.png" alt="Palette" width={199} height={68} />
          </Link>
          <span className={styles.badge}>{badge}</span>
          <nav aria-label={`${badge} 계정`} className={styles.account}>
            <span className={styles.accountName}>{account}</span>
            <Link to="/" className={styles.shopLink}>
              쇼핑몰로 가기
            </Link>
            {/* 관리자·판매자 공통. 구매자 헤더(BuyerHeader)와 같은 위치·동작 (메인 도착 후 LogoutOnArrive가 로그아웃) */}
            <Link to="/" state={{ logout: true }} className={styles.shopLink}>
              로그아웃
            </Link>
          </nav>
        </div>
      </header>
      <div className={styles.body}>
        <nav aria-label={`${badge} 메뉴`} className={styles.side}>
          <div className={styles.who}>
            {who} <span className={styles.whoName}>{account}</span>
          </div>
          {menu.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={item.label === active ? 'page' : undefined}
              className={`${styles.item} ${item.label === active ? styles.itemOn : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/" className={styles.back}>
            쇼핑몰로 가기
          </Link>
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
