import { useEffect, useState, type ReactNode } from 'react'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import s from './parts.module.css'

/** 화면 위 안내 (성공 · 실패) */
export function Notice({ tone = 'ok', children }: { tone?: 'ok' | 'error'; children: ReactNode }) {
  if (!children) return null
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`${s.notice} ${tone === 'error' ? s.noticeError : ''}`}>
      {children}
    </p>
  )
}

/** 이전 · 다음 페이지 (page는 1부터) */
export function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="페이지" className={s.pager}>
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        이전
      </Button>
      <span className={s.pagerNow}>
        {page} / {totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        다음
      </Button>
    </nav>
  )
}

/** 오른쪽에서 열리는 상세 패널 (모바일은 화면 전체) */
export function Drawer({
  title,
  onClose,
  children,
  footer,
}: {
  title: ReactNode
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className={s.drawerBackdrop} onClick={onClose}>
      <aside role="dialog" aria-modal="true" className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHead}>
          <h2 className={s.drawerTitle}>{title}</h2>
          <button type="button" aria-label="닫기" className={s.drawerClose} onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className={s.drawerBody}>{children}</div>
        {footer && <div className={s.drawerFoot}>{footer}</div>}
      </aside>
    </div>
  )
}

/**
 * 사유를 받아 처리하는 모달 (재처리 · 보류 · 제외 · 강제 중지 · 원장 불일치 확인)
 * onConfirm이 문자열을 돌려주면 오류로 보여 주고 모달을 열어 둬요. 아무것도 안 돌려주면 닫아요.
 */
export function ReasonModal({
  title,
  children,
  label,
  placeholder,
  help,
  confirmLabel,
  danger,
  maxLength = 300,
  onConfirm,
  onClose,
}: {
  title: ReactNode
  children?: ReactNode
  label: string
  placeholder?: string
  help?: ReactNode
  confirmLabel: string
  danger?: boolean
  maxLength?: number
  onConfirm: (reason: string) => Promise<string | void>
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    const r = reason.trim()
    if (!r || busy) return
    setBusy(true)
    setError('')
    try {
      const msg = await onConfirm(r)
      if (msg) setError(msg)
      else onClose()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={title}
      onClose={busy ? undefined : onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            취소
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={submit} disabled={!reason.trim() || busy}>
            {busy ? '처리 중…' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className={s.modalLeft}>
        {children}
        <label className={f.field}>
          <span className={f.label}>
            {label}
            <span className={f.req}>*</span>
          </span>
          <textarea
            className={f.textarea}
            placeholder={placeholder}
            value={reason}
            maxLength={maxLength}
            onChange={(e) => setReason(e.target.value)}
          />
          {help && <span className={f.help}>{help}</span>}
        </label>
        {error && (
          <p role="alert" className={f.error}>
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}

/** 정의 목록 한 줄 */
export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className={s.row}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
