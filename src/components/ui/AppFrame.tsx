import type { ReactNode } from 'react'
import Icon from './Icon'
import TabBar, { type TabKey } from './TabBar'
import styles from './AppFrame.module.css'

type Props = {
  children: ReactNode
  /** 하단 탭바에서 켜 둘 메뉴. 넘기면 하단 탭바를 보여 줘요. */
  tab?: TabKey
  /** 하단 고정 영역 (BottomBar). 탭바 대신 쓰는 화면에서 넘겨요. */
  bottom?: ReactNode
}

/** 구매자 모바일 웹 틀: 430px 가운데 컬럼 + (1024px 이상) 왼쪽 브랜드 소개 */
export default function AppFrame({ children, tab, bottom }: Props) {
  return (
    <div className={styles.stage}>
      <aside aria-label="팔레트 소개" className={styles.panel}>
        <div className={styles.panelInner}>
          <div>
            <img className={styles.panelLogo} src="/images/logo.png" alt="Palette" />
            <p className={styles.panelLead}>
              크리에이터가 고른 뷰티·패션을
              <br />한 화면에서 둘러보세요.
            </p>
          </div>
          <ul className={styles.points}>
            <li>
              <Icon name="won" size={18} />
              예치금으로 한 번에 결제
            </li>
            <li>
              <Icon name="truck" size={18} />
              주문부터 배송까지 한눈에
            </li>
            <li>
              <Icon name="box" size={18} />
              구매 확정 전까지 반품 요청
            </li>
          </ul>
          <div className={styles.qr}>
            <div role="img" aria-label="QR 코드 자리" className={styles.qrBox}>
              QR
            </div>
            <p>
              <b>휴대폰에서 더 편해요</b>카메라로 찍으면 바로 열려요
            </p>
          </div>
        </div>
      </aside>
      <div className={styles.col}>
        <div className={styles.body}>{children}</div>
        {bottom}
        {tab && <TabBar active={tab} />}
      </div>
      <div className={styles.spacer} />
    </div>
  )
}
