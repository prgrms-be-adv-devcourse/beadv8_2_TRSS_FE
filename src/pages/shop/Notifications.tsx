import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon, { type IconName } from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import { errorMessage } from '../../lib/api'
import {
  getNotifications,
  readNotification,
  type NotificationItem,
  type NotificationType,
} from '../../lib/api/notification'
import { useNotificationCount } from '../../lib/notificationCount'
import styles from './Notifications.module.css'

const KIND: Record<NotificationType, { label: string; icon: IconName; tone: string }> = {
  ORDER_PAID: { label: '결제 완료', icon: 'won', tone: styles.toneNeutral },
  DELIVERY_STARTED: { label: '배송 시작', icon: 'truck', tone: styles.toneNeutral },
  DELIVERY_COMPLETED: { label: '배송 완료', icon: 'box', tone: styles.toneGreen },
}
const PAGE_SIZE = 20

const pad = (n: number) => String(n).padStart(2, '0')

/** 날짜 묶음 제목: 오늘 / MM.DD (올해가 아니면 YYYY.MM.DD) */
function groupLabel(d: Date, now: Date) {
  if (d.toDateString() === now.toDateString()) return '오늘'
  const md = `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}.${md}`
}

/**
 * ①-1 알림
 * TODO(API 미구현): 유형 필터(type 파라미터), 상품명·썸네일·결제 금액·택배사 필드, 최근 30일 조건 — 백엔드 필드가 생기면
 * 탭(결제 완료·배송 시작·배송 완료), 상품 정보 줄, 오른쪽 썸네일, 목록 끝 "최근 30일 알림만 보여요"를 붙인다
 */
export default function NotificationsPage() {
  const unreadCount = useNotificationCount()
  const [items, setItems] = useState<NotificationItem[]>([])
  const [cursor, setCursor] = useState<number | null>(null)
  const [hasNext, setHasNext] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasNext) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const page = await getNotifications({ cursor, size: PAGE_SIZE })
      setItems((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
      setHasNext(page.hasNext)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [cursor, hasNext])

  // 목록 끝이 보이면 다음 페이지를 불러온다 (오류가 나면 다시 불러오기 버튼으로만)
  const sentinel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinel.current
    if (!el || error) return
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    })
    io.observe(el)
    return () => io.disconnect()
  }, [loadMore, error])

  const onOpen = (n: NotificationItem) => {
    if (n.read) return
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
    readNotification(n.id).catch(() => {
      // 읽음 처리가 실패해도 주문 상세로는 이동한다. 다음 조회 때 다시 안 읽음으로 보인다
    })
  }

  const now = new Date()
  const tabs: Array<[string, string]> = [['all', unreadCount ? `전체 ${unreadCount}` : '전체']]

  return (
    <AppFrame>
      <PageHeader back title="알림" />

      <div role="tablist" aria-label="알림 종류" className={styles.tabs}>
        {tabs.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected className={styles.chipOn}>
            {label}
          </button>
        ))}
      </div>

      {!hasNext && items.length === 0 && <Empty title="알림이 없어요" />}

      <ul className={styles.list}>
        {items.map((n, i) => {
          const k = KIND[n.type]
          const d = new Date(n.createdAt)
          const group = groupLabel(d, now)
          const head = i === 0 || groupLabel(new Date(items[i - 1].createdAt), now) !== group
          return (
            <li key={n.id}>
              {head && <p className={styles.group}>{group}</p>}
              <Link
                to={`/orders/${n.orderId}`}
                className={`${styles.row} ${n.read ? '' : styles.unread}`}
                onClick={() => onOpen(n)}
              >
                <span aria-hidden="true" className={`${styles.icon} ${k.tone}`}>
                  <Icon name={k.icon} size={20} />
                </span>
                <span className={styles.body}>
                  <span className={styles.top}>
                    <b>{k.label}</b>
                    <span>{`${pad(d.getHours())}:${pad(d.getMinutes())}`}</span>
                    {!n.read && <span aria-label="안 읽음" className={styles.dot} />}
                  </span>
                  <span className={styles.title}>{n.message}</span>
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {error ? (
        <ErrorView message={error} onRetry={loadMore} />
      ) : (
        hasNext && <div ref={sentinel}>{loading && <Loading />}</div>
      )}
    </AppFrame>
  )
}
