import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import CartHeaderIcon from '../../components/ui/CartHeaderIcon'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../lib/auth'
import { ExampleNotice, MiniCard, SectionHead, loadRecommendations, usePopularKeywords } from './common'
import { useNotificationCount } from '../../lib/notificationCount'
import { basisText } from '../../lib/api/ai'
import CategoryDrawer from './CategoryDrawer'
import HomePersonal from './HomePersonal'
import HomeRecent from './HomeRecent'
import { HOME_TABS, HomeTabList, type HomeTab } from './HomeTabs'
import { SearchPanel } from './Search'
import styles from './Home.module.css'

/** 검색창 안내에 돌려 보여 줄 인기 검색어 수와 간격 */
const HINT_COUNT = 5
const HINT_INTERVAL_MS = 3000

/**
 * 홈 검색창 안내 문구. 인기 검색어를 몇 초마다 바꿔 보여 줘요.
 * 움직임 줄이기를 켠 사용자에게는 첫 검색어만 보여 줘요.
 */
function useSearchHint() {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const t = window.setInterval(() => setI((n) => (n + 1) % HINT_COUNT), HINT_INTERVAL_MS)
    return () => window.clearInterval(t)
  }, [])
  const words = usePopularKeywords().slice(0, HINT_COUNT)
  const word = words.length ? words[i % words.length].keyword : null
  return word ? `‘${word}’ 검색해 보세요` : '브랜드나 상품을 검색해 보세요'
}

/** ① 홈 */
export default function HomePage() {
  const { loggedIn } = useAuth()
  const [drawer, setDrawer] = useState(false)
  const closeDrawer = useCallback(() => setDrawer(false), [])
  const [searching, setSearching] = useState(false)
  const searchHint = useSearchHint()
  const closeSearch = useCallback(() => setSearching(false), [])
  // 내 피부 맞춤 추천(AI 설문): GET /api/v1/ai/recommendations (비회원·설문 전이면 뷰티 최신순)
  // 그 아래 상품 개인화 추천은 HomePersonal, 최근 본 상품 기반은 HomeRecent
  const rec = useApi(() => loadRecommendations(6), [loggedIn])
  const recs = rec.data?.items ?? []
  const hasUnread = !!useNotificationCount()
  // 헤더 탭은 URL(?tab=)에 두어 뒤로 가기·새로고침해도 유지돼요. 추천이 기본이에요.
  const [params] = useSearchParams()
  const tab: HomeTab = HOME_TABS.find((t) => t.key === params.get('tab'))?.key ?? 'recommend'

  return (
    <AppFrame
      tab="home"
      footer
      fab={
        <Link to="/chatbot" aria-label="AI 도우미" className={styles.fab}>
          <Icon name="chat" />
        </Link>
      }
    >
      <PageHeader
        title={
          <Link to="/" aria-label="팔레트 홈" className={styles.logo}>
            <img src="/images/logo.png" alt="Palette" />
          </Link>
        }
        right={
          <>
            <HeaderIcon icon="search" label="검색" onClick={() => setSearching(true)} />
            <CartHeaderIcon />
            <HeaderIcon
              to="/notifications"
              icon="bell"
              label={hasUnread ? '알림, 새 알림 있음' : '알림'}
              dot={hasUnread}
            />
          </>
        }
      />

      <div className={styles.searchRow}>
        <button
          type="button"
          aria-label="카테고리 열기"
          aria-haspopup="dialog"
          aria-expanded={drawer}
          className={styles.catBtn}
          onClick={() => setDrawer(true)}
        >
          <Icon name="grid" size={20} />
        </button>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label="브랜드나 상품 검색"
          className={styles.search}
          onClick={() => setSearching(true)}
        >
          <Icon name="search" size={18} />
          <span key={searchHint} aria-hidden="true" className={styles.searchHint}>
            {searchHint}
          </span>
        </button>
      </div>

      <nav aria-label="홈 메뉴" className={styles.quick}>
        {HOME_TABS.map((t) => (
          <Link
            key={t.key}
            to={t.key === 'recommend' ? '/' : `/?tab=${t.key}`}
            replace
            aria-current={tab === t.key ? 'page' : undefined}
            className={`${styles.qchip} ${tab === t.key ? styles.qon : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab !== 'recommend' && <HomeTabList tab={tab} />}

      {tab === 'recommend' && (
        <>
          <Link to="/?tab=all" className={styles.hero}>
            <img src="/images/banner/beauty-creator.jpg" alt="" />
            <span className={styles.heroShade} />
            <span className={styles.heroEyebrow}>PALETTE PICK</span>
            <span className={styles.heroText}>
              <span className={styles.heroBig}>PICK</span>
              <span className={styles.heroTitle}>이번 주 크리에이터가 고른 스킨케어</span>
              <span className={styles.heroGo}>보러가기 →</span>
            </span>
          </Link>

          {rec.data?.example && <ExampleNotice />}

          {recs.length > 0 && (
            <section aria-label="내 피부 맞춤 추천" className={styles.sec}>
              {rec.data?.personalized && rec.data.basis ? (
                <SectionHead
                  title="내 피부 맞춤 추천"
                  ai
                  desc={
                    <>
                      {basisText(rec.data.basis)} 기준이에요 · <Link to="/survey/result">바꾸기</Link>
                    </>
                  }
                  more={{ to: '/recommend' }}
                />
              ) : (
                <SectionHead
                  title="새로 들어온 뷰티"
                  desc={
                    <>
                      설문하면 내 피부 맞춤으로 바뀌어요 · <Link to="/survey">설문하기</Link>
                    </>
                  }
                  more={{ to: '/recommend' }}
                />
              )}
              <div className={styles.row}>
                {recs.map((p) => (
                  <MiniCard key={p.productId} p={p} why={p.reason ?? undefined} />
                ))}
              </div>
            </section>
          )}

          <HomePersonal />

          <HomeRecent />

          {/* 설문 전(맞춤 추천이 아닐 때)에만 보여줘요 */}
          {!rec.loading && !rec.data?.personalized && (
            <Link to="/survey" className={styles.surveyCard}>
              <span aria-hidden="true" className={styles.surveyIcon}>
                <Icon name="droplet" size={24} />
              </span>
              <span className={styles.surveyText}>
                <span className={styles.surveyEyebrow}>뷰티 설문 · 30초</span>
                <b className={styles.surveyTitle}>내 피부에 맞는 상품만 골라 볼까요?</b>
                <span className={styles.surveyDesc}>피부 타입 → 피부 고민 → 피하는 성분</span>
              </span>
              <span className={styles.surveyGo}>
                시작하기
                <Icon name="arrow" size={16} strokeWidth={2.2} />
              </span>
            </Link>
          )}
        </>
      )}

      {drawer && <CategoryDrawer onClose={closeDrawer} />}
      {searching && <SearchPanel onClose={closeSearch} />}
    </AppFrame>
  )
}
