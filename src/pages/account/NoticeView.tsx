// 안내 내용 타입만 가져와요 (lib/notices가 이 타입으로 문구를 만들어요). 옛 모달 컴포넌트는 쓰지 않아요
import type { Notice } from '../../components/NoticeModal'
import Button from '../../components/ui/Button'
import { Modal } from '../../components/ui/Overlay'
import { mmss } from '../../lib/useRemaining'
import { useCountdown } from './util'
import s from './account.module.css'

function Countdown({ label, until }: { label: string; until: number }) {
  const left = useCountdown(until)
  return (
    <span className={s.noticeChip}>
      {label} {mmss(left)} 남음
    </span>
  )
}

/**
 * lib/notices 의 안내(Notice)를 새 Modal로 그려요. notice가 null이면 그리지 않아요.
 * 버튼: to가 있으면 이동, onClick이 있으면 실행, 둘 다 없으면 닫기만
 */
export default function NoticeView({ notice, onClose }: { notice: Notice | null; onClose: () => void }) {
  if (!notice) return null
  return (
    <Modal
      title={notice.title}
      onClose={onClose}
      actions={notice.actions.map((a) =>
        a.to ? (
          <Button key={a.label} to={a.to} state={a.state} variant={a.primary ? 'primary' : 'outline'} onClick={onClose}>
            {a.label}
          </Button>
        ) : (
          <Button
            key={a.label}
            variant={a.primary ? 'primary' : 'outline'}
            onClick={() => {
              onClose()
              a.onClick?.()
            }}
          >
            {a.label}
          </Button>
        ),
      )}
    >
      {notice.countdown && <Countdown {...notice.countdown} />}
      {notice.rows && (
        <dl className={s.noticeRows}>
          {notice.rows.map((r) => (
            <div key={r.label} className={r.strong ? s.noticeStrong : undefined}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {notice.body}
    </Modal>
  )
}
