import type { ReactNode } from 'react'
import Footer from './Footer'
import TabBar, { type TabKey } from './TabBar'
import styles from './AppFrame.module.css'

type Props = {
  children: ReactNode
  /** 하단 탭바에서 켜 둘 메뉴. 탭바는 항상 보이고, 이 값은 어느 탭을 켤지만 정해요. */
  tab?: TabKey
  /** 하단 고정 영역 (BottomBar). 탭바 대신 쓰는 화면에서 넘겨요. */
  bottom?: ReactNode
  /** 맨 아래 푸터. 메인 홈에서만 켜요 (기본: 숨김) */
  footer?: boolean
  /** 하단 탭바 표시 (기본: 표시). 로그인·회원가입처럼 탭바가 필요 없는 화면에서 false */
  tabBar?: boolean
}

/** 구매자 모바일 웹 틀: 흰 배경 위 가운데 컬럼 (PC에서는 조금 넓게) */
export default function AppFrame({ children, tab, bottom, footer = false, tabBar = true }: Props) {
  return (
    <div className={styles.stage}>
      <div className={styles.col}>
        <div className={styles.body}>{children}</div>
        {footer && <Footer />}
        {/* 하단 탭바는 구매자 화면에 기본으로 보여요(로그인·회원가입 제외). 하단 고정 버튼이 있으면 탭바 바로 위에 쌓아요 */}
        <div className={styles.dock}>
          {bottom}
          {tabBar && <TabBar active={tab} />}
        </div>
      </div>
    </div>
  )
}
