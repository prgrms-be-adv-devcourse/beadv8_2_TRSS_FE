import { useState } from 'react'

const FILTERS = ['전체', '결제 대기', '결제 완료', '반품', '구매 확정', '취소']
const ON = 'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #26262C;background:#26262C;color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer'
const OFF = 'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #D5D5DD;background:#fff;color:#45454F;font:inherit;font-size:14px;cursor:pointer'
// ---- body ----
const [filter, setFilter] = useState(0)
const view = {
  filters: FILTERS.map((label, i) => ({ label, on: filter === i, style: filter === i ? ON : OFF, pick: () => setFilter(i) })),
}
