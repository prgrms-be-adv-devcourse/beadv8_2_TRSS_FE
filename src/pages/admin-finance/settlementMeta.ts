import type { Tone } from '../../components/ui/Misc'
import type { SettlementStatus } from '../../lib/api/settlement'

/** 정산서 상태 [배지 색, 글자] */
export const SETTLEMENT_STATUS: Record<SettlementStatus, [Tone, string]> = {
  READY: ['neutral', '지급 대기'],
  PAID: ['green', '지급 완료'],
  FAILED: ['red', '실패'],
  MANUAL_REQUIRED: ['red', '수동 처리 필요'],
  HOLD: ['amber', '보류'],
}

/** 지급 전(READY·FAILED·MANUAL_REQUIRED)만 보류할 수 있어요 (BE Settlement.hold) */
export const canHold = (st: SettlementStatus) => st === 'READY' || st === 'FAILED' || st === 'MANUAL_REQUIRED'
