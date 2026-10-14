import { useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'

type CartItem = { shop: string; name: string; bg: string; p: number; old?: number; pending?: boolean; sold?: boolean }
const CART: CartItem[] = [
  { shop: '온결', name: '약산성 수분 진정 토너 300ml', bg: '#F5E1E6', p: 18900 },
  { shop: '무드랩', name: '시카 리페어 크림 50ml', bg: '#E4EAF2', p: 27000, old: 24000 },
  { shop: '하루담', name: '저자극 데일리 선크림 SPF50+', bg: '#F3D9DE', p: 21000 },
  { shop: '데일리핏', name: '순한 아미노 클렌징폼 150ml', bg: '#E8E0F2', p: 12500, pending: true },
  { shop: '온결', name: '비타민 브라이트닝 세럼 30ml', bg: '#E8E6F3', p: 32000, sold: true },
]
const BALANCE = 48000
// ---- body ----
const [checked, setChecked] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: false })
const [qtys, setQtys] = useState<Record<number, number>>({ 0: 1, 1: 2, 2: 1 })

let sum = 0
let selected = 0
const rows = CART.map((b, i) => {
  const locked = !!(b.pending || b.sold)
  const on = !locked && !!checked[i]
  const qty = qtys[i] || 1
  if (on) { sum += b.p * qty; selected++ }
  return {
    shop: b.shop, name: b.name, img: productImage(b.name), bg: b.bg,
    price: won(b.p), oldPrice: b.old ? won(b.old) : '', changed: !!b.old, plain: !b.old && !b.sold,
    pending: !!b.pending, soldOut: !!b.sold, locked, on, editable: !locked, qty,
    line: b.sold ? '' : won(b.p * qty) + '원', fade: b.sold ? '0.5' : '1', rowBg: locked ? '#FAFAFB' : '#fff',
    toggle: () => setChecked((s) => ({ ...s, [i]: !s[i] })),
    inc: () => setQtys((s) => ({ ...s, [i]: Math.min(99, qty + 1) })),
    dec: () => setQtys((s) => ({ ...s, [i]: Math.max(1, qty - 1) })),
  }
})
const gap = sum - BALANCE
const view = {
  rows,
  sum: won(sum),
  selCount: selected,
  orderable: 3,
  allOn: selected === 3,
  toggleAll: () => { const v = selected !== 3; setChecked({ 0: v, 1: v, 2: v }) },
  cover: sum ? Math.min(100, Math.round((BALANCE / sum) * 100)) + '%' : '100%',
  gapText: gap > 0 ? won(gap) + '원이 모자라요. 주문한 뒤 충전할 수 있어요.' : '예치금으로 바로 결제할 수 있어요.',
  gapColor: gap > 0 ? '#A33A1F' : '#1C6B47',
}
