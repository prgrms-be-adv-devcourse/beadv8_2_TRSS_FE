import type { CSSProperties } from 'react'

/** CSS Module 클래스 매핑: cx('btn btn-p') → 모듈에 있는 이름은 해시된 클래스로 바꿔요. */
export function makeCx(styles: Record<string, string>) {
  return (...names: Array<string | false | null | undefined>) =>
    names
      .filter(Boolean)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => styles[n] ?? n)
      .join(' ')
}

/** 'background:#fff;color:#000' 형태의 CSS 문자열을 React style 객체로 바꿔요. */
export function css(text: string): CSSProperties {
  const out: Record<string, string> = {}
  for (const decl of text.split(';')) {
    const i = decl.indexOf(':')
    if (i < 0) continue
    const prop = decl.slice(0, i).trim()
    const value = decl.slice(i + 1).trim()
    if (!prop) continue
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase())
    out[key] = value
  }
  return out as CSSProperties
}

export const won = (n: number) => n.toLocaleString('ko-KR')

/** 01012345678 → 010-1234-5678 (자리 수가 맞지 않으면 그대로) */
export const phone = (n: string) => {
  const d = n.replace(/\D/g, '')
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
  return n
}

/** 에러·반려 사유 등 안내 박스 (로그인 화면의 에러 박스와 같은 모양) */
export const NOTICE: CSSProperties = {
  margin: '0',
  padding: '12px 14px',
  borderRadius: '8px',
  background: '#FFF1E8',
  color: '#9A3209',
  fontSize: '14px',
}
