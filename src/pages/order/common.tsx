/**
 * 주문 화면 공통 (안내 모달·남은 시간 배지·날짜 표기·상품 이미지)
 *
 * 안내 모달 문구는 lib/notices/*의 Notice를 그대로 써요. 모양은 시안 Modals(안내 모달 · 경고 문구)
 * : 흰 패널, 라운드 16, 왼쪽 정렬 글, 오른쪽 정렬 알약 버튼.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Notice } from '../../components/NoticeModal'
import { buttonClass } from '../../components/ui/Button'
import { getProduct } from '../../lib/api/product'
import { productImage } from '../../lib/products'
import { useApi } from '../../lib/useApi'
import { mmss } from '../../lib/useRemaining'
import styles from './common.module.css'

export type { Notice }

const pad = (n: number) => String(n).padStart(2, '0')
/** "2026.11.09" */
export const ymd = (s: string) => {
  const d = new Date(s)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}
/** "11.09 14:02" */
export const mdhm = (s: string) => {
  const d = new Date(s)
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 예치금이 모자랄 때 갈 충전 화면 주소.
 * 쿼리는 예전 주문서 → 예치금 약속 그대로(orderId·orderNumber·shortage)이고 경로만 새 충전 화면(/wallet/topup)이에요.
 * 남은 시간은 넘기지 않아요. 충전 화면이 orderId로 주문을 불러 remainingSeconds를 다시 받아요 (예전 방식과 같음).
 */
export const topupUrl = (orderId: number, orderNumber: string, shortage: number) =>
  `/wallet/topup?${new URLSearchParams({ orderId: String(orderId), orderNumber, shortage: String(shortage) })}`

/** lib/notices가 만든 예치금 링크(/wallet?orderId=…)를 새 충전 화면(/wallet/topup?…)으로 바꿔요 */
export function toTopupLinks(n: Notice): Notice {
  return {
    ...n,
    actions: n.actions.map((a) => (a.to?.startsWith('/wallet?') ? { ...a, to: a.to.replace('/wallet?', '/wallet/topup?') } : a)),
  }
}

/** "결제 가능 시간 06:52 남음" 배지. until(ms 시각)까지 1초씩 줄어요 */
export function Countdown({ label, until }: { label: string; until: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [until])
  const left = Math.max(0, Math.ceil((until - now) / 1000))
  return (
    <span className={styles.countdown}>
      {label} {mmss(left)} 남음
    </span>
  )
}

/** 안내 모달 패널 (모달 모음 화면에서는 이것만 그려요) */
export function NoticeCard({ notice, onClose, titleId }: { notice: Notice; onClose?: () => void; titleId?: string }) {
  const close = () => onClose?.()
  return (
    <>
      <h2 id={titleId} className={styles.title}>
        {notice.title}
      </h2>
      {notice.countdown && <Countdown {...notice.countdown} />}
      {notice.rows && (
        <dl className={styles.rows}>
          {notice.rows.map((r) => (
            <div key={r.label} className={r.strong ? `${styles.row} ${styles.rowStrong}` : styles.row}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {notice.body && <div className={styles.body}>{notice.body}</div>}
      <div className={styles.actions}>
        {notice.actions.map((a) => {
          const cls = buttonClass({ variant: a.primary ? 'primary' : 'outline', size: 'md', className: styles.act })
          return a.to ? (
            <Link key={a.label} className={cls} to={a.to} state={a.state} onClick={close}>
              {a.label}
            </Link>
          ) : (
            <button
              key={a.label}
              type="button"
              className={cls}
              onClick={() => {
                close()
                a.onClick?.()
              }}
            >
              {a.label}
            </button>
          )
        })}
      </div>
    </>
  )
}

/** 안내 모달. notice가 null이면 그리지 않아요. 바깥을 누르거나 Esc를 누르면 닫혀요. */
export function NoticeModal({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  const titleId = useId()
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!notice) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [notice])
  if (!notice) return null
  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className={styles.panel}>
        <NoticeCard notice={notice} onClose={onClose} titleId={titleId} />
      </section>
    </div>
  )
}

/**
 * 주문 항목에는 이미지가 없어서 상품 상세로 대표 이미지를 불러와요.
 * 판매 중지 등으로 못 불러온 상품은 이름으로 예시 이미지를 찾고, 그것도 없으면 회색 자리표시(Thumb)예요.
 */
export function useProductThumbs(items: Array<{ productId: number; productName: string }>) {
  const ids = [...new Set(items.map((r) => r.productId))].join(',')
  const thumbs = useApi(async () => {
    const list = ids ? ids.split(',').map(Number) : []
    const products = await Promise.all(list.map((id) => getProduct(id).catch(() => null)))
    return new Map(list.map((id, i) => [id, products[i]?.thumbnailUrl ?? null]))
  }, [ids])
  return (r: { productId: number; productName: string }) =>
    thumbs.data?.get(r.productId) || productImage(r.productName) || null
}
