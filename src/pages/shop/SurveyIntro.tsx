import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon, { type IconName } from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { SURVEY_QUESTIONS } from './mock'
import styles from './Survey.module.css'

const POINTS: Array<{ icon: IconName; title: string; desc: string }> = [
  { icon: 'sparkle', title: '내 피부에 맞는 상품', desc: '선호 성분이 들어간 상품을 먼저 보여드려요' },
  { icon: 'user', title: '나와 피부가 비슷한 크리에이터', desc: '같은 고민을 가진 크리에이터의 pick을 모아 봐요' },
  { icon: 'close', title: '피하고 싶은 성분은 빼고', desc: '선택한 성분이 든 상품은 추천에서 제외해요' },
]

/** 뷰티 설문 소개 */
export default function SurveyIntroPage() {
  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button variant="ghost" to="/">
            나중에 할게요
          </Button>
          <Button to="/survey/questions">설문 시작하기 · {SURVEY_QUESTIONS.length}문항</Button>
        </BottomBar>
      }
    >
      <PageHeader back="/" title="" />
      <div className={styles.intro}>
        <h1 className={styles.introTitle}>
          30초면 내 피부에 맞는
          <br />
          추천을 받을 수 있어요
        </h1>
        <p className={styles.introLead}>피부 타입과 성분 취향을 알려주시면 AI가 상품과 크리에이터를 골라 드려요.</p>
      </div>
      <ul className={styles.points}>
        {POINTS.map((p) => (
          <li key={p.title}>
            <span className={styles.pointIcon}>
              <Icon name={p.icon} size={20} />
            </span>
            <span>
              <b>{p.title}</b>
              <span>{p.desc}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>답변은 마이 › 내 뷰티 프로필에서 언제든 바꿀 수 있어요.</p>
    </AppFrame>
  )
}
