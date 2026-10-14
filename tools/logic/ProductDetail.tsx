import { useState } from 'react'

const PRICE = 18900
const MAX_QTY = 3
// ---- body ----
const [qty, setQty] = useState(1)
const view = {
  qty,
  total: (PRICE * qty).toLocaleString('ko-KR'),
  bg: '#F5E1E6',
  inc: () => setQty((q) => Math.min(MAX_QTY, q + 1)),
  dec: () => setQty((q) => Math.max(1, q - 1)),
}
