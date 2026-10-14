import { useState } from 'react'

const CURRENT_STOCK = 23
// ---- body ----
const [delta, setDelta] = useState(10)
const view = {
  deltaStr: (delta > 0 ? '+' : '') + delta,
  after: CURRENT_STOCK + delta,
  inc: () => setDelta((d) => d + 1),
  dec: () => setDelta((d) => Math.max(-CURRENT_STOCK, d - 1)),
}
