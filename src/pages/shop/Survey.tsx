import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { SURVEY_QUESTIONS, type BeautyProfile, type SurveyKey } from './mock'
import styles from './Survey.module.css'

type Answers = Record<SurveyKey, string[]>
const EMPTY: Answers = { type: [], concern: [], like: [], avoid: [], cat: [] }

/**
 * 뷰티 설문 (5문항)
 * 결과 화면에서 "수정"으로 오면 state.profile로 기존 답을 채워요.
 */
export default function SurveyPage() {
  const navigate = useNavigate()
  const initial = (useLocation().state as { profile?: BeautyProfile } | null)?.profile
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Answers>(() =>
    initial
      ? { type: initial.type, concern: initial.concern, like: initial.like, avoid: initial.avoid, cat: initial.cat }
      : EMPTY,
  )
  const [saving, setSaving] = useState(false)

  const q = SURVEY_QUESTIONS[step]
  const sel = a[q.key]
  const last = step === SURVEY_QUESTIONS.length - 1

  const toggle = (v: string) => {
    let next: string[]
    if (q.max === 1) next = [v]
    else if (sel.includes(v)) next = sel.filter((x) => x !== v)
    else if (v === '없어요') next = ['없어요']
    else {
      next = [...sel.filter((x) => x !== '없어요'), v]
      if (q.max && next.length > q.max) return
    }
    setA({ ...a, [q.key]: next })
  }

  const finish = () => {
    setSaving(true)
    // TODO(API 미구현): POST /ai/survey — 설문 답변 저장. 지금은 저장하지 않고 결과 화면으로 답만 넘겨요
    const d = new Date()
    const profile: BeautyProfile = {
      ...a,
      avoid: a.avoid.filter((x) => x !== '없어요'),
      updatedAt: `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`,
    }
    navigate('/survey/result', { replace: true, state: { profile, saved: true } })
  }

  const countText = sel.length
    ? `${sel.length}개 선택${q.max > 1 ? ` · 최대 ${q.max}개` : ''}`
    : '선택하지 않아도 넘어갈 수 있어요'

  return (
    <AppFrame
      footer={false}
      bottom={
        <BottomBar note={countText}>
          {last ? (
            <Button disabled={saving} onClick={finish}>
              결과 보기
            </Button>
          ) : (
            <Button onClick={() => setStep(step + 1)}>다음</Button>
          )}
        </BottomBar>
      }
    >
      <header className={styles.qHeader}>
        <button
          type="button"
          aria-label={step === 0 ? '뒤로' : '이전 질문'}
          className={styles.iconBtn}
          onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
        >
          <Icon name="back" />
        </button>
        <h1>뷰티 프로필</h1>
        <Link to="/" className={styles.skip}>
          건너뛰기
        </Link>
      </header>

      <div className={styles.progressRow}>
        <div
          role="progressbar"
          aria-label="설문 진행"
          aria-valuemin={1}
          aria-valuemax={SURVEY_QUESTIONS.length}
          aria-valuenow={step + 1}
          className={styles.progress}
        >
          <span style={{ width: `${((step + 1) / SURVEY_QUESTIONS.length) * 100}%` }} />
        </div>
        <p>
          {step + 1} / {SURVEY_QUESTIONS.length}
        </p>
      </div>

      <section className={styles.question}>
        <h2>{q.title}</h2>
        <p className={styles.help}>{q.help}</p>
        <div role="group" aria-label={q.label} className={styles.opts}>
          {q.opts.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={sel.includes(o)}
              className={sel.includes(o) ? styles.optOn : styles.opt}
              onClick={() => toggle(o)}
            >
              {o}
            </button>
          ))}
        </div>
        {q.key === 'avoid' && (
          <p className={styles.avoidHint}>선택한 성분이 들어간 상품은 추천 목록에서 아예 빼고 보여드려요.</p>
        )}
      </section>
    </AppFrame>
  )
}
