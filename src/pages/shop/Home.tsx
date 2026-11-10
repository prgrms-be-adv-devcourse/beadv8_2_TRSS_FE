import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Icon from '../../components/ui/Icon'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { ErrorView, Loading, Thumb } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { useAuth } from '../../lib/auth'
import { Avatar, ExampleNotice, MiniCard, SectionHead, imageOf, loadCategories, loadProducts } from './common'
import { MOCK_CREATORS, MOCK_NOTIFICATIONS, MOCK_PROFILE, MOCK_WHY } from './mock'
import styles from './Home.module.css'

/** ① 홈 */
export default function HomePage() {
  const { loggedIn } = useAuth()
  const categories = useApi(loadCategories, [])
  // TODO(API 미구현): AI 추천(회원 맞춤 · 찜 기반 · 최근 본 상품 기반) — ai-service 추천 API가 없어 최신 상품으로 자리를 채워요
  const products = useApi(() => loadProducts({ size: 12 }), [])
  const items = products.data?.items ?? []
  const recs = items.slice(0, 6)
  const wishRecs = items.slice(6, 12).length ? items.slice(6, 12) : items.slice(0, 6)
  const recent = items.slice(0, 3)
  const viewRecs = [...items].reverse().slice(0, 6)
  // TODO(API 미구현): GET /notifications — 안 읽은 알림이 있는지
  const hasUnread = MOCK_NOTIFICATIONS.some((n) => n.unread)
  const quick = (categories.data ?? []).flatMap((g) => g.children).slice(0, 8)

  return (
    <AppFrame tab="home">
      <PageHeader
        title={
          <Link to="/" aria-label="팔레트 홈" className={styles.logo}>
            <img src="/images/logo.png" alt="Palette" />
          </Link>
        }
        right={
          <>
            <HeaderIcon to="/search" icon="search" label="검색" />
            <HeaderIcon to="/wishlist" icon="heart" label="찜 목록" />
            <HeaderIcon to="/cart" icon="bag" label="장바구니" />
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
        <Link to="/category" aria-label="카테고리 전체 보기" className={styles.catBtn}>
          <Icon name="grid" size={20} />
        </Link>
        <Link to="/search" className={styles.search}>
          <Icon name="search" size={18} />
          브랜드나 상품을 검색해 보세요
        </Link>
      </div>

      <nav aria-label="빠른 카테고리" className={styles.quick}>
        <Link to="/" aria-current="page" className={`${styles.qchip} ${styles.qon}`}>
          추천
        </Link>
        {quick.map((c) => (
          <Link key={c.categoryId} to={`/products?categoryId=${c.categoryId}`} className={styles.qchip}>
            {c.name}
          </Link>
        ))}
      </nav>

      <Link to="/products" className={styles.hero}>
        <img src="/images/banner/beauty-creator.jpg" alt="" />
        <span className={styles.heroShade} />
        <span className={styles.heroEyebrow}>PALETTE PICK</span>
        <span className={styles.heroText}>
          <span className={styles.heroBig}>PICK</span>
          <span className={styles.heroTitle}>이번 주 크리에이터가 고른 스킨케어</span>
          <span className={styles.heroGo}>보러가기 →</span>
        </span>
      </Link>

      {products.data?.example && <ExampleNotice />}
      {products.loading && !products.data && <Loading />}
      {products.error && <ErrorView message={products.error} onRetry={products.reload} />}

      {recs.length > 0 && (
        <section aria-label="회원님을 위한 추천" className={styles.sec}>
          <SectionHead
            title="회원님을 위한 추천"
            ai
            desc={
              <>
                {MOCK_PROFILE.type[0]} · {MOCK_PROFILE.like[0]} 기준이에요 · <Link to="/survey/result">바꾸기</Link>
              </>
            }
            more={{ to: '/recommend' }}
          />
          <div className={styles.row}>
            {recs.map((p) => (
              <MiniCard key={p.productId} p={p} />
            ))}
          </div>
        </section>
      )}

      {loggedIn && wishRecs.length > 0 && (
        <section aria-label="찜한 상품과 비슷해요" className={styles.sec}>
          <div className={styles.secPad}>
            <h2 className={styles.h2}>찜한 상품과 비슷해요</h2>
            {/* TODO(API 미구현): 찜 기반 추천 — 기준 상품 바꾸기 */}
            <Link to="/wishlist" className={styles.basis}>
              <Thumb src={imageOf(wishRecs[0])} width={28} height={28} radius={99} />
              <span>
                <b>{wishRecs[0].name}</b> 찜 기준
              </span>
              <span className={styles.basisMore}>바꾸기 ›</span>
            </Link>
          </div>
          <div className={styles.row}>
            {wishRecs.map((p, i) => (
              <MiniCard key={p.productId} p={p} why={MOCK_WHY[i % MOCK_WHY.length]} />
            ))}
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section aria-label="최근 본 상품과 함께 많이 봤어요" className={`${styles.sec} ${styles.divided}`}>
          <div className={styles.secPad}>
            <h2 className={styles.h2}>최근 본 상품과 함께 많이 봤어요</h2>
            {/* TODO(API 미구현): 최근 본 상품 기록·함께 본 상품 추천 */}
            <div className={styles.recent}>
              <span>최근 본</span>
              {recent.map((p, i) => (
                <Link
                  key={p.productId}
                  to={`/product/${p.productId}`}
                  aria-label={p.name}
                  className={`${styles.recentThumb} ${i === 0 ? styles.recentOn : ''}`}
                >
                  <Thumb src={imageOf(p)} width={36} height={36} radius={8} />
                </Link>
              ))}
            </div>
          </div>
          <div className={styles.row}>
            {viewRecs.map((p) => (
              <MiniCard key={p.productId} p={p} />
            ))}
          </div>
        </section>
      )}

      <section aria-label="나와 피부가 비슷한 크리에이터" className={styles.sec}>
        {/* TODO(API 미구현): AI 크리에이터 추천 */}
        <SectionHead
          title="나와 피부가 비슷한 크리에이터"
          ai
          desc="같은 피부 고민을 가진 크리에이터의 pick이에요"
          more={{ to: '/recommend?tab=creator' }}
        />
        <div className={styles.creators}>
          {MOCK_CREATORS.map((c) => (
            <Link key={c.initial} to="/recommend?tab=creator" className={styles.creator}>
              <Avatar initial={c.initial} size={60} />
              <span className={styles.creatorName}>{c.name}</span>
              <span className={styles.creatorTag}>{c.short}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* TODO(API 미구현): 설문 여부 조회 — 설문 전 회원에게만 보여줘요. 지금은 항상 보여요 */}
      <Link to="/survey" className={styles.surveyCard}>
        <span aria-hidden="true" className={styles.surveyDeco} />
        <span aria-hidden="true" className={styles.surveyIcon}>
          <Icon name="sparkle" size={22} />
        </span>
        <span className={styles.surveyText}>
          <span className={styles.surveyEyebrow}>
            <span className={styles.surveyAi}>AI</span>뷰티 설문
          </span>
          <b className={styles.surveyTitle}>30초 설문하고 맞춤 추천 받기</b>
          <span className={styles.surveyDesc}>피부 타입과 성분 취향을 알려주세요</span>
        </span>
        <span className={styles.surveyFoot}>
          <span aria-hidden="true" className={styles.surveySteps}>
            {['피부 타입', '피부 고민', '성분 취향'].map((t) => (
              <span key={t} className={styles.surveyStep}>
                {t}
              </span>
            ))}
          </span>
          <span className={styles.surveyGo}>
            시작
            <Icon name="chevron" size={14} strokeWidth={2.2} />
          </span>
        </span>
      </Link>

      <div className={styles.fabWrap}>
        <Link to="/chatbot" aria-label="AI 도우미" className={styles.fab}>
          <Icon name="chat" />
        </Link>
      </div>
    </AppFrame>
  )
}
