import { useEffect, type ReactNode } from 'react'
import Icon from './Icon'
import styles from './Overlay.module.css'

function useEscape(onClose?: () => void) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

/** 가운데 안내 모달. actions 버튼은 같은 폭으로 나란히 */
export function Modal({
  title,
  children,
  actions,
  onClose,
}: {
  title: ReactNode
  children?: ReactNode
  actions: ReactNode
  onClose?: () => void
}) {
  useEscape(onClose)
  return (
    <div className={`${styles.backdrop} ${styles.center}`} onClick={onClose}>
      <div role="dialog" aria-modal="true" className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.modalTitle}>{title}</h2>
        {children && <div className={styles.modalBody}>{children}</div>}
        <div className={styles.actions}>{actions}</div>
      </div>
    </div>
  )
}

/** 화면 가운데에 뜨는 팝업 (제목 + 닫기 + 내용 + 아래 버튼) */
export function Sheet({
  title,
  children,
  footer,
  onClose,
}: {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  useEscape(onClose)
  return (
    <div className={`${styles.backdrop} ${styles.center}`} onClick={onClose}>
      <div role="dialog" aria-modal="true" className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sheetHead}>
          <h2 className={styles.sheetTitle}>{title}</h2>
          <button type="button" aria-label="닫기" className={styles.close} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className={styles.sheetBody}>{children}</div>
        {footer && <div className={styles.sheetFoot}>{footer}</div>}
      </div>
    </div>
  )
}
