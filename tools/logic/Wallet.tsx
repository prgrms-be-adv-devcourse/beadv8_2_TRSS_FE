import { useState, type ChangeEvent } from 'react'
import { won } from '../lib/ui'

const PRESETS = [10000, 30000, 50000, 100000]
const PRESET_ON = 'min-height:48px;border-radius:8px;border:2px solid #26262C;background:#F3F1F6;color:#26262C;font:inherit;font-weight:700;cursor:pointer'
const PRESET_OFF = 'min-height:48px;border-radius:8px;border:1px solid #D5D5DD;background:#fff;color:#26262C;font:inherit;font-weight:500;cursor:pointer'
const TAB_ON = 'min-height:52px;border:none;border-bottom:2px solid #26262C;margin-bottom:-1px;background:none;font:inherit;font-weight:700;color:#26262C;cursor:pointer;padding:0'
const TAB_OFF = 'min-height:52px;border:none;border-bottom:2px solid transparent;background:none;font:inherit;color:#5F5F6A;cursor:pointer;padding:0'
// ---- body ----
const [amount, setAmount] = useState(30000)
const [tab, setTab] = useState(0)
const view = {
  presets: PRESETS.map((v) => ({ label: won(v / 10000) + '만 원', on: amount === v, style: amount === v ? PRESET_ON : PRESET_OFF, pick: () => setAmount(v) })),
  amountStr: won(amount),
  changeAmount: (e: ChangeEvent<HTMLInputElement>) => setAmount(Number(e.target.value.replace(/[^0-9]/g, '')) || 0),
  tabs: ['충전 내역', '거래 내역'].map((label, i) => ({ label, on: tab === i, style: tab === i ? TAB_ON : TAB_OFF, pick: () => setTab(i) })),
  tabTopup: tab === 0,
  tabLedger: tab === 1,
}
