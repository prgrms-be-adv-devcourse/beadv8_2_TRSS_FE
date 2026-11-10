import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Icon, { type IconName } from './Icon'
import styles from './PageHeader.module.css'

type Props = {
  title: ReactNode
  /** 뒤로 버튼. true면 브라우저 뒤로, 문자열이면 그 주소로 */
  back?: boolean | string
  /** 제목 앞 작은 배지 (판매자 · 관리자 · 물류) */
  badge?: ReactNode
  /** 오른쪽 아이콘·버튼 */
  right?: ReactNode
  /** 관리자 모바일처럼 검은 헤더 */
  dark?: boolean
  /** 오른쪽 끝 홈 버튼. 기본: 뒤로 버튼이 있으면 보여요 (판매자·관리자 틀처럼 자체 버튼이 있으면 false) */
  home?: boolean
  className?: string
}

/** 화면 상단 헤더 (높이 52px · 제목 18px/600 · 왼쪽 정렬) */
export default function PageHeader({ title, back, badge, right, dark, className, home = !!back }: Props) {
  const navigate = useNavigate()
  const goBack = () => {
    if (typeof back === 'string') navigate(back)
    else if (window.history.length > 1) navigate(-1)
    else navigate('/')
  }
  return (
    <header
      className={[styles.header, back ? styles.withBack : '', dark ? styles.dark : '', className ?? ''].join(' ')}
    >
      {back && (
        <button type="button" aria-label="뒤로" className={styles.iconBtn} onClick={goBack}>
          <Icon name="back" />
        </button>
      )}
      {badge && <span className={styles.badge}>{badge}</span>}
      <h1 className={styles.title}>{title}</h1>
      {(right || home) && (
        <div className={styles.right}>
          {right}
          {home && <HeaderIcon to="/" icon="home" label="홈으로" />}
        </div>
      )}
    </header>
  )
}

/** 헤더 오른쪽 아이콘 링크 */
export function HeaderIcon({
  to,
  icon,
  label,
  dot,
  badge,
  onClick,
  state,
}: {
  to?: string
  icon: IconName
  label: string
  dot?: boolean
  /** 숫자 배지 (장바구니 개수 등). 0이나 undefined면 안 보여요 */
  badge?: number
  onClick?: () => void
  state?: unknown
}) {
  const body = (
    <>
      <Icon name={icon} />
      {dot && <span className={styles.dot} />}
      {!!badge && <span className={styles.count}>{badge > 99 ? '99+' : badge}</span>}
    </>
  )
  if (to)
    return (
      <Link to={to} state={state} aria-label={label} className={styles.iconBtn} onClick={onClick}>
        {body}
      </Link>
    )
  return (
    <button type="button" aria-label={label} className={styles.iconBtn} onClick={onClick}>
      {body}
    </button>
  )
}
