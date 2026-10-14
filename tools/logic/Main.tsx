import { useState } from 'react'
import { productImage } from '../lib/products'

type Group = 'b' | 'w'
const CATEGORIES: Array<[name: string, color: string, group: Group]> = [
  ['스킨케어', '#F5E1E6', 'b'], ['메이크업', '#F5D9DE', 'b'], ['선케어', '#E8E6F3', 'b'], ['클렌징', '#E8E0F2', 'b'],
  ['마스크팩', '#E4EAF2', 'b'], ['바디케어', '#E4DAF0', 'b'], ['상의', '#EEE3F2', 'w'], ['아우터', '#E2E6EE', 'w'], ['바지', '#F3D9DE', 'w'],
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
// ---- body ----
const [sort, setSort] = useState(0)
const [hide, setHide] = useState(true)
const [cat, setCat] = useState('')

const colorOf = Object.fromEntries(CATEGORIES.map(([n, color]) => [n, color]))
let items = PRODUCTS.map(([shop, name, category, p, stock]) => ({
  shop, name, cat: category, p, stock,
  img: productImage(name),
  bg: `radial-gradient(110% 85% at 25% 18%,#FFFFFF 0%,${colorOf[category]} 62%)`,
  price: p.toLocaleString('ko-KR'),
  soldOut: stock === 0,
  low: stock > 0 && stock <= 5,
}))
if (cat) items = items.filter((i) => i.cat === cat)
if (hide) items = items.filter((i) => !i.soldOut)
if (sort === 1) items = [...items].sort((a, b) => a.p - b.p)
if (sort === 2) items = [...items].sort((a, b) => b.p - a.p)

const chip = ([name]: (typeof CATEGORIES)[number]) => ({
  name,
  on: cat === name,
  cls: cat === name ? 'sw sw-on' : 'sw',
  pick: () => setCat(name),
})
const view = {
  items,
  sorts: SORTS.map((label, i) => ({ label, on: i === sort, cls: i === sort ? 'btn btn-on' : 'btn', pick: () => setSort(i) })),
  count: items.length,
  empty: items.length === 0,
  title: cat || '전체 상품',
  beauty: CATEGORIES.filter((c) => c[2] === 'b').map(chip),
  wear: CATEGORIES.filter((c) => c[2] === 'w').map(chip),
  allOn: !cat,
  allCls: cat ? 'sw all' : 'sw all sw-on',
  total: PRODUCTS.length,
  pickAll: () => setCat(''),
  hideSoldOut: hide,
  toggleSold: () => setHide((h) => !h),
}
