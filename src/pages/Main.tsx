import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './Main.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { Fragment, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { productImage } from '../lib/products'

type Group = 'b' | 'w'
const CATEGORIES: Array<[name: string, color: string, group: Group]> = [
  ['스킨케어', '#F5E1E6', 'b'],
  ['메이크업', '#F5D9DE', 'b'],
  ['선케어', '#E8E6F3', 'b'],
  ['클렌징', '#E8E0F2', 'b'],
  ['마스크팩', '#E4EAF2', 'b'],
  ['바디케어', '#E4DAF0', 'b'],
  ['상의', '#EEE3F2', 'w'],
  ['아우터', '#E2E6EE', 'w'],
  ['바지', '#F3D9DE', 'w'],
]
// [판매자, 상품명, 카테고리, 가격, 재고]
const PRODUCTS: Array<[shop: string, name: string, category: string, price: number, stock: number]> = [
  ['온결', '약산성 수분 진정 토너 300ml', '스킨케어', 18900, 24],
  ['무드랩', '시카 리페어 크림 50ml', '스킨케어', 27000, 3],
  ['데일리핏', '순한 아미노 클렌징폼 150ml', '클렌징', 12500, 40],
  ['온결', '비타민 브라이트닝 세럼 30ml', '스킨케어', 32000, 0],
  ['하루담', '저자극 데일리 선크림 SPF50+', '선케어', 21000, 5],
  ['무드랩', '세라마이드 장벽 크림 80ml', '스킨케어', 29500, 18],
  ['하루담', '진정 마스크팩 10매', '마스크팩', 15900, 12],
  ['하루담', '촉촉 커버 쿠션 21호', '메이크업', 26000, 9],
  ['데일리핏', '오버핏 코튼 반팔 티셔츠', '상의', 24000, 2],
  ['데일리핏', '라이트 윈드브레이커', '아우터', 59000, 14],
]
const SORTS = ['최신순', '낮은 가격순', '높은 가격순']

/** GET /api/v1/categories 응답 노드 */
type CategoryNode = { categoryId: number; name: string; depth: number; sortOrder: number; children: CategoryNode[] }
type CategoryGroup = { label: string; names: string[] }

/** 서버에 연결되지 않을 때 쓰는 기본 카테고리 */
const FALLBACK_GROUPS: CategoryGroup[] = [
  { label: '뷰티', names: CATEGORIES.filter((c) => c[2] === 'b').map((c) => c[0]) },
  { label: '의류', names: CATEGORIES.filter((c) => c[2] === 'w').map((c) => c[0]) },
]
const DEFAULT_TILE = '#ECE8F2'

/** 카테고리 트리를 서버에서 불러와요. 실패하면 기본 카테고리를 그대로 써요. */
function useCategoryGroups() {
  const [groups, setGroups] = useState<CategoryGroup[]>(FALLBACK_GROUPS)
  useEffect(() => {
    let alive = true
    api<CategoryNode[]>('/api/v1/categories')
      .then((tree) => {
        if (!alive || !tree?.length) return
        setGroups(tree.map((g) => ({ label: g.name, names: g.children.map((c) => c.name) })))
      })
      .catch(() => {
        /* 서버가 꺼져 있으면 기본값 유지 */
      })
    return () => {
      alive = false
    }
  }, [])
  return groups
}

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useMainView() {
  const [sort, setSort] = useState(0)
  const [hide, setHide] = useState(true)
  const [cat, setCat] = useState('')
  const groups = useCategoryGroups()

  const colorOf = Object.fromEntries(CATEGORIES.map(([n, color]) => [n, color]))
  let items = PRODUCTS.map(([shop, name, category, p, stock]) => ({
    shop,
    name,
    cat: category,
    p,
    stock,
    img: productImage(name),
    bg: `radial-gradient(110% 85% at 25% 18%,#FFFFFF 0%,${colorOf[category] ?? DEFAULT_TILE} 62%)`,
    price: p.toLocaleString('ko-KR'),
    soldOut: stock === 0,
    low: stock > 0 && stock <= 5,
  }))
  if (cat) items = items.filter((i) => i.cat === cat)
  if (hide) items = items.filter((i) => !i.soldOut)
  if (sort === 1) items = [...items].sort((a, b) => a.p - b.p)
  if (sort === 2) items = [...items].sort((a, b) => b.p - a.p)

  const chip = (name: string) => ({
    name,
    on: cat === name,
    cls: cat === name ? 'sw sw-on' : 'sw',
    pick: () => setCat(name),
  })
  const view = {
    items,
    sorts: SORTS.map((label, i) => ({
      label,
      on: i === sort,
      cls: i === sort ? 'btn btn-on' : 'btn',
      pick: () => setSort(i),
    })),
    count: items.length,
    empty: items.length === 0,
    title: cat || '전체 상품',
    groups: groups.map((g) => ({ label: g.label, chips: g.names.map(chip) })),
    allOn: !cat,
    allCls: cat ? 'sw all' : 'sw all sw-on',
    total: PRODUCTS.length,
    pickAll: () => setCat(''),
    hideSoldOut: hide,
    toggleSold: () => setHide((h) => !h),
  }
  return view
}

/** 상품 목록 */
export default function MainPage() {
  const view = useMainView()
  const { allCls, allOn, count, empty, groups, hideSoldOut, items, pickAll, sorts, title, toggleSold, total } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader compact />
        <section
          aria-label="검색과 카테고리"
          className={cx('disc')}
          style={{ borderBottom: '1px solid #E8E8ED', backgroundColor: '#ffffff', width: '100%' }}
        >
          <div
            style={{
              maxWidth: '1240px',
              margin: '0 auto',
              padding: '28px 24px 32px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
            }}
          >
            <div className={cx('panel2')}>
              <div className={cx('search')} role="search">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#5F5F6A"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="m16 16 4.5 4.5" />
                </svg>
                <input aria-label="상품 검색" placeholder="찾는 상품 이름을 입력해 주세요" />
                <button type="button" style={{ backgroundColor: '#26262c' }}>
                  검색
                </button>
              </div>
              <div className={cx('cats')}>
                <button
                  className={cx(allCls)}
                  onClick={pickAll}
                  aria-pressed={allOn}
                  style={{
                    backgroundColor: '#26262c',
                    color: '#ffffff',
                    borderColor: '#5F5F6A',
                    borderWidth: '0px',
                    gridRow: `1 / span ${Math.max(groups.length, 1)}`,
                  }}
                >
                  <span>전체</span>
                  <small className={cx('num')}>{total}개 상품</small>
                </button>
                {groups.map((g, gIndex) => (
                  <Fragment key={g.label}>
                    <span className={cx('glabel')} id={`g-${gIndex}`} style={{ gridColumn: 2 }}>
                      {g.label}
                    </span>
                    <div className={cx('gchips')} role="group" aria-labelledby={`g-${gIndex}`}>
                      {g.chips.map((c) => (
                        <button
                          className={cx(c.cls)}
                          onClick={c.pick}
                          aria-pressed={c.on}
                          style={{ borderStyle: 'solid', borderColor: '#8A8A95', backgroundColor: 'transparent' }}
                          key={c.name}
                        >
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </Fragment>
                ))}
              </div>
            </div>
          </div>
        </section>
        <main
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '32px 24px 56px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px 24px',
            }}
          >
            <h1
              style={{
                margin: '0',
                fontSize: '30px',
                fontWeight: '700',
                letterSpacing: '-0.8px',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
              }}
            >
              {title}
              <span className={cx('num')} style={{ fontSize: '16px', fontWeight: '500', color: '#5F5F6A' }}>
                {count}개
              </span>
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 20px' }}>
              <label className={cx('tog')}>
                <input type="checkbox" checked={hideSoldOut} onChange={toggleSold} />
                품절 상품 빼고 보기
              </label>
              <div role="group" aria-label="정렬" style={{ display: 'flex', gap: '2px' }}>
                {sorts.map((s, sIndex) => (
                  <button
                    className={cx(s.cls)}
                    onClick={s.pick}
                    aria-pressed={s.on}
                    style={{ fontSize: '14px', minHeight: '40px' }}
                    key={sIndex}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {empty && (
            <>
              <div
                style={{
                  padding: '64px 24px',
                  border: '1px dashed #D5D5DD',
                  borderRadius: '8px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <strong style={{ fontSize: '17px', fontWeight: '700' }}>
                  이 카테고리에는 지금 살 수 있는 상품이 없어요
                </strong>
                <span className={cx('sub')}>품절 상품을 함께 보거나 전체 카테고리에서 찾아보세요.</span>
                <button className={cx('btn btn-on')} onClick={pickAll}>
                  전체 상품 보기
                </button>
              </div>
            </>
          )}
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '32px 20px' }}
          >
            {items.map((p, pIndex) => (
              <Link className={cx('card')} to="/product/1" key={pIndex}>
                <div className={cx('tile')} style={css(`background:${p.bg}`)}>
                  <img
                    src={p.img}
                    alt=""
                    style={{ position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {p.low && (
                    <>
                      <span className={cx('chip c-low')} style={{ position: 'absolute', top: '10px', left: '10px' }}>
                        {p.stock}개 남았어요
                      </span>
                    </>
                  )}
                  {p.soldOut && (
                    <>
                      <div
                        style={{
                          position: 'absolute',
                          inset: '0',
                          background: 'rgba(255,255,255,.66)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span
                          className={cx('chip c-mute')}
                          style={{ fontSize: '13px', minHeight: '28px', padding: '0 12px' }}
                        >
                          품절
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className={cx('label')}>
                  <span className={cx('sub')} style={{ fontWeight: '500' }}>
                    {p.shop}
                  </span>
                  <span style={{ fontSize: '15px', lineHeight: '1.45', minHeight: '44px' }}>{p.name}</span>
                  <strong
                    className={cx('num')}
                    style={{ fontSize: '19px', fontWeight: '700', letterSpacing: '-0.3px', paddingTop: '4px' }}
                  >
                    {p.price}원
                  </strong>
                </div>
              </Link>
            ))}
          </div>
          <nav
            aria-label="페이지"
            style={{ display: 'flex', justifyContent: 'center', gap: '4px', paddingTop: '16px' }}
          >
            <Link className={cx('btn')} to="/" aria-label="이전 페이지">
              ‹
            </Link>
            <Link className={cx('btn btn-on')} to="/" aria-current="page">
              1
            </Link>
            <Link className={cx('btn')} to="/">
              2
            </Link>
            <Link className={cx('btn')} to="/">
              3
            </Link>
            <Link className={cx('btn')} to="/" aria-label="다음 페이지">
              ›
            </Link>
          </nav>
        </main>
      </div>
    </div>
  )
}
