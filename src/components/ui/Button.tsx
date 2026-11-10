import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

export type ButtonVariant = 'primary' | 'outline' | 'soft' | 'ghost' | 'danger' | 'dangerOutline'
export type ButtonSize = 'sm' | 'md' | 'lg'

type Common = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 꽉 찬 폭. 로그인 화면처럼 시안이 꽉 찬 버튼일 때만 써요. 기본은 글씨 길이만큼 */
  block?: boolean
  className?: string
  children: ReactNode
}

type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined }
type AsLink = Common & { to: string; state?: unknown; onClick?: () => void; 'aria-label'?: string }

export function buttonClass({ variant = 'primary', size = 'md', block, className }: Omit<Common, 'children'>) {
  return [styles.btn, styles[size], styles[variant], block ? styles.block : '', className ?? ''].join(' ')
}

/** 알약 모양 버튼. to를 주면 링크로 그려요. */
export default function Button(props: AsButton | AsLink) {
  if (props.to !== undefined) {
    const { variant, size, block, className, children, to, state, ...rest } = props
    return (
      <Link to={to} state={state} className={buttonClass({ variant, size, block, className })} {...rest}>
        {children}
      </Link>
    )
  }
  const { variant, size, block, className, children, type = 'button', ...rest } = props
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...rest}>
      {children}
    </button>
  )
}
