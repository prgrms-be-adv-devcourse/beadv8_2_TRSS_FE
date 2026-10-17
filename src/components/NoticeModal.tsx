import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './NoticeModal.module.css'

const cx = makeCx(styles)

/**
 * 버튼 하나
 * - to: 누르면 그 화면으로 이동
 * - onClick: 누르면 실행 (확인 모달의 "취소하기" 같은 동작)
 * - 둘 다 없으면 모달만 닫아요
 */
export type NoticeAction = { label: string; to?: string; onClick?: () => void; primary?: boolean }

/** 안내 모달에 그릴 내용. 디자인: /orders/errors (주문·결제 안내 모달 모음) */
export type Notice = { title: string; body?: ReactNode; actions: NoticeAction[] }

/**
 * 주문·결제 안내 모달
 * notice가 null이면 그리지 않아요. 바깥을 누르거나 Esc를 누르면 닫혀요.
 */
export default function NoticeModal({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  const titleId = useId()
  const primaryRef = useRef<HTMLElement | null>(null)
  // 화면이 다시 그려질 때마다 onClose가 새로 만들어져도 포커스가 튀지 않게 ref로 들고 있어요.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!notice) return
    primaryRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [notice])

  if (!notice) return null
  const lastPrimary = notice.actions.map((a) => !!a.primary).lastIndexOf(true)

  return (
    <div className={cx('ov')} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className={cx('title')}>
          {notice.title}
        </h2>
        {notice.body && <div className={cx('body')}>{notice.body}</div>}
        <div className={cx('actions')}>
          {notice.actions.map((a, i) => {
            const className = cx(a.primary ? 'btn btn-p' : 'btn')
            const ref = i === lastPrimary ? (el: HTMLElement | null) => void (primaryRef.current = el) : undefined
            return a.to ? (
              <Link key={a.label} ref={ref} className={className} to={a.to} onClick={onClose}>
                {a.label}
              </Link>
            ) : (
              <button
                key={a.label}
                ref={ref}
                type="button"
                className={className}
                onClick={() => {
                  onClose()
                  a.onClick?.()
                }}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
