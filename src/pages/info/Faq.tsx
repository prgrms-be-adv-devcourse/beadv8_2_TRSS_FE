import { useRef, useState, type FormEvent } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading } from '../../components/ui/Misc'
import PageHeader from '../../components/ui/PageHeader'
import { errorMessage } from '../../lib/api'
import { FAQ_QUESTION_MAX, searchFaqs, type FaqSearchItem } from '../../lib/api/faq'
import s from './info.module.css'

/** 처음 들어왔을 때 눌러 볼 수 있는 질문 (FAQ 카테고리마다 하나씩) */
const EXAMPLES = [
  '배송비는 얼마예요?',
  '배송은 얼마나 걸려요?',
  '반품은 어떻게 해요?',
  '예치금 충전을 취소하고 싶어요',
  '주문을 취소하고 싶어요',
  '판매자로 입점하려면?',
]

type State =
  | { kind: 'idle' }
  | { kind: 'loading'; query: string }
  | { kind: 'done'; query: string; items: FaqSearchItem[] }
  | { kind: 'error'; query: string; message: string }

/**
 * 자주 묻는 질문 (로그인 필요)
 * 전체 FAQ 목록 API가 없어 질문을 검색하면 뜻이 가까운 FAQ를 보여 줘요. GET /api/v1/ai/faqs/search
 */
export default function FaqPage() {
  const [input, setInput] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })
  const seq = useRef(0)

  const search = async (q: string) => {
    const query = q.trim()
    if (!query) return
    setInput(query)
    const id = ++seq.current
    setState({ kind: 'loading', query })
    try {
      const items = await searchFaqs(query)
      if (id === seq.current) setState({ kind: 'done', query, items })
    } catch (e) {
      if (id === seq.current) setState({ kind: 'error', query, message: errorMessage(e) })
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    search(input)
  }

  return (
    <AppFrame>
      <PageHeader title="자주 묻는 질문" back />

      <form role="search" className={s.search} onSubmit={onSubmit}>
        <label className={s.searchBox}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={input}
            maxLength={FAQ_QUESTION_MAX}
            placeholder="궁금한 내용을 적어 주세요"
            aria-label="궁금한 내용"
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="submit" className={s.searchBtn} disabled={!input.trim() || state.kind === 'loading'}>
          검색
        </button>
      </form>

      {state.kind === 'idle' && (
        <section aria-labelledby="faq-examples" className={s.sec}>
          <h2 id="faq-examples" className={s.secTitle}>
            많이 찾는 질문
          </h2>
          <div className={s.examples}>
            {EXAMPLES.map((q) => (
              <button key={q} type="button" className={s.example} onClick={() => search(q)}>
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {state.kind === 'loading' && <Loading label="비슷한 질문을 찾고 있어요" />}
      {state.kind === 'error' && <ErrorView message={state.message} onRetry={() => search(state.query)} />}
      {state.kind === 'done' && state.items.length === 0 && (
        <Empty title="관련된 질문을 찾지 못했어요">다른 말로 검색하거나 AI 도우미에게 물어봐 주세요.</Empty>
      )}
      {state.kind === 'done' && state.items.length > 0 && (
        <section aria-label={`‘${state.query}’ 검색 결과`} className={s.sec}>
          <ul className={s.list}>
            {state.items.map((f, i) => (
              <li key={f.faqId}>
                <details className={s.item} open={i === 0}>
                  <summary>
                    <span aria-hidden="true" className={s.q}>
                      Q
                    </span>
                    <span className={s.question}>
                      <span className={s.cat}>{f.categoryLabel}</span>
                      {f.question}
                    </span>
                    <Icon name="chevronDown" size={16} className={s.chev} />
                  </summary>
                  <p className={s.answer}>{f.answer}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={s.more}>
        <p>
          <b>원하는 답이 없나요?</b>
          AI 도우미가 내 주문·배송 상태까지 확인해 답해 드려요.
        </p>
        <Button to="/chatbot" size="sm">
          물어보기
        </Button>
      </div>
    </AppFrame>
  )
}
