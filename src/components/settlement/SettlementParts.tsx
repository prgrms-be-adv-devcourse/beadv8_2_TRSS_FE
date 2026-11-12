import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { fmtMonth, type YearMonth } from '../../lib/api/settlement'
import { fixRange, recentRange } from '../../lib/monthRange'
import st from './settlement.module.css'

/** 빠른 기간 값. 숫자는 지난달까지 n개월, custom은 시작 월 ~ 끝 월을 직접 고른 상태 */
export type QuickRange = '1' | '3' | '6' | '12' | 'custom'
export type Period = { quick: QuickRange; from: YearMonth; to: YearMonth }

const QUICK_LABEL: Record<QuickRange, string> = {
  '1': '지난달',
  '3': '3개월',
  '6': '6개월',
  '12': '12개월',
  custom: '직접 선택',
}

/** 처음 기간 (지난달까지 n개월) */
export const initialPeriod = (months: Exclude<QuickRange, 'custom'>): Period => ({
  quick: months,
  ...recentRange(Number(months)),
})

/**
 * 기간 줄: 기간 [빠른 기간 ▼] [시작 월 ▼] ~ [끝 월 ▼]
 * 시작이 끝보다 늦거나 12개월을 넘으면 방금 고르지 않은 쪽을 맞춰요(lib/monthRange의 fixRange).
 */
export function PeriodFilter({
  value,
  quickOptions,
  months,
  onChange,
  children,
}: {
  value: Period
  quickOptions: Exclude<QuickRange, 'custom'>[]
  /** 시작, 끝 월 선택지 (최근 달부터) */
  months: YearMonth[]
  onChange: (next: Period) => void
  /** 기간 옆에 같은 줄로 붙일 조건 (관리자 판매자 검색) */
  children?: ReactNode
}) {
  const chooseQuick = (q: QuickRange) => {
    if (q === 'custom') return onChange({ ...value, quick: 'custom' })
    onChange({ quick: q, ...recentRange(Number(q)) })
  }
  const chooseMonth = (from: YearMonth, to: YearMonth, changed: 'from' | 'to') =>
    onChange({ quick: 'custom', ...fixRange(from, to, changed) })
  const monthItems = months.map((m) => ({ value: m, label: fmtMonth(m) }))

  return (
    <div className={st.filterRow}>
      <span className={st.filterLabel} aria-hidden="true">
        기간
      </span>
      <Dropdown
        label="빠른 기간"
        className={st.quickSelect}
        value={value.quick}
        options={[...quickOptions, 'custom' as const].map((q) => ({ value: q, label: QUICK_LABEL[q] }))}
        onChange={chooseQuick}
      />
      <Dropdown
        label="시작 월"
        value={value.from}
        options={monthItems}
        onChange={(m) => chooseMonth(m, value.to, 'from')}
      />
      <span className={st.tilde} aria-hidden="true">
        ~
      </span>
      <Dropdown
        label="끝 월"
        value={value.to}
        options={monthItems}
        onChange={(m) => chooseMonth(value.from, m, 'to')}
      />
      {children}
    </div>
  )
}

/**
 * 기간 줄의 드롭다운. 브라우저 기본 select는 선택 목록을 브라우저가 그려서
 * 모바일에서 엉뚱한 곳(위쪽)에 뜨기도 해서, 목록이 항상 버튼 바로 아래에 열리도록 직접 그려요.
 * 키보드: ↑↓로 움직이고 Enter·Space로 고르고 Esc로 닫아요.
 */
export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  /** 키보드로 가리키고 있는 항목 */
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const current = options.find((o) => o.value === value)

  // 바깥을 누르면 닫아요
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  // 가리키는 항목(처음엔 고른 항목)이 목록 안에 보이게 스크롤해요
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const openList = () => {
    setActive(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    )
    setOpen(true)
  }
  const choose = (i: number) => {
    setOpen(false)
    if (options[i].value !== value) onChange(options[i].value)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    if (e.key === 'Tab') return setOpen(false)
    if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Escape'].includes(e.key)) return
    e.preventDefault()
    if (e.key === 'ArrowDown') setActive((i) => Math.min(options.length - 1, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Escape') {
      // 목록만 닫고, 드롭다운이 들어 있는 확인 창까지 닫히지 않게
      e.stopPropagation()
      setOpen(false)
    } else choose(active)
  }

  return (
    <div ref={wrapRef} className={`${st.dropdown} ${className ?? ''}`}>
      <button
        type="button"
        className={st.dropdownBtn}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        {current?.label}
      </button>
      {open && (
        <ul ref={listRef} id={listId} role="listbox" aria-label={label} className={st.dropdownList}>
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`${st.dropdownOption} ${i === active ? st.dropdownActive : ''}`}
              onClick={() => choose(i)}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** 요약 카드. onClick을 주면 눌러서 거르는 버튼 카드가 돼요 */
export function StatCard({
  label,
  value,
  sub,
  dot,
  alert,
  pressed,
  onClick,
}: {
  label: ReactNode
  value: ReactNode
  sub?: ReactNode
  /** 값 앞의 상태 점 색 (CSS 색) */
  dot?: string
  alert?: boolean
  pressed?: boolean
  onClick?: () => void
}) {
  const cls = `${st.card} ${alert ? st.cardAlert : ''} ${pressed ? st.cardOn : ''}`
  const body = (
    <>
      <span className={st.cardLabel}>{label}</span>
      <span className={st.cardValue}>
        {dot && <span className={st.dot} style={{ background: dot }} aria-hidden="true" />}
        {value}
      </span>
      {sub && <span className={st.cardSub}>{sub}</span>}
    </>
  )
  return onClick ? (
    <button type="button" className={cls} aria-pressed={pressed} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** 쪽 번호: « ‹ 1 2 3 4 5 › ». 지금 쪽을 가운데 두고 최대 size개 */
export function PageNumbers({
  page,
  totalPages,
  onChange,
  size = 7,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  size?: number
}) {
  if (totalPages <= 1) return null
  const half = Math.floor(size / 2)
  const start = Math.max(1, Math.min(page - half, totalPages - size + 1))
  const end = Math.min(totalPages, start + size - 1)
  const nums = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  const go = (n: number) => onChange(Math.min(totalPages, Math.max(1, n)))
  return (
    <nav aria-label="쪽 이동" className={st.pages}>
      <button type="button" className={st.pageBtn} aria-label="첫 쪽" disabled={page <= 1} onClick={() => go(1)}>
        «
      </button>
      <button
        type="button"
        className={st.pageBtn}
        aria-label="이전 쪽"
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        ‹
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          className={st.pageBtn}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => go(n)}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={st.pageBtn}
        aria-label="다음 쪽"
        disabled={page >= totalPages}
        onClick={() => go(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className={st.pageBtn}
        aria-label="마지막 쪽"
        disabled={page >= totalPages}
        onClick={() => go(totalPages)}
      >
        »
      </button>
    </nav>
  )
}

export { st as settlementStyles }
