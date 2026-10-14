import { useState, type ChangeEvent } from 'react'
// props: { retryModal = '숨김' }: { retryModal?: '숨김' | '보임' }
// ---- body ----
const [open, setOpen] = useState(retryModal === '보임')
const [reason, setReasonText] = useState('')
const view = {
  retryOpen: open,
  noReason: !reason.trim(),
  openRetry: () => { setReasonText(''); setOpen(true) },
  closeRetry: () => setOpen(false),
  setReason: (e: ChangeEvent<HTMLTextAreaElement>) => setReasonText(e.target.value),
}
