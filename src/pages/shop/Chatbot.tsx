import { useEffect, useRef, useState, type FormEvent } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { ApiError, errorMessage } from '../../lib/api'
import {
  askChatbot,
  CHAT_MAX_LENGTH,
  getChatConversations,
  getChatMessages,
  type ChatMessage,
  type ChatSource,
} from '../../lib/api/ai'
import { useApi } from '../../lib/useApi'
import styles from './Chatbot.module.css'

type Msg =
  | { key: string; from: 'me'; text: string }
  | { key: string; from: 'bot'; text: string; sources: ChatSource[] }
  | { key: string; from: 'error'; text: string }

const toMsg = (m: ChatMessage): Msg =>
  m.role === 'USER'
    ? { key: `m${m.messageId}`, from: 'me', text: m.content }
    : { key: `m${m.messageId}`, from: 'bot', text: m.content, sources: m.sources }

/** 2026-11-17T10:20:30 → 11.17 10:20 */
function chatTime(iso: string) {
  const m = /^\d{4}-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso)
  return m ? `${m[1]}.${m[2]} ${m[3]}:${m[4]}` : iso
}

/** ⑱ 팔레트 챗봇 (FAQ 근거 AI 챗봇) */
export default function ChatbotPage() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [opening, setOpening] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const seq = useRef(0)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [msgs.length, pending])

  const send = async (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    const id = ++seq.current
    setMsgs((m) => [...m, { key: `q${id}`, from: 'me', text }])
    setInput('')
    setPending(true)
    try {
      const res = await askChatbot(text, conversationId)
      if (id !== seq.current) return
      setConversationId(res.conversationId)
      setMsgs((m) => [...m, { key: `a${id}`, from: 'bot', text: res.answer, sources: res.sources }])
    } catch (err) {
      if (id !== seq.current) return
      // 이어 묻던 대화가 사라졌으면 다음 질문은 새 대화로 시작
      if (err instanceof ApiError && err.status === 404) setConversationId(null)
      setMsgs((m) => [...m, { key: `e${id}`, from: 'error', text: errorMessage(err) }])
    } finally {
      if (id === seq.current) setPending(false)
    }
  }

  const openConversation = async (cid: number) => {
    const id = ++seq.current
    setHistoryOpen(false)
    setPending(false)
    setOpening(true)
    try {
      const list = await getChatMessages(cid)
      if (id !== seq.current) return
      setConversationId(cid)
      setMsgs(list.map(toMsg))
    } catch (err) {
      if (id !== seq.current) return
      setConversationId(null)
      setMsgs([{ key: `e${id}`, from: 'error', text: errorMessage(err) }])
    } finally {
      if (id === seq.current) setOpening(false)
    }
  }

  const startNew = () => {
    seq.current++
    setHistoryOpen(false)
    setPending(false)
    setOpening(false)
    setConversationId(null)
    setMsgs([])
  }

  return (
    <AppFrame
      solidDock
      bottom={
        <form className={styles.inputBar} onSubmit={send}>
          <input
            aria-label="메시지"
            placeholder="궁금한 걸 물어보세요"
            value={input}
            maxLength={CHAT_MAX_LENGTH}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" aria-label="보내기" disabled={!input.trim() || pending || opening}>
            <Icon name="send" size={18} strokeWidth={2} />
          </button>
        </form>
      }
    >
      <PageHeader
        back
        home={false}
        title="팔레트 챗봇"
        right={<HeaderIcon icon="clock" label="대화 내역" onClick={() => setHistoryOpen(true)} />}
      />
      <div className={styles.chat} aria-live="polite">
        <p className={styles.lead}>회원·충전·주문·배송·반품·정산을 물어볼 수 있어요</p>
        {opening ? (
          <Loading label="대화를 불러오는 중이에요" />
        ) : (
          msgs.map((m) =>
            m.from === 'me' ? (
              <div key={m.key} className={styles.me}>
                <p>{m.text}</p>
              </div>
            ) : (
              <div key={m.key} className={styles.bot}>
                <p className={m.from === 'error' ? `${styles.bubble} ${styles.error}` : styles.bubble}>{m.text}</p>
                {m.from === 'bot' && m.sources.length > 0 && (
                  <ul className={styles.sources} aria-label="참고한 FAQ">
                    {m.sources.map((s) => (
                      <li key={s.faqId} className={styles.source} title={s.question}>
                        참고 · {s.categoryLabel} · {s.question}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ),
          )
        )}
        {pending && (
          <div className={styles.bot} role="status" aria-label="답변을 만드는 중이에요">
            <span className={`${styles.bubble} ${styles.typing}`}>
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {historyOpen && (
        <HistorySheet onSelect={openConversation} onNew={startNew} onClose={() => setHistoryOpen(false)} />
      )}
    </AppFrame>
  )
}

/** 대화 내역 (최근 대화 순) */
function HistorySheet({
  onSelect,
  onNew,
  onClose,
}: {
  onSelect: (conversationId: number) => void
  onNew: () => void
  onClose: () => void
}) {
  const { data, loading, error, reload } = useApi(() => getChatConversations({ size: 20 }), [])

  return (
    <Sheet
      title="대화 내역"
      onClose={onClose}
      footer={
        <Button variant="outline" onClick={onNew}>
          새 대화 시작
        </Button>
      }
    >
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data?.items.length ? (
        <Empty title="아직 나눈 대화가 없어요" />
      ) : (
        <ul className={styles.history}>
          {data.items.map((c) => (
            <li key={c.conversationId}>
              <button type="button" onClick={() => onSelect(c.conversationId)}>
                <b>{c.title}</b>
                <span>{chatTime(c.lastMessageAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
