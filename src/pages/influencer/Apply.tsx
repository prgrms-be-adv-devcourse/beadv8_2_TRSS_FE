import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { ErrorView, Loading } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { applyInfluencer } from '../../lib/api/influencer'
import { codeOf } from '../../lib/notices/common'
import { useInfluencerStatus } from './influencerStatus'
import s from './influencer.module.css'

const FORM_ID = 'influencer-apply'
// 백엔드 검증과 같은 규칙: http:// 또는 https://로 시작하고 공백 없는 주소
const URL_RULE = /^https?:\/\/\S+\.\S+$/

/**
 * ⑨-2 인플루언서 신청
 * POST /api/v1/influencers (반려된 뒤 다시 신청할 때도 같은 API)
 */
export default function InfluencerApplyPage() {
  const navigate = useNavigate()
  const { app, error: loadError, reload } = useInfluencerStatus()
  const [activityName, setActivityName] = useState('')
  const [snsUrl, setSnsUrl] = useState('')
  const [intro, setIntro] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  if (app === undefined)
    return (
      <AppFrame>
        <PageHeader title="인플루언서 신청" back="/mypage/profile" />
        {loadError ? <ErrorView message={loadError} onRetry={reload} /> : <Loading />}
      </AppFrame>
    )
  // 반려된 경우만 다시 신청할 수 있다. 심사 중·승인이면 상태 화면으로
  if (app && app.status !== 'REJECTED') return <Navigate to="/influencer/status" replace />

  const urlOk = URL_RULE.test(snsUrl.trim())
  const valid = activityName.trim().length > 0 && urlOk && intro.trim().length > 0 && !pending

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    setError('')
    try {
      await applyInfluencer({ activityName: activityName.trim(), snsUrl: snsUrl.trim(), introduction: intro.trim() })
      navigate('/influencer/status', { replace: true })
    } catch (err) {
      // 다른 창에서 먼저 신청한 경우 등: 진행 중인 신청이 있으면 상태 화면에서 확인하도록 안내한다
      setError(
        codeOf(err) === 'INFLUENCER_ALREADY_APPLIED'
          ? '이미 진행 중인 신청이 있어요. 내 정보에서 신청 상태를 확인해 주세요.'
          : errorMessage(err),
      )
      setPending(false)
    }
  }

  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button type="submit" form={FORM_ID} size="lg" disabled={!valid}>
            {pending ? '신청하는 중…' : '신청하기'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="인플루언서 신청" back="/mypage/profile" />
      <div className={s.guide}>
        <p>신청한 뒤에는</p>
        <ol>
          <li>관리자가 입력한 SNS 계정을 직접 확인해요.</li>
          <li>승인되면 인플루언서로 활동할 수 있어요. 반려되면 사유를 확인하고 다시 신청할 수 있어요.</li>
          <li>판매자로 활동 중이어도 함께 신청할 수 있어요.</li>
        </ol>
      </div>
      <form id={FORM_ID} className={s.form} onSubmit={onSubmit}>
        <div className={f.field}>
          <label htmlFor="inf-name" className={f.label}>
            활동명 <span className={f.req}>*</span>
          </label>
          <input
            id="inf-name"
            className={f.input}
            maxLength={30}
            placeholder="SNS에서 쓰는 이름"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
          />
        </div>
        <div className={f.field}>
          <label htmlFor="inf-sns" className={f.label}>
            SNS 계정 주소 <span className={f.req}>*</span>
          </label>
          <input
            id="inf-sns"
            className={f.input}
            type="url"
            inputMode="url"
            maxLength={500}
            placeholder="https://instagram.com/계정이름"
            aria-describedby="inf-sns-h"
            aria-invalid={snsUrl.length > 0 && !urlOk}
            value={snsUrl}
            onChange={(e) => setSnsUrl(e.target.value)}
          />
          <p id="inf-sns-h" className={snsUrl && !urlOk ? f.error : f.help}>
            {snsUrl && !urlOk ? 'http:// 또는 https://로 시작하는 주소를 넣어 주세요.' : '본인 계정인지 관리자가 이 주소로 확인해요.'}
          </p>
        </div>
        <div className={f.field}>
          <label htmlFor="inf-intro" className={f.label}>
            소개 <span className={f.req}>*</span>
          </label>
          <textarea
            id="inf-intro"
            className={f.textarea}
            rows={5}
            maxLength={500}
            placeholder="주로 올리는 콘텐츠와 관심 분야를 알려 주세요"
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className={f.error}>
            {error}
          </p>
        )}
      </form>
    </AppFrame>
  )
}
