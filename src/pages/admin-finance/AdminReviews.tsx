import { useMemo, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Empty } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { useIsDesktop } from '../../lib/useMedia'
import { mmdd } from './format'
import { MOCK_REVIEWS } from './mock'
import { Row } from './parts'
import s from './AdminFinance.module.css'

const COLS = '1.2fr .6fr .7fr 2fr .6fr'
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n))

/** 관리자 · 리뷰 (A9, 조회) */
export default function AdminReviews() {
  const desktop = useIsDesktop()
  const [keyword, setKeyword] = useState('')
  // TODO(API 미구현): 관리자 리뷰 목록 API — 지금은 목업 목록을 화면 안에서 검색해요
  const rows = useMemo(() => {
    const q = keyword.trim()
    return q ? MOCK_REVIEWS.filter((r) => r.productName.includes(q) || r.writer.includes(q)) : MOCK_REVIEWS
  }, [keyword])
  const [selectedId, setSelectedId] = useState<number | null>(MOCK_REVIEWS[1]?.reviewId ?? null)
  const selected = rows.find((r) => r.reviewId === selectedId) ?? null

  const empty = rows.length === 0 && <Empty title="검색 결과가 없어요." />

  if (!desktop)
    return (
      <ConsoleShell variant="admin" active="reviews" title="리뷰">
        <div className={s.page}>
          <label className={c.mobileSearch}>
            <Icon name="search" size={18} />
            <input
              aria-label="상품명이나 작성자로 검색"
              placeholder="상품명이나 작성자"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </label>
          {empty}
          <div className={s.cards}>
            {rows.map((r) => (
              <article key={r.reviewId} className={s.cardItem}>
                <div className={s.cardHead}>
                  <b className={c.ellipsis}>{r.productName}</b>
                  <span className={s.stars} aria-label={`별점 ${r.rating}점`}>
                    {stars(r.rating)}
                  </span>
                </div>
                <p className={s.meta}>
                  {r.writer} · {mmdd(r.createdAt)}
                </p>
                <p className={s.body}>{r.content}</p>
              </article>
            ))}
          </div>
        </div>
      </ConsoleShell>
    )

  return (
    <ConsoleShell variant="admin" active="reviews" title="리뷰">
      <div className={s.page}>
        <div className={`${c.split} ${s.split380}`}>
          <div>
            <div className={c.toolbar}>
              <div />
              <label className={c.search}>
                <Icon name="search" size={16} />
                <input
                  aria-label="상품명이나 작성자"
                  placeholder="상품명이나 작성자"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </label>
            </div>
            <div className={c.table} role="table" aria-label="리뷰 목록">
              <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COLS }}>
                <span>상품</span>
                <span>작성자</span>
                <span>별점</span>
                <span>내용</span>
                <span>작성일</span>
              </div>
              {empty}
              {rows.map((r) => (
                <div
                  key={r.reviewId}
                  role="row"
                  aria-selected={r.reviewId === selectedId}
                  className={`${c.tr} ${c.clickable} ${r.reviewId === selectedId ? c.selected : ''}`}
                  style={{ gridTemplateColumns: COLS }}
                  onClick={() => setSelectedId(r.reviewId)}
                >
                  <span className={`${c.ellipsis} ${c.strong}`}>{r.productName}</span>
                  <span>{r.writer}</span>
                  <span className={s.stars}>{stars(r.rating)}</span>
                  <span className={c.ellipsis}>{r.content}</span>
                  <span className={c.num}>{mmdd(r.createdAt)}</span>
                </div>
              ))}
            </div>
          </div>
          <section className={c.card} aria-label="리뷰 상세">
            {selected ? (
              <>
                <h2 className={s.blockTitle}>
                  {selected.productName} · {selected.writer}
                </h2>
                <dl className={s.dl}>
                  <Row label="별점">{selected.rating}점</Row>
                  <Row label="작성일">{mmdd(selected.createdAt)}</Row>
                </dl>
                <p className={s.quote}>{selected.content}</p>
              </>
            ) : (
              <Empty title="리뷰를 골라 주세요." />
            )}
          </section>
        </div>
      </div>
    </ConsoleShell>
  )
}
