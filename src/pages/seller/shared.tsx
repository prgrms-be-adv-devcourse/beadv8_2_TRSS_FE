import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import Button from '../../components/ui/Button'
import type { Tone } from '../../components/ui/Misc'
import type { ProductDisplayStatus, ProductStoppedBy } from '../../lib/api/product'
import type { SellerStatus } from '../../lib/api/member'
import s from './seller.module.css'

/* ── 날짜 ───────────────────────────────────────────── */
const p2 = (n: number) => String(n).padStart(2, '0')
const toDate = (iso?: string | null) => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}
/** '2026-10-09T14:06:00' → '10.09' */
export const fmtMD = (iso?: string | null) => {
  const d = toDate(iso)
  return d ? `${p2(d.getMonth() + 1)}.${p2(d.getDate())}` : '-'
}
/** '2026-10-09T14:06:00' → '10.09 14:06' */
export const fmtMDHM = (iso?: string | null) => {
  const d = toDate(iso)
  return d ? `${p2(d.getMonth() + 1)}.${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}` : '-'
}
/** '2026-09-12T10:00:00' → '2026년 9월 12일' */
export const fmtYMD = (iso?: string | null) => {
  const d = toDate(iso)
  return d ? `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일` : '-'
}
/** Date → 'yyyy-MM-dd' (내 컴퓨터 날짜 기준) */
export const ymd = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
/** 오늘에서 n개월 전 'yyyy-MM-dd' */
export function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  return ymd(d)
}

/**
 * 쿠폰 기간. 백엔드 validFrom은 포함, validUntil은 포함하지 않아요.
 * 화면은 '종료일(포함)'로 고르고, 보낼 때 다음 날 0시로 바꿔요.
 */
export const startOf = (date: string) => `${date}T00:00:00`
export const endExclusiveOf = (date: string) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + 1)
  return `${ymd(d)}T00:00:00`
}
/** validUntil(미포함) → 화면의 종료일(포함) 'yyyy-MM-dd' */
export const endDateOf = (validUntil: string) => {
  const d = toDate(validUntil)
  if (!d) return validUntil.slice(0, 10)
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) d.setDate(d.getDate() - 1)
  return ymd(d)
}
/** 쿠폰 기간 표시: '11.01 ~ 11.30' */
export const fmtPeriod = (validFrom: string, validUntil: string) =>
  `${fmtMD(validFrom)} ~ ${endDateOf(validUntil).slice(5).replace('-', '.')}`

/* ── 숫자 ───────────────────────────────────────────── */
/** 숫자만 남기고 앞의 0을 지워요 */
export const digits = (v: string) => v.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')
/** 증감 표시. 음수는 진짜 빼기 기호(−) */
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/* ── 상태 표기 ───────────────────────────────────────── */
export const PRODUCT_STATUS: Record<ProductDisplayStatus, [string, Tone]> = {
  ON_SALE: ['판매중', 'green'],
  SOLD_OUT: ['품절', 'neutral'],
  STOPPED: ['판매 중지', 'red'],
}
export const STOPPED_BY: Record<ProductStoppedBy, string> = {
  ADMIN: '관리자가 중지했어요.',
  SELLER_REQUEST: '중지 요청이 승인됐어요.',
  SELLER_WITHDRAWN: '판매자 철회·제재로 중지됐어요.',
}
export const SELLER_STATUS: Record<SellerStatus, [string, Tone]> = {
  PENDING: ['심사 중', 'amber'],
  APPROVED: ['판매 중', 'green'],
  REJECTED: ['반려됨', 'red'],
  WITHDRAW_REQUESTED: ['철회 심사 중', 'neutral'],
  WITHDRAWN: ['철회됨', 'neutral'],
  SANCTIONED: ['이용 제한', 'red'],
}

/* ── URL 쿼리 상태 ───────────────────────────────────── */
/** 쿼리 일부를 바꿔요. 값이 없으면 지우고, 조건이 바뀌면 1페이지로 돌아가요. */
export function useQueryState() {
  const [params, setParams] = useSearchParams()
  const update = (next: Record<string, string | undefined>, keepPage = false) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(next)) {
          if (v) p.set(k, v)
          else p.delete(k)
        }
        if (!keepPage) p.delete('page')
        return p
      },
      { replace: true },
    )
  const page = Math.max(1, Number(params.get('page')) || 1)
  return { params, update, page }
}

/* ── 작은 조각 ───────────────────────────────────────── */
/** 페이지 이동 (이전 · n / 전체 · 다음) */
export function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (n: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="페이지" className={s.pager}>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <span className={s.pagerNum}>
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음
      </Button>
    </nav>
  )
}

/** 결과 안내(초록) · 오류 안내(빨강) 한 줄 */
export function Notice({ tone = 'done', children, onClose }: { tone?: 'done' | 'error' | 'info'; children: ReactNode; onClose?: () => void }) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`${s.notice} ${s[`notice_${tone}`]}`}>
      <span>{children}</span>
      {onClose && (
        <button type="button" className={s.noticeClose} onClick={onClose} aria-label="닫기">
          ✕
        </button>
      )}
    </div>
  )
}
