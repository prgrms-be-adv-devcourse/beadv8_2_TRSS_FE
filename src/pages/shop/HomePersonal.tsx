/**
 * 홈 추천 탭의 상품 개인화 추천 (GET /api/v1/products/recommendations/me)
 * - "회원님을 위한 추천": 구매·별점·찜·장바구니를 바탕으로 고른 상품. 카드마다 "찜한 ○○와 비슷해요" 같은 이유를 붙여요.
 * - 기준 상품 섹션: "○○을 찜하셨네요"처럼 대표 기준 상품마다 비슷한 상품 한 줄. 기준 상품 대표 이미지가 있으면 제목 옆에 보여 줘요
 * 비로그인이거나 이력이 없으면(personalized=false) 둘 다 숨겨요. 맨 위 AI 피부 맞춤 추천과 랭킹 탭이 그 자리를 채워요.
 * 추천은 보조 정보라 요청이 실패해도 홈은 그대로 두고 이 섹션들만 숨겨요.
 */
import { Link } from 'react-router-dom'
import { Thumb } from '../../components/ui/Misc'
import { useAuth } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import {
  getMemberRecommendations,
  type MemberRecommendations,
  type RecommendBasis,
  type RecommendationReason,
} from '../../lib/api/product'
import { MiniCard, SectionHead } from './common'
import styles from './Home.module.css'

/** 회원님을 위한 추천 개수 */
const FOR_YOU_SIZE = 10

/** 마지막 글자에 받침이 있는지. 한글은 글자로, 숫자는 읽는 소리로 봐요. 그 밖(영문·기호)은 받침 없음으로 봐요. */
function hasFinalConsonant(word: string) {
  const last = word.trim().slice(-1)
  const code = last.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0
  // 영(0) 일(1) 삼(3) 육(6) 칠(7) 팔(8)은 받침이 있어요
  if (/[0-9]/.test(last)) return '013678'.includes(last)
  return false
}
/** 와/과 */
const withWa = (word: string) => `${word}${hasFinalConsonant(word) ? '과' : '와'}`
/** 을/를 (조사만) */
const eulOf = (word: string) => (hasFinalConsonant(word) ? '을' : '를')

/** 추천 이유 앞말: "찜한 ○○와 비슷해요" */
const REASON_VERB: Record<RecommendBasis, string> = {
  HIGH_RATING: '높게 평가한',
  PURCHASE: '구매한',
  WISH: '찜한',
  CART: '장바구니에 담은',
  RECENT_VIEW: '최근 본',
}
/** 기준 상품 섹션 제목 뒷말: "○○을 찜하셨네요" */
const SECTION_VERB: Record<RecommendBasis, string> = {
  HIGH_RATING: '높게 평가하셨네요',
  PURCHASE: '구매하셨네요',
  WISH: '찜하셨네요',
  CART: '장바구니에 담으셨네요',
  RECENT_VIEW: '최근에 보셨네요',
}

const reasonText = (r: RecommendationReason) => `${REASON_VERB[r.basis]} ${withWa(r.productName)} 비슷해요`

export default function HomePersonal() {
  const { loggedIn } = useAuth()
  const res = useApi(
    (): Promise<MemberRecommendations | null> =>
      loggedIn ? getMemberRecommendations(FOR_YOU_SIZE).catch(() => null) : Promise.resolve(null),
    [loggedIn],
  )
  const data = res.data
  if (!data?.personalized) return null

  return (
    <>
      {data.forYou.length > 0 && (
        <section aria-label="회원님을 위한 추천" className={`${styles.sec} ${styles.divided}`}>
          <SectionHead title="회원님을 위한 추천" desc="구매·별점·찜·장바구니를 바탕으로 골랐어요" />
          <div className={styles.row}>
            {data.forYou.map(({ product, reason }) => (
              <MiniCard key={product.productId} p={product} why={reason ? reasonText(reason) : undefined} />
            ))}
          </div>
        </section>
      )}

      {data.sections
        .filter((s) => s.items.length > 0)
        .map((s, i) => {
          const titleId = `seed-${s.seedProductId}`
          return (
            <section
              key={s.seedProductId}
              aria-labelledby={titleId}
              className={`${styles.sec} ${i === 0 && data.forYou.length === 0 ? styles.divided : ''}`}
            >
              <div className={`${styles.secPad} ${styles.seedHead}`}>
                {s.seedThumbnailUrl && (
                  <Link to={`/product/${s.seedProductId}`} aria-label={s.seedProductName} className={styles.seedThumb}>
                    <Thumb src={s.seedThumbnailUrl} width={40} height={40} radius={10} />
                  </Link>
                )}
                <h2 id={titleId} className={styles.seedTitle}>
                  <Link to={`/product/${s.seedProductId}`} className={styles.seedName}>
                    {s.seedProductName}
                  </Link>
                  {eulOf(s.seedProductName)} {SECTION_VERB[s.basis]}
                </h2>
              </div>
              <div className={styles.row}>
                {s.items.map((p) => (
                  <MiniCard key={p.productId} p={p} />
                ))}
              </div>
            </section>
          )
        })}
    </>
  )
}
