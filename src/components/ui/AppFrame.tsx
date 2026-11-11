import type { ReactNode } from 'react'
import Footer from './Footer'
import TabBar, { type TabKey } from './TabBar'
import styles from './AppFrame.module.css'

type Props = {
  children: ReactNode
  /** 하단 탭바에서 켜 둘 메뉴. 넘기면 하단 탭바를 보여 줘요. */
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
        {bottom}
        {tab && <TabBar active={tab} />}
      </div>
    </div>
  )
}
