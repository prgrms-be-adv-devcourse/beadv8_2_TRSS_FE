import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import { mmss } from '../lib/useRemaining'
import styles from './NoticeModal.module.css'

const cx = makeCx(styles)

/**
 * 버튼 하나
 * - to: 누르면 그 화면으로 이동 (state는 이동할 화면에 넘길 router state. 예: 로그인 후 돌아올 주소)
 * - onClick: 누르면 실행 (확인 모달의 "취소하기" 같은 동작)
 * - 둘 다 없으면 모달만 닫아요
 */
export type NoticeAction = { label: string; to?: string; state?: unknown; onClick?: () => void; primary?: boolean }

/** 금액 표 한 줄. strong이면 위에 구분선을 긋고 굵게 강조해요 (예: 충전할 금액) */
export type NoticeRow = { label: string; value: string; strong?: boolean }

/**
 * 안내 모달에 그릴 내용. 디자인: /orders/errors (주문·결제 안내 모달 모음)
 * - countdown: 제목 아래 "{label} 06:52 남음" 배지. until(ms 시각)까지 1초씩 줄어요
 * - rows: 배지 아래 금액 표
 */
export type Notice = {
  title: string
  countdown?: { label: string; until: number }
  rows?: NoticeRow[]
  body?: ReactNode
  actions: NoticeAction[]
}

/** "결제 가능 시간 06:52 남음" */
function Countdown({ label, until }: { label: string; until: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [until])
  const left = Math.max(0, Math.ceil((until - now) / 1000))
  return (
    <span className={cx('chip num')}>
      {label} {mmss(left)} 남음
    </span>
  )
}

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
        {notice.countdown && <Countdown {...notice.countdown} />}
        {notice.rows && (
          <dl className={cx('rows')}>
            {notice.rows.map((r) => (
              <div key={r.label} className={cx(r.strong ? 'row row-strong' : 'row')}>
                <dt>{r.label}</dt>
                <dd className={cx('num')}>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {notice.body && <div className={cx('body')}>{notice.body}</div>}
        <div className={cx('actions')}>
          {notice.actions.map((a, i) => {
            const className = cx(a.primary ? 'btn btn-p' : 'btn')
            const ref = i === lastPrimary ? (el: HTMLElement | null) => void (primaryRef.current = el) : undefined
            return a.to ? (
              <Link key={a.label} ref={ref} className={className} to={a.to} state={a.state} onClick={onClose}>
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
