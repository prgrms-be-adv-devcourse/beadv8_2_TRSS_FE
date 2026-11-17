import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import {
  changeFaqVisibility,
  createFaq,
  FAQ_ANSWER_MAX,
  FAQ_CATEGORIES,
  FAQ_CATEGORY_LABEL,
  FAQ_QUESTION_MAX,
  getAdminFaqs,
  modifyFaq,
  type AdminFaq,
  type FaqCategory,
} from '../../lib/api/faq'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { mmdd } from './format'
import { Drawer, Notice } from './parts'
import s from './AdminFinance.module.css'
import q from './AdminFaqs.module.css'

const COLS = '.8fr 3fr .6fr .7fr .6fr'
type Filter = 'ALL' | FaqCategory
type Editing = { faq: AdminFaq | null } | null

/** 반영 중인 FAQ가 있으면 목록을 다시 불러오는 간격과 최대 횟수 (OpenAI 장애 중 무한 재조회 방지) */
const POLL_MS = 5000
const POLL_MAX = 12

/** 관리자 · 챗봇 FAQ (A12, 챗봇 답변 근거 FAQ 관리) */
export default function AdminFaqs() {
  const desktop = useIsDesktop()
  const { data, loading, error, reload } = useApi(() => getAdminFaqs(), [])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [keyword, setKeyword] = useState('')
  const [editing, setEditing] = useState<Editing>(null)
  const [notice, setNotice] = useState('')
  const polls = useRef(0)

  const faqs = useMemo(() => data ?? [], [data])
  const pending = faqs.some((x) => !x.embedded)

  // 검색 반영 전(embedded=false) FAQ가 있으면 잠시 뒤 다시 불러와 배지를 갱신
  useEffect(() => {
    if (!pending) {
      polls.current = 0
      return
    }
    if (polls.current >= POLL_MAX) return
    const t = setTimeout(() => {
      polls.current++
      reload()
    }, POLL_MS)
    return () => clearTimeout(t)
  }, [pending, data, reload])

  const counts = useMemo(() => {
    const m: Partial<Record<FaqCategory, number>> = {}
    faqs.forEach((x) => (m[x.category] = (m[x.category] ?? 0) + 1))
    return m
  }, [faqs])

  const rows = useMemo(() => {
    const k = keyword.trim()
    return faqs.filter((x) => (filter === 'ALL' || x.category === filter) && (!k || x.question.includes(k)))
  }, [faqs, filter, keyword])

  const onSaved = (msg: string) => {
    setEditing(null)
    setNotice(msg)
    polls.current = 0
    reload()
  }

  const filters = (
    <div role="group" aria-label="카테고리" className={q.chips}>
      {(['ALL', ...FAQ_CATEGORIES] as Filter[]).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={filter === v}
          className={`${q.chip} ${filter === v ? q.chipOn : ''}`}
          onClick={() => setFilter(v)}
        >
          {v === 'ALL' ? '전체' : FAQ_CATEGORY_LABEL[v]} {v === 'ALL' ? faqs.length : (counts[v] ?? 0)}
        </button>
      ))}
    </div>
  )

  const addBtn = (
    <Button size="sm" onClick={() => setEditing({ faq: null })}>
      + FAQ 등록
    </Button>
  )

  const listState =
    loading && !data ? (
      <Loading />
    ) : error && !data ? (
      <ErrorView message={error} onRetry={reload} />
    ) : rows.length === 0 ? (
      <Empty title={faqs.length === 0 ? '등록된 FAQ가 없어요.' : '조건에 맞는 FAQ가 없어요.'} />
    ) : null

  return (
    <ConsoleShell
      variant="admin"
      active="faqs"
      title="챗봇 FAQ"
      description="챗봇은 노출 중인 FAQ만 근거로 답해요. 내리려면 노출을 꺼 주세요."
      actions={addBtn}
    >
      <div className={s.page}>
        <Notice>{notice}</Notice>
        {desktop ? (
          <>
            <div className={c.toolbar}>
              {filters}
              <label className={c.search}>
                <Icon name="search" size={16} />
                <input
                  aria-label="질문 검색"
                  placeholder="질문 검색"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </label>
            </div>
            <div className={c.table} role="table" aria-label="FAQ 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>카테고리</span>
                <span>질문</span>
                <span>노출</span>
                <span>검색 반영</span>
                <span>수정일</span>
              </div>
              {listState}
              {!listState &&
                rows.map((x) => (
                  <div
                    key={x.faqId}
                    role="row"
                    className={`${c.tr} ${c.clickable} ${editing?.faq?.faqId === x.faqId ? c.selected : ''}`}
                    style={{ gridTemplateColumns: COLS }}
                    onClick={() => setEditing({ faq: x })}
                  >
                    <span>{x.categoryLabel}</span>
                    <button
                      type="button"
                      className={`${q.rowBtn} ${c.ellipsis} ${x.visible ? c.strong : q.faded}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditing({ faq: x })
                      }}
                    >
                      {x.question}
                    </button>
                    <span>{x.visible ? <Badge tone="blue">노출</Badge> : <Badge>숨김</Badge>}</span>
                    <span>
                      <EmbedBadge embedded={x.embedded} />
                    </span>
                    <span className={c.num}>{mmdd(x.updatedAt)}</span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <>
            <div className={q.mobileTools}>
              <div className={q.mobileTop}>{addBtn}</div>
              {filters}
              <label className={c.mobileSearch}>
                <Icon name="search" size={18} />
                <input
                  aria-label="질문 검색"
                  placeholder="질문 검색"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </label>
            </div>
            {listState && <div className={s.listStateBox}>{listState}</div>}
            {!listState && (
              <ul className={s.cards}>
                {rows.map((x) => (
                  <li key={x.faqId} className={s.cardItem}>
                    <button type="button" className={s.cardOpen} onClick={() => setEditing({ faq: x })}>
                      <span className={s.badges}>
                        <Badge>{x.categoryLabel}</Badge>
                        {!x.visible && <Badge>숨김</Badge>}
                        {!x.embedded && <EmbedBadge embedded={false} />}
                      </span>
                      <b className={x.visible ? undefined : q.faded}>{x.question}</b>
                      <span className={s.meta}>{mmdd(x.updatedAt)} 수정</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {editing && <FaqDrawer faq={editing.faq} onClose={() => setEditing(null)} onSaved={onSaved} />}
    </ConsoleShell>
  )
}

function EmbedBadge({ embedded }: { embedded: boolean }) {
  return embedded ? <Badge tone="green">반영됨</Badge> : <Badge tone="amber">반영 중</Badge>
}

/** FAQ 등록·수정 패널. faq가 null이면 등록 */
function FaqDrawer({
  faq,
  onClose,
  onSaved,
}: {
  faq: AdminFaq | null
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [category, setCategory] = useState<FaqCategory>(faq?.category ?? 'MEMBER')
  const [question, setQuestion] = useState(faq?.question ?? '')
  const [answer, setAnswer] = useState(faq?.answer ?? '')
  const [visible, setVisible] = useState(faq?.visible ?? true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const contentChanged =
    !faq || category !== faq.category || question.trim() !== faq.question || answer.trim() !== faq.answer
  const visibleChanged = !!faq && visible !== faq.visible
  const valid = question.trim() !== '' && answer.trim() !== ''
  const canSave = valid && (contentChanged || visibleChanged) && !saving

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError('')
    const body = { category, question: question.trim(), answer: answer.trim() }
    try {
      if (!faq) {
        await createFaq({ ...body, visible })
        onSaved('FAQ를 등록했어요. 수 초 안에 챗봇 검색에 반영돼요.')
        return
      }
      if (contentChanged) await modifyFaq(faq.faqId, body)
      if (visibleChanged) await changeFaqVisibility(faq.faqId, visible)
      const visibleMsg = visible ? 'FAQ를 다시 노출했어요.' : 'FAQ를 숨겼어요. 챗봇 검색에서 빠져요.'
      onSaved(
        !contentChanged
          ? visibleMsg
          : visibleChanged
            ? visible
              ? 'FAQ를 수정하고 다시 노출했어요. 다시 반영될 때까지 잠시 걸려요.'
              : 'FAQ를 수정하고 숨겼어요. 챗봇 검색에서 빠져요.'
            : 'FAQ를 수정했어요. 다시 반영될 때까지 잠시 걸려요.',
      )
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Drawer
      title={faq ? 'FAQ 수정' : 'FAQ 등록'}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => submit()} disabled={!canSave}>
            {saving ? '저장 중…' : faq ? '저장' : '등록'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Notice tone="error">{error}</Notice>
        {faq && (
          <p className={q.status}>
            <EmbedBadge embedded={faq.embedded} />
            <span>
              {mmdd(faq.createdAt)} 등록 · {mmdd(faq.updatedAt)} 수정
            </span>
          </p>
        )}
        <div className={f.field}>
          <span className={f.label}>카테고리</span>
          <div role="radiogroup" aria-label="카테고리" className={q.chips}>
            {FAQ_CATEGORIES.map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={category === v}
                className={`${q.chip} ${category === v ? q.chipOn : ''}`}
                onClick={() => setCategory(v)}
              >
                {FAQ_CATEGORY_LABEL[v]}
              </button>
            ))}
          </div>
        </div>
        <label className={f.field}>
          <span className={q.labelRow}>
            <span className={f.label}>
              질문<span className={f.req}>*</span>
            </span>
            <span className={q.counter}>
              {question.length} / {FAQ_QUESTION_MAX}
            </span>
          </span>
          <input
            className={f.input}
            value={question}
            maxLength={FAQ_QUESTION_MAX}
            placeholder="반품은 언제까지 신청할 수 있나요?"
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label className={f.field}>
          <span className={q.labelRow}>
            <span className={f.label}>
              답변<span className={f.req}>*</span>
            </span>
            <span className={q.counter}>
              {answer.length} / {FAQ_ANSWER_MAX}
            </span>
          </span>
          <textarea
            className={`${f.textarea} ${q.answer}`}
            value={answer}
            maxLength={FAQ_ANSWER_MAX}
            placeholder="챗봇이 이 답변만 근거로 답해요. 정책 값(기간·금액)을 정확히 적어 주세요."
            onChange={(e) => setAnswer(e.target.value)}
          />
          {faq && contentChanged && <span className={f.help}>질문·답변을 바꾸면 다시 반영될 때까지 수 초 걸려요.</span>}
        </label>
        <div className={q.switchRow}>
          <span>
            <b>챗봇에 노출</b>
            <span className={f.help}>끄면 챗봇 검색에서 빠져요. 다시 켜면 바로 검색돼요.</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={visible}
            aria-label="챗봇에 노출"
            className={`${q.switch} ${visible ? q.switchOn : ''}`}
            onClick={() => setVisible((v) => !v)}
          />
        </div>
      </form>
    </Drawer>
  )
}
