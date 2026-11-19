/**
 * 기획전 화면 조각 (TRSS-343)
 * - ExhibitionBanner: 기획전 배너. 이미지가 없으면 상품 썸네일 콜라주 위에 제목·부제·기간을 얹어요.
 * - ExhibitionTabView: 홈 '기획전' 탭. 기획전 카드 목록이에요.
 * - ExhibitionCarousel: 홈 추천 탭 상단용 슬라이드 배너.
 *   TODO(TRSS-342 머지 후): Home.tsx 추천 탭 맨 위에 <ExhibitionCarousel />를 연결해요.
 *
 * 기획전 목록·검색 조건은 exhibitions.ts에 있어요.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, Loading } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { imageOf, loadProducts } from './common'
import { EXHIBITIONS, type Exhibition } from './exhibitions'
import styles from './Exhibition.module.css'

/** 콜라주에 겹치는 썸네일 수 */
const COLLAGE_SIZE = 4
/** 슬라이드 자동 넘김 간격 */
const AUTO_MS = 5000

export type ExhibitionPreview = {
  exhibition: Exhibition
  /** 콜라주용 썸네일 (최대 4장) */
  images: Array<string | null>
  total: number
}

/** 기획전마다 상품 첫 4개를 받아요. 상품이 0개이거나 요청이 실패한 기획전은 빼요. */
export async function loadExhibitionPreviews(): Promise<ExhibitionPreview[]> {
  const results = await Promise.allSettled(
    EXHIBITIONS.map((exhibition) => loadProducts({ ...exhibition.query, page: 0, size: COLLAGE_SIZE })),
  )
  return results.flatMap((r, i) =>
    r.status === 'fulfilled' && r.value.totalElements > 0
      ? [{ exhibition: EXHIBITIONS[i], images: r.value.items.map(imageOf), total: r.value.totalElements }]
      : [],
  )
}

// ── 배너 ─────────────────────────────────────────────────

export function ExhibitionBanner({
  exhibition,
  images,
  total,
  to,
  headingLevel = 3,
}: {
  exhibition: Exhibition
  images: Array<string | null>
  /** 상품 수. 있으면 배너 아래쪽에 "상품 N개"를 보여 줘요 */
  total?: number
  /** 있으면 배너 전체가 이 주소로 가는 링크예요 */
  to?: string
  headingLevel?: 1 | 2 | 3
}) {
  const { title, subtitle, period, bg, accent, bannerUrl } = exhibition
  const Heading = `h${headingLevel}` as const
  const vars = { '--ex-bg': bg, '--ex-accent': accent } as CSSProperties
  const shown = images.filter((src): src is string => !!src).slice(0, COLLAGE_SIZE)

  const body = (
    <>
      <span className={styles.text}>
        <span className={styles.eyebrow}>
          기획전<span aria-hidden="true"> · </span>
          <span className={styles.srOnly}>, 기간 </span>
          {period}
        </span>
        <Heading className={styles.title}>{title}</Heading>
        <span className={styles.sub}>{subtitle}</span>
        {total != null && (
          <span className={styles.count}>
            상품 {total.toLocaleString('ko-KR')}개{to && <Icon name="chevron" size={14} />}
          </span>
        )}
      </span>
      {bannerUrl ? (
        <img className={styles.bannerImg} src={bannerUrl} alt="" />
      ) : (
        shown.length > 0 && (
          <span className={styles.collage} aria-hidden="true" data-count={shown.length}>
            {shown.map((src, i) => (
              <span key={i} className={styles.piece} style={{ '--i': i } as CSSProperties}>
                <img src={src} alt="" />
              </span>
            ))}
          </span>
        )
      )}
    </>
  )

  return to ? (
    <Link to={to} className={`${styles.banner} ${styles.bannerLink}`} style={vars}>
      {body}
    </Link>
  ) : (
    <div className={styles.banner} style={vars}>
      {body}
    </div>
  )
}

// ── 홈 기획전 탭 ──────────────────────────────────────────

export function ExhibitionTabView() {
  const res = useApi(loadExhibitionPreviews, [])
  const list = res.data ?? []
  return (
    <section aria-labelledby="exhibition-tab-title" className={styles.tab}>
      <div className={styles.tabHead}>
        <h2 id="exhibition-tab-title" className={styles.tabTitle}>
          진행 중인 기획전
        </h2>
        {res.data && <span className={styles.tabCount}>{list.length}개</span>}
      </div>
      {res.loading && <Loading />}
      {!res.loading && list.length === 0 && (
        <Empty
          title="진행 중인 기획전이 없어요"
          action={
            <Button variant="outline" size="sm" to="/?tab=sale">
              특가 상품 보기
            </Button>
          }
        >
          새 기획전을 준비하고 있어요. 곧 만나요.
        </Empty>
      )}
      {list.length > 0 && (
        <ul className={styles.list}>
          {list.map((p) => (
            <li key={p.exhibition.id}>
              <ExhibitionBanner {...p} to={`/exhibitions/${p.exhibition.id}`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── 홈 추천 탭 상단 슬라이드 ───────────────────────────────

const prefersReducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * 기획전 슬라이드 배너. 손가락으로 넘기거나 이전·다음·점 버튼으로 옮겨요.
 * 5초마다 자동으로 넘기되, 움직임 줄이기를 켠 사용자에게는 자동 넘김이 없어요.
 * 자동 넘김은 멈춤 버튼으로 끌 수 있고, 마우스를 올리거나 키보드로 안에 들어오면 잠시 멈춰요.
 * 보여 줄 기획전이 없으면 아무것도 그리지 않아요.
 */
export function ExhibitionCarousel() {
  const res = useApi(loadExhibitionPreviews, [])
  const list = res.data ?? []
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [reduced] = useState(prefersReducedMotion)
  const [paused, setPaused] = useState(reduced)
  const [holding, setHolding] = useState(false)

  const go = useCallback(
    (i: number) => {
      const el = trackRef.current
      if (!el || list.length === 0) return
      const next = (i + list.length) % list.length
      el.scrollTo({ left: next * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' })
    },
    [list.length, reduced],
  )

  // 지금 위치는 스크롤로 정해지므로 ref로도 들고 있어요. 손으로 넘기면 그 자리부터 다시 5초를 세요.
  const indexRef = useRef(0)
  useEffect(() => {
    if (paused || holding || list.length < 2) return
    const t = window.setInterval(() => go(indexRef.current + 1), AUTO_MS)
    return () => window.clearInterval(t)
  }, [paused, holding, index, list.length, go])

  if (list.length === 0) return null

  const onScroll = () => {
    const el = trackRef.current
    if (!el) return
    indexRef.current = Math.round(el.scrollLeft / el.clientWidth)
    setIndex(indexRef.current)
  }

  return (
    <section
      className={styles.carousel}
      aria-roledescription="carousel"
      aria-label="기획전"
      onMouseEnter={() => setHolding(true)}
      onMouseLeave={() => setHolding(false)}
      onFocus={() => setHolding(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHolding(false)}
    >
      <div ref={trackRef} className={styles.track} onScroll={onScroll} aria-live={paused ? 'polite' : 'off'}>
        {list.map((p, i) => (
          <div
            key={p.exhibition.id}
            className={styles.slide}
            role="group"
            aria-roledescription="slide"
            aria-label={`${list.length}개 중 ${i + 1}번째`}
            aria-hidden={i !== index}
            inert={i !== index}
          >
            <ExhibitionBanner {...p} to={`/exhibitions/${p.exhibition.id}`} headingLevel={2} />
          </div>
        ))}
      </div>
      {list.length > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.ctrl} aria-label="이전 기획전" onClick={() => go(index - 1)}>
            <Icon name="back" size={16} />
          </button>
          <div className={styles.dots}>
            {list.map((p, i) => (
              <button
                key={p.exhibition.id}
                type="button"
                className={i === index ? styles.dotOn : styles.dot}
                aria-label={`${i + 1}번째 기획전: ${p.exhibition.title}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => go(i)}
              />
            ))}
          </div>
          <button type="button" className={styles.ctrl} aria-label="다음 기획전" onClick={() => go(index + 1)}>
            <Icon name="chevron" size={16} />
          </button>
          {!reduced && (
            <button type="button" className={styles.pause} onClick={() => setPaused((v) => !v)}>
              {paused ? '자동 넘김 켜기' : '자동 넘김 멈춤'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
