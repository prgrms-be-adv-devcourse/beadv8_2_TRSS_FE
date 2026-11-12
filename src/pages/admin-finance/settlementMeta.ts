import type { Tone } from '../../components/ui/Misc'
import type { SettlementStatus } from '../../lib/api/settlement'

/**
 * 정산서 상태 [배지 색, 글자]
 * FAILED는 다음 재시도 일시가 있어 자동으로 다시 시도하는 중이라 "재시도 중"으로 보여요(사람이 할 일은 MANUAL_REQUIRED만)
 */
export const SETTLEMENT_STATUS: Record<SettlementStatus, [Tone, string]> = {
  READY: ['neutral', '지급 예정'],
  PAID: ['green', '지급 완료'],
  FAILED: ['amber', '재시도 중'],
  MANUAL_REQUIRED: ['red', '수동 처리 필요'],
  HOLD: ['neutral', '보류'],
}

/** 지급 전(READY·FAILED·MANUAL_REQUIRED)만 보류할 수 있어요 (BE Settlement.hold) */
export const canHold = (st: SettlementStatus) => st === 'READY' || st === 'FAILED' || st === 'MANUAL_REQUIRED'
