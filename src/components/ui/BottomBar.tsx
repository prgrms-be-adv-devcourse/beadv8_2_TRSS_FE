import type { ReactNode } from 'react'
import styles from './BottomBar.module.css'

type Props = {
  children: ReactNode
  /** 버튼 위 안내 문구 */
  note?: ReactNode
  /** 나란한 버튼을 같은 폭으로 */
  equal?: boolean
  /** 위쪽 선 없이 흰 그라데이션 */
  plain?: boolean
}

/** 하단 고정 버튼 영역 (버튼은 가운데) */
export default function BottomBar({ children, note, equal, plain }: Props) {
  return (
    <div className={`${styles.bar} ${plain ? styles.plain : ''}`}>
      {note && <p className={styles.note}>{note}</p>}
      <div className={`${styles.row} ${equal ? styles.equal : ''}`}>{children}</div>
    </div>
  )
}
