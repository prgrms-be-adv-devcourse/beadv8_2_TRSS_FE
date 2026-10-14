import { useEffect, useRef, useState } from 'react'
import { productImage } from '../lib/products'
import { won } from '../lib/ui'

export type CheckoutProps = {
  /** 예치금이 결제 금액보다 부족한지 */
  balance?: '부족' | '충분'
  /** 처음 열 때 보여줄 결제 팝업 */
  popup?: '없음' | '결제 요청' | '결제 진행 중' | '결제 완료'
}
type PayStep = '' | 'confirm' | 'processing' | 'done'
const POPUP_STEP: Record<string, PayStep> = { '결제 요청': 'confirm', '결제 진행 중': 'processing', '결제 완료': 'done' }
const ORDER_ITEMS = [
  { shop: '온결', name: '약산성 수분 진정 토너 300ml', bg: '#F5E1E6', p: 18900, q: 1 },
  { shop: '무드랩', name: '시카 리페어 크림 50ml', bg: '#E4EAF2', p: 27000, q: 2 },
]
const AMOUNT = 72900
// props: { balance = '부족', popup = '없음' }: CheckoutProps
// ---- body ----
const [pay, setPay] = useState<PayStep>(POPUP_STEP[popup] ?? '')
const timer = useRef<number | undefined>(undefined)
useEffect(() => () => window.clearTimeout(timer.current), [])

const short = balance === '부족'
const bal = short ? 48000 : 100000
const gap = AMOUNT - bal
const view = {
  items: ORDER_ITEMS.map((r) => ({ shop: r.shop, name: r.name, img: productImage(r.name), bg: r.bg, unit: won(r.p), qty: r.q, line: won(r.p * r.q) })),
  amount: won(AMOUNT),
  bal: won(bal),
  short,
  enough: !short,
  gap: won(Math.max(0, gap)),
  rec: won(Math.ceil(Math.max(0, gap) / 10000) * 10000),
  left: won(Math.max(0, bal - AMOUNT)),
  coverPct: Math.min(100, Math.round((bal / AMOUNT) * 100)) + '%',
  pop: { confirm: pay === 'confirm', processing: pay === 'processing', done: pay === 'done' },
  openPay: () => setPay('confirm'),
  closePay: () => setPay(''),
  startPay: () => {
    setPay('processing')
    // 실제 연동 시 결제 API 응답에 맞춰 바꿔요
    timer.current = window.setTimeout(() => setPay('done'), 1800)
  },
}
