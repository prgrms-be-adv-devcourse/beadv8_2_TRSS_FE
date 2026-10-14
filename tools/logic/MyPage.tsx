export type SellerStatus = '신청 전' | 'PENDING' | 'REJECTED' | 'APPROVED' | 'WITHDRAW_REQUESTED' | 'WITHDRAWN'
// [칩 색, 표시 이름, 설명, 버튼 문구, 이동 경로]
const SELLER: Record<SellerStatus, [string, string, string, string, string]> = {
  '신청 전': ['c-mute', '신청 전', '사업자 정보를 내면 관리자가 확인한 뒤 판매를 시작할 수 있어요.', '판매자 신청하기', '/seller/apply'],
  PENDING: ['c-blue', '심사 중', '관리자가 신청 내용을 확인하고 있어요.', '', ''],
  REJECTED: ['c-low', '반려됨', '반려 사유: 사업자등록번호와 상호명이 맞지 않아요. 고친 뒤 다시 신청할 수 있어요.', '다시 신청하기', '/seller/apply'],
  APPROVED: ['c-ok', '판매 중', '상품을 등록하고 주문과 정산을 관리할 수 있어요.', '판매자 센터로 가기', '/seller/products'],
  WITHDRAW_REQUESTED: ['c-low', '철회 심사 중', '판매 철회를 요청했어요. 확인하는 동안 판매 기능은 잠겨요.', '', ''],
  WITHDRAWN: ['c-mute', '철회됨', '판매를 그만뒀어요. 구매는 그대로 할 수 있어요.', '', ''],
}
// props: { sellerStatus = '신청 전' }: { sellerStatus?: SellerStatus }
// ---- body ----
const m = SELLER[sellerStatus] ?? SELLER['신청 전']
const view = { s: { chip: m[0], tag: m[1], text: m[2], act: m[3], href: m[4], btn: m[3] ? 'btn-p' : '', hasAct: !!m[3] } }
