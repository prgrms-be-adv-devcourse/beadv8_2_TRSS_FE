import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { errorMessage } from '../../lib/api'
import { getMySurvey, saveMySurvey, type BeautyProfile } from '../../lib/api/ai'
import { EMPTY_ANSWERS, NONE, SURVEY_QUESTIONS, answersOf, requestOf, type SurveyAnswers } from './surveyQuestions'
import styles from './Survey.module.css'

/**
 * 뷰티 설문 (5문항) — PUT /api/v1/ai/survey/me
 * 결과 화면에서 "수정"으로 오면 state.profile로 기존 답을 채우고,
 * 바로 들어오면 저장된 설문(GET /api/v1/ai/survey/me)이 있을 때 그 답으로 채워요.
 */
export default function SurveyPage() {
  const navigate = useNavigate()
  const initial = (useLocation().state as { profile?: BeautyProfile } | null)?.profile
  const [step, setStep] = useState(0)
  const [a, setA] = useState<SurveyAnswers>(() => (initial ? answersOf(initial) : EMPTY_ANSWERS))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const touched = useRef(!!initial)

  // 저장된 설문이 있으면 그 답으로 채워요 (이미 고르기 시작했으면 덮어쓰지 않아요)
  useEffect(() => {
    if (initial) return
    getMySurvey()
      .then((p) => {
        if (p && !touched.current) setA(answersOf(p))
      })
      .catch(() => {}) // 못 불러와도 빈 설문으로 시작해요
  }, [initial])

  const q = SURVEY_QUESTIONS[step]
  const sel = a[q.key]
  const last = step === SURVEY_QUESTIONS.length - 1

  const toggle = (v: string) => {
    let next: string[]
    if (q.max === 1) next = [v]
    else if (sel.includes(v)) next = sel.filter((x) => x !== v)
    else if (v === NONE) next = [NONE]
    else {
      next = [...sel.filter((x) => x !== NONE), v]
      if (q.max && next.length > q.max) return
    }
    touched.current = true
    setError('')
    setA({ ...a, [q.key]: next })
  }

  const finish = async () => {
    if (saving) return
    // 피부 타입은 꼭 있어야 저장돼요 (첫 문항에서 막지만 한 번 더 확인)
    if (a.type.length === 0) {
      setStep(0)
      return
    }
    setSaving(true)
    setError('')
    try {
      const profile = await saveMySurvey(requestOf(a))
      navigate('/survey/result', { replace: true, state: { profile, saved: true } })
    } catch (e) {
      setError(errorMessage(e, '설문을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.'))
      setSaving(false)
    }
  }

  const blocked = !!q.required && sel.length === 0
  const countText = sel.length
    ? `${sel.length}개 선택${q.max > 1 ? ` · 최대 ${q.max}개` : ''}`
    : q.required
      ? '하나를 골라 주세요'
      : '선택하지 않아도 넘어갈 수 있어요'

  return (
    <AppFrame
      bottom={
        <BottomBar note={countText}>
          {last ? (
            <Button disabled={saving || blocked} onClick={finish}>
              {saving ? '저장하는 중이에요' : '결과 보기'}
            </Button>
          ) : (
            <Button disabled={blocked} onClick={() => setStep(step + 1)}>
              다음
            </Button>
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
              key={o.value}
              type="button"
              aria-pressed={sel.includes(o.value)}
              className={sel.includes(o.value) ? styles.optOn : styles.opt}
              onClick={() => toggle(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
        {q.key === 'avoid' && (
          <p className={styles.avoidHint}>선택한 성분이 들어간 상품은 추천 목록에서 아예 빼고 보여드려요.</p>
        )}
        {error && (
          <p role="alert" className={styles.avoidHint}>
            {error}
          </p>
        )}
      </section>
    </AppFrame>
  )
}
