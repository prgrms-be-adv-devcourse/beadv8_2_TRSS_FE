import type { ReactNode } from 'react'
import Button from './Button'
import Icon from './Icon'
import styles from './Misc.module.css'

export type Tone = 'neutral' | 'green' | 'red' | 'blue' | 'amber' | 'dark'

/** 작은 상태 배지 (판매중 · 배송 완료 · 반려 …) */
export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>
}

/** 상품 이미지. 주소가 없으면 회색 자리표시 */
export function Thumb({
  src,
  alt = '',
  width,
  height,
  radius = 8,
  className,
}: {
  src?: string | null
  alt?: string
  width?: number | string
  height?: number | string
  radius?: number
  className?: string
}) {
  return (
    <span className={`${styles.thumb} ${className ?? ''}`} style={{ width, height, borderRadius: radius }}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <span className={styles.thumbEmpty} aria-hidden="true">
          <Icon name="box" size={20} strokeWidth={1.4} />
        </span>
      )}
    </span>
  )
}

export function Loading({ label = '불러오는 중이에요' }: { label?: string }) {
  return (
    <div className={styles.state} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      {label}
    </div>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={styles.state} role="alert">
      <p className={styles.stateBody}>{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          다시 불러오기
        </Button>
      )}
    </div>
  )
}

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.state}>
      <p className={styles.stateTitle}>{title}</p>
      {children && <p className={styles.stateBody}>{children}</p>}
      {action}
    </div>
  )
}

type Opt<T extends string> = { value: T; label: ReactNode }

/** 가로 스크롤 칩 (상태 필터 · 카테고리) */
export function Chips<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Opt<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className={styles.chips}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          aria-pressed={it.value === value}
          className={`${styles.chip} ${it.value === value ? styles.chipOn : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** 회색 바탕 세그먼트 탭 (PC 표 위 상태 필터) */
export function Segment<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Opt<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={styles.segment}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          className={`${styles.segBtn} ${it.value === value ? styles.segOn : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** 밑줄 탭 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: Opt<T>[]
  value: T
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="tablist" aria-label={label} className={styles.tabs}>
      {items.map((it) => (
        <button
          key={it.value}
          type="button"
          role="tab"
          aria-selected={it.value === value}
          className={`${styles.tab} ${it.value === value ? styles.tabOn : ''}`}
          onClick={() => onChange(it.value)}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}

/** 금액 표기: 12,000원 */
export function won(n: number | null | undefined) {
  return `${(n ?? 0).toLocaleString('ko-KR')}원`
}
