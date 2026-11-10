import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon, { type IconName } from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, Thumb } from '../../components/ui/Misc'
import { MOCK_NOTIFICATIONS, type NotiKind } from './mock'
import styles from './Notifications.module.css'

const KIND: Record<NotiKind, { label: string; icon: IconName; tone: string }> = {
  pay: { label: '결제 완료', icon: 'won', tone: styles.toneNeutral },
  ship: { label: '배송 시작', icon: 'truck', tone: styles.toneNeutral },
  done: { label: '배송 완료', icon: 'box', tone: styles.toneGreen },
}
type Tab = 'all' | NotiKind

/**
 * ①-1 알림
 * TODO(API 미구현): GET /notifications, PATCH /notifications/{id}/read — 지금은 목업 목록이고 읽음은 화면 안에서만 바뀌어요
 */
export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>('all')
  const [read, setRead] = useState<Set<number>>(() => new Set())

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => n.unread && !read.has(n.id)).length
  const tabs: Array<[Tab, string]> = [
    ['all', unreadCount ? `전체 ${unreadCount}` : '전체'],
    ['pay', '결제 완료'],
    ['ship', '배송 시작'],
    ['done', '배송 완료'],
  ]
  const list = MOCK_NOTIFICATIONS.filter((n) => tab === 'all' || n.kind === tab)

  return (
    <AppFrame>
      <PageHeader back title="알림" />

      <div role="tablist" aria-label="알림 종류" className={styles.tabs}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={key === tab}
            className={key === tab ? styles.chipOn : styles.chip}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 && <Empty title="알림이 없어요" />}

      <ul className={styles.list}>
        {list.map((n, i) => {
          const k = KIND[n.kind]
          const unread = n.unread && !read.has(n.id)
          const head = i === 0 || list[i - 1].group !== n.group
          return (
            <li key={n.id}>
              {head && <p className={styles.group}>{n.group}</p>}
              <Link
                to={n.to}
                className={`${styles.row} ${unread ? styles.unread : ''}`}
                onClick={() => setRead((s) => new Set(s).add(n.id))}
              >
                <span aria-hidden="true" className={`${styles.icon} ${k.tone}`}>
                  <Icon name={k.icon} size={20} />
                </span>
                <span className={styles.body}>
                  <span className={styles.top}>
                    <b>{k.label}</b>
                    <span>{n.time}</span>
                    {unread && <span aria-label="안 읽음" className={styles.dot} />}
                  </span>
                  <span className={styles.title}>{n.title}</span>
                  <span className={styles.desc}>{n.body}</span>
                </span>
                <Thumb src={n.img} width={48} height={48} radius={8} />
              </Link>
            </li>
          )
        })}
      </ul>

      <p className={styles.foot}>최근 30일 알림만 보여요</p>
    </AppFrame>
  )
}
