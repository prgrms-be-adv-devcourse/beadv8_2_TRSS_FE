/**
 * 관리자 화면 공통 표시 값 (판매자 심사·회원)
 */
import type { CSSProperties } from 'react'
import type { SellerStatus } from './api/member'

/** 판매자 상태 [탭 이름, 칩 색, 칩 이름]. 관리자 화면 표기 */
export const ADMIN_SELLER_STATUS: Record<SellerStatus, [string, string, string]> = {
  PENDING: ['심사 대기', 'c-blue', '심사 대기'],
  APPROVED: ['승인', 'c-ok', '판매 중'],
  REJECTED: ['반려', 'c-low', '반려'],
  WITHDRAW_REQUESTED: ['철회 요청', 'c-low', '철회 요청'],
  WITHDRAWN: ['철회됨', 'c-mute', '철회됨'],
  SANCTIONED: ['제재됨', 'c-low', '제재됨'],
}

/** 작은 버튼(탭·페이지 번호)과 선택된 모양 */
export const SMALL_BTN: CSSProperties = { minHeight: '36px', fontSize: '13px', padding: '0 12px' }
export const SMALL_BTN_ON: CSSProperties = {
  ...SMALL_BTN,
  borderColor: '#26262C',
  background: '#26262C',
  color: '#fff',
}

/** 2026-10-08T10:00:00 → 10.08 */
export const fmtDay = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '-'
    : `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** 2026-10-09T14:05:00 → 10.09 14:05 */
export const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
