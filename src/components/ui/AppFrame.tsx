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
}

/** 구매자 모바일 웹 틀: 흰 배경 위 가운데 컬럼 (PC에서는 조금 넓게) */
export default function AppFrame({ children, tab, bottom, footer = false }: Props) {
  return (
    <div className={styles.stage}>
      <div className={styles.col}>
        <div className={styles.body}>{children}</div>
        {footer && <Footer />}
        {/* 하단 탭바는 모든 구매자 화면에 항상 보여요. 하단 고정 버튼이 있으면 탭바 바로 위에 쌓아요 */}
        <div className={styles.dock}>
          {bottom}
          <TabBar active={tab} />
        </div>
      </div>
    </div>
  )
}
