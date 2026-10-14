import { useState } from 'react'
// ---- body ----
const [stop, setStop] = useState(true)
const view = { stop, openStop: () => setStop(true), closeStop: () => setStop(false) }
