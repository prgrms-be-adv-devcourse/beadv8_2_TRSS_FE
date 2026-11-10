import { useState } from 'react'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import {
  SETTLEMENT_HISTORY_RESULT_LABEL,
  SETTLEMENT_HISTORY_STAGE_LABEL,
  SETTLEMENT_TRIGGER_LABEL,
  confirmLedgerMismatch,
  excludeSettlementCandidate,
  fmtMonth,
  getSettlement,
  getSettlementCandidates,
  getSettlementHistories,
  type Settlement,
  type SettlementCandidate,
  type SettlementHistoryResult,
} from '../../lib/api/settlement'
import { useApi } from '../../lib/useApi'
import { SETTLEMENT_STATUS, canHold } from './settlementMeta'
import { mmdd, retryHint, sellerName, ymdhm } from './format'
import { Drawer, Notice, ReasonModal, Row } from './parts'
import s from './AdminFinance.module.css'

const RESULT_TONE: Record<SettlementHistoryResult, Tone> = {
  SUCCEEDED: 'green',
  FAILED: 'red',
  MANUAL_REQUIRED: 'red',
  SKIPPED: 'neutral',
}

/** 원장 불일치 사유로 보류된 정산서인지 (BE LedgerMismatchRule.REASON) */
const isLedgerHold = (st: Settlement) => st.status === 'HOLD' && !!st.holdReason?.includes('원장')

/** 정산서 상세: 요약 · 포함 품목 · 처리 이력 · 같은 판매자의 미포함 후보(제외) · 원장 불일치 확인 */
export default function SettlementDrawer({
  settlementId,
  onClose,
  onRetry,
  onHold,
  onRelease,
  releasing,
  onChanged,
}: {
  settlementId: number
  onClose: () => void
  onRetry: (s: Settlement) => void
  onHold: (s: Settlement) => void
  onRelease: (s: Settlement) => void
  releasing: boolean
  onChanged: (notice: string) => void
}) {
  const detail = useApi(() => getSettlement(settlementId), [settlementId])
  const histories = useApi(() => getSettlementHistories(settlementId), [settlementId])
  const sellerId = detail.data?.settlement.sellerId
  const candidates = useApi(
    () =>
      sellerId === undefined ? Promise.resolve(null) : getSettlementCandidates({ sellerId, status: 'READY', size: 20 }),
    [sellerId],
  )
  const [excludeTarget, setExcludeTarget] = useState<SettlementCandidate | null>(null)
  const [askLedger, setAskLedger] = useState(false)
  const [notice, setNotice] = useState('')

  const st = detail.data?.settlement

  const footer = st && (
    <>
      {canHold(st.status) && (
        <Button variant="outline" onClick={() => onHold(st)}>
          보류
        </Button>
      )}
      {st.status === 'HOLD' && (
        <Button variant="outline" disabled={releasing} onClick={() => onRelease(st)}>
          {releasing ? '푸는 중…' : '보류 해제'}
        </Button>
      )}
      {isLedgerHold(st) && <Button onClick={() => setAskLedger(true)}>원장 불일치 확인</Button>}
      {st.status === 'MANUAL_REQUIRED' && <Button onClick={() => onRetry(st)}>다시 실행하기</Button>}
    </>
  )

  return (
    <Drawer
      title={st ? `${sellerName(st)} · ${fmtMonth(st.settlementMonth)}` : '정산서 상세'}
      onClose={onClose}
      footer={footer}
    >
      <Notice>{notice}</Notice>
      {detail.loading && !detail.data ? (
        <Loading />
      ) : detail.error ? (
        <ErrorView message={detail.error} onRetry={detail.reload} />
      ) : st ? (
        <>
          <section className={s.dSection}>
            <div className={s.cardHead}>
              <b>정산서 #{st.settlementId}</b>
              <Badge tone={SETTLEMENT_STATUS[st.status][0]}>{SETTLEMENT_STATUS[st.status][1]}</Badge>
            </div>
            <dl className={s.dl}>
              <Row label="판매 대금">{won(st.totalSalePrice)}</Row>
              <Row label="수수료">−{won(st.totalFee)}</Row>
              <Row label="지급액">{won(st.payoutAmount)}</Row>
              <Row label="품목">{st.itemCount}건</Row>
              {(st.status === 'FAILED' || st.status === 'MANUAL_REQUIRED') && (
                <>
                  <Row label="실패 횟수">{st.retryCount}회</Row>
                  <Row label="마지막 실패 원인">{st.lastFailReason ?? '-'}</Row>
                  {st.status === 'FAILED' && <Row label="다음 시도">{retryHint(st.nextRetryAt)}</Row>}
                </>
              )}
              {st.status === 'HOLD' && <Row label="보류 사유">{st.holdReason ?? '-'}</Row>}
              {st.paidAt && <Row label="지급일">{ymdhm(st.paidAt)}</Row>}
              <Row label="생성일">{ymdhm(st.createdAt)}</Row>
            </dl>
          </section>

          <section className={s.dSection}>
            <h3 className={s.dTitle}>포함된 품목 {detail.data?.candidates.length ?? 0}</h3>
            {detail.data && detail.data.candidates.length > 0 ? (
              <ul className={s.plainList}>
                {detail.data.candidates.map((cd) => (
                  <li key={cd.candidateId}>
                    <span>
                      주문 #{cd.orderId} · 품목 #{cd.orderItemId}
                      <span className={s.meta}>
                        {mmdd(cd.confirmedAt)} 구매 확정 · 판매 {won(cd.salePrice)} · 수수료 {won(cd.fee)}
                        {cd.settlementMonth !== st.settlementMonth && ` · ${fmtMonth(cd.settlementMonth)}에서 이월`}
                      </span>
                    </span>
                    <b>{won(cd.payoutAmount)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={s.meta}>포함된 품목이 없어요.</p>
            )}
          </section>

          <section className={s.dSection}>
            <h3 className={s.dTitle}>처리 이력</h3>
            {histories.loading && !histories.data ? (
              <Loading />
            ) : histories.error ? (
              <ErrorView message={histories.error} onRetry={histories.reload} />
            ) : !histories.data || histories.data.length === 0 ? (
              <p className={s.meta}>처리 이력이 없어요.</p>
            ) : (
              <ol className={s.timeline}>
                {histories.data.map((h) => (
                  <li key={h.historyId}>
                    <div className={s.cardHead}>
                      <b>
                        {SETTLEMENT_HISTORY_STAGE_LABEL[h.stage] ?? h.stage}
                        {h.attemptNo > 0 && ` · ${h.attemptNo}회차`}
                      </b>
                      <Badge tone={RESULT_TONE[h.result] ?? 'neutral'}>
                        {SETTLEMENT_HISTORY_RESULT_LABEL[h.result] ?? h.result}
                      </Badge>
                    </div>
                    <span className={s.meta}>
                      {ymdhm(h.processedAt)} · {SETTLEMENT_TRIGGER_LABEL[h.trigger] ?? h.trigger}
                      {h.batchExecutionId !== null && ` · 배치 #${h.batchExecutionId}`}
                    </span>
                    {h.failReason && (
                      <span className={s.metaRed}>
                        {h.errorCode ? `[${h.errorCode}] ` : ''}
                        {h.failReason}
                      </span>
                    )}
                    {h.adminReason && <span className={s.meta}>관리자 사유 · {h.adminReason}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className={s.dSection}>
            <h3 className={s.dTitle}>아직 정산서에 묶이지 않은 후보</h3>
            <p className={s.meta}>
              이 판매자의 정산 대기 후보예요. 지급하면 안 되는 품목은 사유를 남기고 제외할 수 있어요.
            </p>
            {candidates.loading && !candidates.data ? (
              <Loading />
            ) : candidates.error ? (
              <ErrorView message={candidates.error} onRetry={candidates.reload} />
            ) : !candidates.data || candidates.data.items.length === 0 ? (
              <Empty title="정산 대기 후보가 없어요." />
            ) : (
              <ul className={s.plainList}>
                {candidates.data.items.map((cd) => (
                  <li key={cd.candidateId}>
                    <span>
                      주문 #{cd.orderId} · {won(cd.payoutAmount)}
                      <span className={s.meta}>
                        {fmtMonth(cd.settlementMonth)} · {mmdd(cd.confirmedAt)} 구매 확정
                      </span>
                    </span>
                    <Button variant="dangerOutline" size="sm" onClick={() => setExcludeTarget(cd)}>
                      제외
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {candidates.data && candidates.data.totalElements > candidates.data.items.length && (
              <p className={s.meta}>
                최근 {candidates.data.items.length}건만 보여요 (전체 {candidates.data.totalElements}건).
              </p>
            )}
          </section>
        </>
      ) : (
        <Empty title="정산서를 찾을 수 없어요." />
      )}

      {excludeTarget && (
        <ReasonModal
          title="이 후보를 정산에서 제외할까요?"
          label="제외 사유"
          placeholder="예: 반품 처리 중인 주문이라 지급하지 않아요."
          help="제외한 후보는 다시 포함할 수 없어요. 사유는 처리 이력에 남아요."
          confirmLabel="제외하기"
          danger
          onConfirm={async (reason) => {
            await excludeSettlementCandidate(excludeTarget.candidateId, reason)
            setNotice(`주문 #${excludeTarget.orderId} 후보를 제외했어요.`)
            candidates.reload()
            histories.reload()
          }}
          onClose={() => setExcludeTarget(null)}
        >
          <dl className={s.dlBox}>
            <Row label="주문">#{excludeTarget.orderId}</Row>
            <Row label="지급 예정">{won(excludeTarget.payoutAmount)}</Row>
          </dl>
        </ReasonModal>
      )}

      {askLedger && st && (
        <ReasonModal
          title="원장 불일치를 확인할까요?"
          label="확인 사유"
          placeholder="예: 결제 쪽 정상 정정이라 지급해도 돼요."
          help="확인하면 이 불일치는 더 이상 지급을 막지 않아요. 다른 불일치가 없으면 보류가 자동으로 풀려요."
          confirmLabel="확인하기"
          onConfirm={async (reason) => {
            const r = await confirmLedgerMismatch(st.settlementId, reason)
            const msg =
              r.releasedCount > 0
                ? `원장 불일치를 확인했어요. 정산서 ${r.releasedCount}건의 보류가 풀렸어요.`
                : '원장 불일치를 확인했어요. 다른 불일치가 남아 있어 보류는 유지돼요.'
            setNotice(msg)
            onChanged(msg)
            detail.reload()
            histories.reload()
          }}
          onClose={() => setAskLedger(false)}
        >
          <dl className={s.dlBox}>
            <Row label="보류 사유">{st.holdReason ?? '-'}</Row>
          </dl>
        </ReasonModal>
      )}
    </Drawer>
  )
}
