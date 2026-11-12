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
 * 제목과 아래 작은 줄 (예: "라이트 윈드브레이커 외 2개 · CJ대한통운 1234")
 * - 서버 문구 끝의 괄호(택배사·송장번호)는 제목에서 뗀다
 * - 택배사 필드가 없는 이전 알림은 그 괄호 내용을 대신 쓴다
 * - 상품명이 없으면 상품 부분을 뺀다
 */
function textOf(n: NotificationItem) {
  const m = n.message.match(/^(.*?)\s*\(([^()]+)\)$/)
  const title = m ? m[1] : n.message
  const product = n.productName
    ? n.itemCount && n.itemCount > 1
      ? `${n.productName} 외 ${n.itemCount - 1}개`
      : n.productName
    : null
  const shipping = n.carrierName ? [n.carrierName, n.trackingNumber].filter(Boolean).join(' ') : (m?.[2] ?? null)
  const desc = [product, shipping].filter(Boolean).join(' · ')
  return { title, desc: desc || null }
}

type Tab = 'ALL' | NotificationType
const TABS: Tab[] = ['ALL', 'ORDER_PAID', 'DELIVERY_STARTED', 'DELIVERY_COMPLETED']

/** 탭 하나의 목록 상태. 커서는 유형별로 따로 이어진다 */
type Feed = {
  items: NotificationItem[]
  cursor: number | null
  hasNext: boolean
  loading: boolean
  error: string | null
}
const EMPTY_FEED: Feed = { items: [], cursor: null, hasNext: true, loading: false, error: null }

/** ①-1 알림 */
export default function NotificationsPage() {
  const unreadCount = useNotificationCount()
  const [tab, setTab] = useState<Tab>('ALL')
  // 탭을 오가도 불러온 목록을 그대로 둔다
  const [feeds, setFeeds] = useState<Partial<Record<Tab, Feed>>>({})
  const loadingRef = useRef(new Set<Tab>())
  const { items, hasNext, loading, error } = feeds[tab] ?? EMPTY_FEED

  const patch = (t: Tab, next: (f: Feed) => Partial<Feed>) =>
    setFeeds((prev) => {
      const f = prev[t] ?? EMPTY_FEED
      return { ...prev, [t]: { ...f, ...next(f) } }
    })

  const loadMore = useCallback(async () => {
    const t = tab
    const f = feeds[t] ?? EMPTY_FEED
    if (loadingRef.current.has(t) || !f.hasNext) return
    loadingRef.current.add(t)
    patch(t, () => ({ loading: true, error: null }))
    try {
      const page = await getNotifications({ type: t === 'ALL' ? null : t, cursor: f.cursor, size: PAGE_SIZE })
      patch(t, (cur) => ({
        items: [...cur.items, ...page.items],
        cursor: page.nextCursor,
        hasNext: page.hasNext,
        loading: false,
      }))
    } catch (e) {
      patch(t, () => ({ loading: false, error: errorMessage(e) }))
    } finally {
      loadingRef.current.delete(t)
    }
  }, [tab, feeds])

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
    // 같은 알림이 전체 탭과 유형 탭에 함께 있으므로 모든 탭에서 읽음으로 바꾼다
    setFeeds((prev) => {
      const next: typeof prev = {}
      for (const [t, f] of Object.entries(prev) as Array<[Tab, Feed]>) {
        next[t] = { ...f, items: f.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }
      }
      return next
    })
    readNotification(n.id).catch(() => {
      // 읽음 처리가 실패해도 주문 상세로는 이동한다. 다음 조회 때 다시 안 읽음으로 보인다
    })
  }

  const now = new Date()
  const tabLabel = (t: Tab) => (t === 'ALL' ? (unreadCount ? `전체 ${unreadCount}` : '전체') : KIND[t].label)

  return (
    <AppFrame>
      <PageHeader back title="알림" />

      <div role="tablist" aria-label="알림 종류" className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            className={t === tab ? styles.chipOn : styles.chip}
            onClick={() => setTab(t)}
          >
            {tabLabel(t)}
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
          const text = textOf(n)
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
                  <span className={styles.title}>{text.title}</span>
                  {text.desc && <span className={styles.desc}>{text.desc}</span>}
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

      {!hasNext && items.length > 0 && <p className={styles.foot}>최근 30일 알림만 보여요</p>}
    </AppFrame>
  )
}
