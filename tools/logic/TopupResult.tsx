export type TopupResultState = '확인 중' | '완료' | '실패'
type View = { wait: boolean; done: boolean; fail: boolean; title: string; desc: string; iconBg: string; k3: string; v3: string }
const RESULT: Record<TopupResultState, Partial<View>> = {
  '확인 중': { wait: true, title: '충전을 확인하고 있어요', desc: '토스페이먼츠의 승인 결과를 기다리고 있어요. 화면을 닫아도 승인되면 예치금에 들어와요.', iconBg: 'background:#FFF1E8;color:#A33A1F', k3: '상태', v3: '승인 확인 중' },
  완료: { done: true, title: '30,000원을 충전했어요', desc: '이제 주문 ORD-20261009-0142를 결제할 수 있어요.', iconBg: 'background:#E3F5EC;color:#1C6B47', k3: '사용할 수 있는 예치금', v3: '78,000원' },
  실패: { fail: true, title: '충전하지 못했어요', desc: '결제를 취소해서 충전되지 않았어요. 빠져나간 돈은 없어요.', iconBg: 'background:#EFEFF3;color:#45454F', k3: '사유', v3: '사용자 취소' },
}
// props: { result = '완료' }: { result?: TopupResultState }
// ---- body ----
const s: View = { wait: false, done: false, fail: false, title: '', desc: '', iconBg: '', k3: '', v3: '', ...RESULT[result] }
const view = { s }
