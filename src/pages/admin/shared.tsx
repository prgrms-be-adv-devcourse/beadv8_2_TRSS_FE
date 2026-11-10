/**
 * 관리자(운영) 화면 공통 조각: 페이지 번호, 상세 정보 줄, 처리 결과 안내, 날짜 표기
 */
import type { ReactNode } from 'react'
import type { SellerStatus } from '../../lib/api/member'
import type { Tone } from '../../components/ui/Misc'
import s from './admin.module.css'

/** 판매자 상태 [이름, 배지 색]. 관리자 화면 표기 */
export const SELLER_STATUS: Record<SellerStatus, [string, Tone]> = {
  PENDING: ['심사 중', 'amber'],
  APPROVED: ['판매 중', 'green'],
  REJECTED: ['반려됨', 'red'],
  WITHDRAW_REQUESTED: ['철회 심사 중', 'neutral'],
  WITHDRAWN: ['철회됨', 'neutral'],
  SANCTIONED: ['제재됨', 'red'],
}

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (iso: string | null | undefined) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 2026-10-08T10:00:00 → 10.08 */
export const fmtDay = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '-'
}

/** 2026-10-08T10:00:00 → 2026.10.08 */
export const fmtDate = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}` : '-'
}

/** 2026-10-09T14:05:00 → 10.09 14:05 */
export const fmtDateTime = (iso: string | null | undefined) => {
  const d = toDate(iso)
  return d ? `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-'
}

/** 1234567890 → 123-45-67890 */
export const fmtBusinessNumber = (n: string | null | undefined) =>
  n && /^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}` : (n ?? '-')

/** 01012345678 → 010-1234-5678 */
export const fmtPhone = (n: string | null | undefined) => {
  if (!n) return '-'
  const d = n.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return n
}

/** 상세 패널의 '이름 — 값' 한 줄 */
export function InfoRow({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={s.infoRow}>
      <span>{label}</span>
      <b>{children}</b>
    </div>
  )
}

/** 처리 결과 안내 (성공: role=status, 실패: role=alert) */
export function Notice({ tone = 'ok', children }: { tone?: 'ok' | 'error'; children: ReactNode }) {
  if (!children) return null
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={tone === 'error' ? s.noticeError : s.noticeOk}>
      {children}
    </p>
  )
}

/** 페이지 번호 (이전 · 현재/전체 · 다음). 1페이지뿐이면 그리지 않아요 */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (next: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="페이지" className={s.pager}>
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </button>
      <span className={s.pagerNow}>
        {page} / {totalPages}
      </span>
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음
      </button>
    </nav>
  )
}

/** 사유 입력칸 (반려·제재·중지) */
export function ReasonField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  max = 255,
  rows = 3,
}: {
  id: string
  label: ReactNode
  hint?: ReactNode
  value: string
  onChange: (v: string) => void
  placeholder?: string
  max?: number
  rows?: number
}) {
  return (
    <div className={s.reason}>
      <label htmlFor={id} className={s.reasonLabel}>
        {label}
        {hint && <span> {hint}</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={s.textarea}
      />
    </div>
  )
}
