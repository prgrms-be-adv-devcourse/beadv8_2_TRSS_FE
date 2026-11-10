import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Thumb } from '../../components/ui/Misc'
import styles from './Chatbot.module.css'

type Msg =
  | { id: number; from: 'me'; text: string }
  | {
      id: number
      from: 'bot'
      text: string
      source?: string
      order?: { img: string; title: string; status: string }
      link?: { to: string; label: string }
    }

// TODO(API 미구현): POST /ai/chat — 챗봇 대화. 지금은 시안의 예시 대화를 보여주고, 보낸 질문에는 고정 안내로 답해요
const SAMPLE: Msg[] = [
  { id: 1, from: 'me', text: '반품은 언제까지 할 수 있어요?' },
  {
    id: 2,
    from: 'bot',
    text: '주문한 상품이 모두 배송 완료된 뒤, 구매 확정 전까지 반품을 요청할 수 있어요. 배송 완료 7일 뒤에는 자동으로 구매 확정돼요.',
    source: '참고 · 반품 정책',
  },
  { id: 3, from: 'me', text: '제 주문 지금 어디쯤이에요?' },
  {
    id: 4,
    from: 'bot',
    text: '11월 9일 주문은 배송 중이에요.',
    order: { img: '/images/windbreaker.jpg', title: '라이트 윈드브레이커 외 1건', status: '[택배사] · 간선 하차 11.10 08:12' },
    source: '참고 · 내 주문 [주문번호]',
  },
  { id: 5, from: 'me', text: '주문을 취소하고 싶어요' },
  {
    id: 6,
    from: 'bot',
    text: '도우미는 조회와 안내만 할 수 있어요. 결제 전 주문은 주문 상세에서 취소할 수 있어요.',
    link: { to: '/orders', label: '주문 내역으로 가기' },
  },
]

/** ⑱ 팔레트 도우미 (AI 챗봇) */
export default function ChatbotPage() {
  const [msgs, setMsgs] = useState<Msg[]>(SAMPLE)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' })
  }, [msgs.length])

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    const id = Date.now()
    setMsgs((m) => [
      ...m,
      { id, from: 'me', text },
      { id: id + 1, from: 'bot', text: '도우미는 아직 준비 중이에요. 곧 배송·반품·쿠폰·충전과 내 주문을 안내해 드릴게요.' },
    ])
    setInput('')
  }

  return (
    <AppFrame
      bottom={
        <form className={styles.inputBar} onSubmit={send}>
          <input
            aria-label="메시지"
            placeholder="궁금한 걸 물어보세요"
            value={input}
            maxLength={500}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" aria-label="보내기" disabled={!input.trim()}>
            <Icon name="chevron" size={20} />
          </button>
        </form>
      }
    >
      <PageHeader back title="팔레트 도우미" />
      <div className={styles.chat} aria-live="polite">
        <p className={styles.lead}>배송·반품·쿠폰·충전과 내 주문을 물어볼 수 있어요</p>
        {msgs.map((m) =>
          m.from === 'me' ? (
            <div key={m.id} className={styles.me}>
              <p>{m.text}</p>
            </div>
          ) : (
            <div key={m.id} className={styles.bot}>
              <div className={styles.bubble}>
                <p>{m.text}</p>
                {m.order && (
                  <div className={styles.order}>
                    <Thumb src={m.order.img} width={44} height={44} radius={8} />
                    <span>
                      <b>{m.order.title}</b>
                      <span>{m.order.status}</span>
                    </span>
                  </div>
                )}
              </div>
              {m.source && <span className={styles.source}>{m.source}</span>}
              {m.link && (
                <Link to={m.link.to} className={styles.link}>
                  {m.link.label}
                </Link>
              )}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
    </AppFrame>
  )
}
