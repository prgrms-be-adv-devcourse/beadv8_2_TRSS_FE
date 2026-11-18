/**
 * 홈 추천 탭의 "최근 본 상품과 비슷한" 섹션 (GET /api/v1/products/recommendations/recent)
 * - 위: 최근 본 상품 썸네일 (최대 RECENT_SHOWN개). 하나를 고르면 그 상품이 기준이 돼요. 처음엔 가장 최근 본 상품이에요.
 * - 아래: 기준 상품과 비슷한 상품 SIMILAR_SHOWN개. 최근 본 다른 상품은 다시 보여 주지 않아요.
 * 최근 본 상품은 이 브라우저에만 저장돼 있어서(lib/recentViewed) 비로그인도 볼 수 있어요.
 * 최근 본 상품이 없거나, 비슷한 상품이 없거나, 요청이 실패하면 섹션을 숨겨요.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Thumb } from '../../components/ui/Misc'
import { getRecentRecommendations } from '../../lib/api/product'
import { useRecentViewed } from '../../lib/recentViewed'
import { useApi } from '../../lib/useApi'
import { MiniCard, imageOf } from './common'
import styles from './Home.module.css'

const RECENT_SHOWN = 6
const SIMILAR_SHOWN = 6
/** 최근 본 다른 상품을 빼고도 채울 수 있게 넉넉히 받아요 */
const FETCH_SIZE = SIMILAR_SHOWN + RECENT_SHOWN

export default function HomeRecent() {
  const recent = useRecentViewed().slice(0, RECENT_SHOWN)
  const [basisId, setBasisId] = useState<number | null>(null)
  const basis = recent.find((r) => r.productId === basisId) ?? recent[0]

  const similar = useApi(
    () => (basis ? getRecentRecommendations([basis.productId], FETCH_SIZE).catch(() => []) : Promise.resolve([])),
    [basis?.productId],
  )
  if (!basis) return null

  const seen = new Set(recent.map((r) => r.productId))
  const cards = (similar.data ?? []).filter((p) => !seen.has(p.productId)).slice(0, SIMILAR_SHOWN)
  // 처음 불러오는 중에는 자리를 비워 두고, 불러온 뒤 비슷한 상품이 없으면 섹션을 숨겨요.
  if (similar.data && cards.length === 0) return null

  return (
    <section aria-labelledby="recent-title" className={`${styles.sec} ${styles.divided}`}>
      <div className={styles.secPad}>
        <h2 id="recent-title" className={styles.h2}>
          최근 본 상품과 비슷한
        </h2>
        <div className={styles.recent} role="group" aria-label="기준으로 할 최근 본 상품">
          <span>최근 본</span>
          {recent.map((r) => {
            const on = r.productId === basis.productId
            return (
              <button
                key={r.productId}
                type="button"
                aria-pressed={on}
                aria-label={`${r.name} 기준으로 보기`}
                className={`${styles.recentThumb} ${on ? styles.recentOn : ''}`}
                onClick={() => setBasisId(r.productId)}
              >
                <Thumb src={imageOf(r)} width={36} height={36} radius={8} />
              </button>
            )
          })}
        </div>
        <p className={styles.tabDesc}>
          <Link to={`/product/${basis.productId}`} className={styles.recentName}>
            {basis.name}
          </Link>{' '}
          기준이에요
        </p>
      </div>
      <div className={styles.row}>
        {cards.map((p) => (
          <MiniCard key={p.productId} p={p} />
        ))}
      </div>
    </section>
  )
}
