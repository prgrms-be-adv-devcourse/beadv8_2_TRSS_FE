import { useEffect, useRef, type ReactNode } from 'react'
import styles from './ConfirmModal.module.css'

type Props = {
  /** 제목 요소의 id (aria-labelledby) */
  labelledBy: string
  /** 닫기. 배경을 누르거나 Esc를 누르면 불려요. */
  onClose: () => void
  /** 처리 중이면 배경·Esc로 닫히지 않아요. */
  busy?: boolean
  children: ReactNode
}

/**
 * 화면 가운데 뜨는 확인 모달 (상품 삭제·판매 중지 같은 확인 패널용)
 * 모양은 NoticeModal과 같고, 내용·버튼은 화면이 직접 그려요.
 * 실패해도 닫히지 않아서 오류 문구와 처리 중 상태를 모달 안에 보여줄 수 있어요.
 */
export default function ConfirmModal({ labelledBy, onClose, busy = false, children }: Props) {
  const dialogRef = useRef<HTMLElement>(null)
  // 화면이 다시 그려질 때마다 onClose가 새로 만들어져도 이벤트를 다시 걸지 않게 ref로 들고 있어요.
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  const busyRef = useRef(busy)
  busyRef.current = busy

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    const dialog = dialogRef.current
    // 입력칸이 있으면 입력칸, 없으면 마지막 버튼(확인 버튼)으로 포커스를 옮겨요.
    if (dialog && !dialog.contains(document.activeElement)) {
      const buttons = dialog.querySelectorAll<HTMLElement>('button:not(:disabled)')
      const target = dialog.querySelector<HTMLElement>('textarea, input') ?? buttons[buttons.length - 1]
      target?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busyRef.current) closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      // 닫히면 모달을 연 버튼으로 포커스를 돌려줘요.
      if (before?.isConnected) before.focus()
    }
  }, [])

  return (
    <div className={styles.ov} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <section ref={dialogRef} className={styles.dlg} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </section>
    </div>
  )
}
