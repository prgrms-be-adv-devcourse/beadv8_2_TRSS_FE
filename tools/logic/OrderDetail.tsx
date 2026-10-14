import { useState } from 'react'

export type OrderStatus = '결제 대기' | '결제 완료' | '반품 요청' | '구매 확정'
const STATUS: Record<OrderStatus, { chip: string; at: number; hold: string }> = {
  '결제 대기': { chip: 'c-low', at: 0, hold: '아직 결제하지 않았어요.' },
  '결제 완료': { chip: 'c-ok', at: 1, hold: '구매를 확정하기 전까지 팔레트가 보관해요. 10월 16일에 자동으로 확정돼요.' },
  '반품 요청': { chip: 'c-blue', at: 1, hold: '반품이 승인되면 예치금으로 돌려드려요.' },
  '구매 확정': { chip: 'c-mute', at: 2, hold: '판매자에게 정산될 금액이에요.' },
}
// props: { status = '결제 완료' }: { status?: OrderStatus }
// ---- body ----
const [ret, setRet] = useState(false)
const m = STATUS[status] ?? STATUS['결제 완료']
const labels: Array<[string, string]> = [
  ['주문 생성', '10.09 14:02'],
  ['결제 완료', m.at >= 1 ? '10.09 14:06' : '결제 전'],
  ['구매 확정', m.at >= 2 ? '10.16 00:00' : '10.16 자동 확정 예정'],
]
const view = {
  steps: labels.map(([label, when], i) => ({
    n: i + 1, label, when,
    dot: i <= m.at ? 'background:#26262C;color:#fff' : 'background:#fff;color:#5F5F6A;box-shadow:inset 0 0 0 1.5px #D5D5DD',
    line: i < m.at ? '#26262C' : i === 2 ? 'transparent' : '#E8E8ED',
    color: i <= m.at ? '#26262C' : '#5F5F6A',
  })),
  st: { label: status, chip: m.chip, hold: m.hold, created: status === '결제 대기', paid: status === '결제 완료', returning: status === '반품 요청' },
  showReturn: ret && status === '결제 완료',
  openReturn: () => setRet(true),
  closeReturn: () => setRet(false),
}
