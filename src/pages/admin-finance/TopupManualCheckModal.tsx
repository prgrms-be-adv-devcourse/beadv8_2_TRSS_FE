import { useState } from 'react'
import Button from '../../components/ui/Button'
import { ErrorView, Loading, won } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import {
  getAdminTopupPgPayment,
  resolveTopupManualCheck,
  type AdminTopupManualResolve,
  type AdminTopupPgPayment,
  type TopupManualCheckReason,
  type TopupManualResolveAction,
} from '../../lib/api/payment'
import { codeOf } from '../../lib/notices/common'
import { useApi } from '../../lib/useApi'
import { mmddhm } from './format'

const REASON_LABEL: Record<TopupManualCheckReason, string> = {
  CANCEL_AMOUNT_MISMATCH: 'PG 취소 금액이 기록과 다름',
  PG_PAYMENT_NOT_FOUND: 'PG에 결제가 없음',
  METHOD_CANCEL_PARTIAL: '허용하지 않은 결제 수단 건이 일부만 취소됨',
  METHOD_CANCEL_RETRY_EXHAUSTED: '허용하지 않은 결제 수단 건의 전액 취소가 계속 실패함',
}

/** 수동 확인 건의 충전 상태. 그 밖의 상태는 enum 값을 그대로 보여 준다 (목록이 새로 바뀐 직후 등) */
const STATUS_LABEL: Partial<Record<AdminTopupPgPayment['status'], string>> = {
  CANCELING: 'PG 취소 중',
  METHOD_CANCELING: '결제 수단 취소 중',
}

const PG_RESULT_LABEL: Record<AdminTopupPgPayment['pg']['result'], string> = {
  FOUND: '결제 있음',
  NOT_FOUND: 'PG에 결제 없음',
  UNKNOWN: '조회 실패',
  NOT_REQUESTED: '승인 요청 전 (조회 안 함)',
}

type ActionDef = {
  action: TopupManualResolveAction
  label: string
  /** 확인 단계 제목 */
  question: string
  confirm: (t: AdminTopupPgPayment) => string
}

/** 상태마다 고를 수 있는 정리 방법 (BE TopupManualResolveAction) */
const ACTIONS: Partial<Record<AdminTopupPgPayment['status'], ActionDef[]>> = {
  CANCELING: [
    {
      action: 'CONFIRM_CANCEL',
      label: '취소 확정',
      question: '취소를 확정할까요?',
      confirm: (t) => `PG에서 이번 취소가 처리된 것으로 확정해요. 취소 중인 ${won(t.cancelingAmount)}이 취소 확정 금액이 돼요.`,
    },
    {
      action: 'RESTORE',
      label: '되돌림',
      question: '취소를 되돌릴까요?',
      confirm: (t) =>
        `PG에서 이번 취소가 처리되지 않은 것으로 보고 되돌려요. 취소 중인 ${won(t.cancelingAmount)}을 회원 예치금과 충전 건 남은 금액으로 돌려놔요.`,
    },
  ],
  METHOD_CANCELING: [
    {
      action: 'CONFIRM_METHOD_CANCEL',
      label: '취소 확정',
      question: '전액 취소를 확정할까요?',
      confirm: () => 'PG에서 전액 취소된 것을 확인했다고 보고 확정해요. 충전 건은 허용하지 않은 결제 수단 취소로 끝나요.',
    },
    {
      action: 'RETRY_METHOD_CANCEL',
      label: '전액 취소 다시 요청',
      question: '전액 취소를 다시 요청할까요?',
      confirm: () => 'PG에 전액 취소를 한 번 더 요청해요.',
    },
  ],
}

/**
 * 어느 쪽으로 정리할지 판단을 돕는 문구 (BE 정리 흐름 기준).
 * CANCELING: PG 취소 합계 = 확정 + 취소 중이면 처리됨(취소 확정), = 확정이면 처리 안 됨(되돌림), 그 외는 PG에서 직접 취소한 금액이 섞임
 */
function hintOf(t: AdminTopupPgPayment): string | null {
  const pgCanceled = t.pg.canceledAmount
  if (t.pg.result !== 'FOUND' || pgCanceled == null) return null
  if (t.status === 'CANCELING') {
    if (pgCanceled === t.canceledAmount + t.cancelingAmount) return 'PG에서 이번 취소가 처리됐어요. 취소 확정이 맞아요.'
    if (pgCanceled === t.canceledAmount) return 'PG에서 이번 취소가 처리되지 않았어요. 되돌림이 맞아요.'
    return 'PG에서 직접 취소한 금액이 섞여 있어요. PG 상점관리자에서 취소 내역을 확인한 뒤 골라 주세요.'
  }
  if (t.status === 'METHOD_CANCELING') {
    if (t.pg.totalAmount != null && pgCanceled >= t.pg.totalAmount) return 'PG에서 전액 취소됐어요. 취소 확정이 맞아요.'
    return 'PG에서 아직 전액 취소되지 않았어요. 상점관리자에서 직접 취소했다면 확정, 아니면 다시 요청해 주세요.'
  }
  return null
}

/** 정리 결과 안내 */
function resultMessage(r: AdminTopupManualResolve): string {
  const name = `충전 #${r.topupId}`
  switch (r.action) {
    case 'CONFIRM_CANCEL':
      return `${name} 취소를 확정했어요${r.status === 'CANCELED' ? ' (전부 취소)' : ' (일부 취소)'}.`
    case 'RESTORE':
      return `${name} 취소를 되돌렸어요. 예치금과 남은 금액을 복원했어요.`
    case 'CONFIRM_METHOD_CANCEL':
      return `${name} 전액 취소를 확정했어요.`
    case 'RETRY_METHOD_CANCEL':
      return r.status === 'METHOD_CANCELING'
        ? `${name} 취소가 아직 끝나지 않아 자동으로 다시 확인해요.`
        : `${name} 전액 취소됐어요.`
  }
}

const row = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '6px 0', fontSize: 14 } as const
const section = { margin: '12px 0 0', padding: '12px 14px', borderRadius: 10, background: '#F6F6F5' } as const
const heading = { margin: '0 0 4px', fontSize: 13, fontWeight: 700 } as const

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div style={row}>
      <dt style={{ color: '#6e6e75' }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: 'right' }}>{value}</dd>
    </div>
  )
}

/**
 * 관리자 · 충전 수동 확인 건 정리 모달 (실패 거래 A7에서 연다).
 * 우리 기록과 PG 조회 결과를 함께 보여 주고, 상태에 맞는 정리 방법만 고를 수 있게 한다
 */
export default function TopupManualCheckModal({
  topupId,
  onDone,
  onClose,
}: {
  topupId: number
  /** 정리했거나 이미 정리된 건일 때. 안내 문구를 넘기고 목록을 새로 불러온다 */
  onDone: (message: string) => void
  onClose: () => void
}) {
  const data = useApi(() => getAdminTopupPgPayment(topupId), [topupId])
  const [pending, setPending] = useState<ActionDef | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const t = data.data
  const actions = t ? (ACTIONS[t.status] ?? []) : []

  const submit = async () => {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      onDone(resultMessage(await resolveTopupManualCheck(topupId, pending.action)))
    } catch (e) {
      if (codeOf(e) === 'TOPUP_NOT_MANUAL_CHECK') {
        onDone(`충전 #${topupId}은 이미 정리된 건이에요. 목록을 새로 불러왔어요.`)
        return
      }
      setError(errorMessage(e)) // TOPUP_MANUAL_RESOLVE_NOT_ALLOWED 등은 서버 안내 그대로
      setBusy(false)
      setPending(null)
    }
  }

  // 정리 확인 단계: 돈이 움직이므로 무엇이 바뀌는지 한 번 더 보여 준다
  if (t && pending) {
    return (
      <Modal
        title={pending.question}
        onClose={busy ? undefined : () => setPending(null)}
        actions={
          <>
            <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
              돌아가기
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? '처리 중…' : pending.label}
            </Button>
          </>
        }
      >
        <p>{pending.confirm(t)}</p>
        <p style={{ marginTop: 8, color: '#6e6e75', fontSize: 13 }}>되돌릴 수 없어요.</p>
      </Modal>
    )
  }

  const hint = t ? hintOf(t) : null
  return (
    <Modal
      title={`충전 #${topupId} 수동 확인`}
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          {actions.map((a) => (
            <Button key={a.action} onClick={() => setPending(a)} disabled={!t}>
              {a.label}
            </Button>
          ))}
        </>
      }
    >
      {data.loading && !t && <Loading />}
      {data.error && !t && <ErrorView message={data.error} onRetry={data.reload} />}
      {t && (
        // 공통 모달 본문은 가운데 정렬이라, 표처럼 읽히게 왼쪽 정렬로 바꾼다
        <div style={{ textAlign: 'left' }}>
          <p style={{ margin: 0 }}>
            {t.manualCheckReason ? REASON_LABEL[t.manualCheckReason] : '수동 확인 사유 없음'}
            {t.manualCheckAt && <span style={{ color: '#6e6e75' }}> · {mmddhm(t.manualCheckAt)}</span>}
          </p>
          <section style={section} aria-label="우리 기록">
            <p style={heading}>우리 기록</p>
            <dl style={{ margin: 0 }}>
              <Line label="상태" value={STATUS_LABEL[t.status] ?? t.status} />
              <Line label="충전 금액" value={won(t.amount)} />
              <Line label="남은 금액" value={won(t.remainingAmount)} />
              <Line label="취소 중" value={won(t.cancelingAmount)} />
              <Line label="취소 확정" value={won(t.canceledAmount)} />
            </dl>
          </section>
          <section style={section} aria-label="PG 조회">
            <p style={heading}>PG 조회 ({t.pgProvider === 'HECTO' ? '헥토' : '토스'})</p>
            <dl style={{ margin: 0 }}>
              <Line label="결과" value={PG_RESULT_LABEL[t.pg.result]} />
              {t.pg.result === 'FOUND' && (
                <>
                  <Line label="PG 상태" value={t.pg.status ?? '-'} />
                  <Line label="PG 결제 금액" value={t.pg.totalAmount == null ? '-' : won(t.pg.totalAmount)} />
                  <Line label="PG 취소 합계" value={t.pg.canceledAmount == null ? '-' : won(t.pg.canceledAmount)} />
                  <Line label="결제 수단" value={t.pg.method ?? '-'} />
                </>
              )}
            </dl>
            {t.pg.result === 'UNKNOWN' && (
              <div style={{ marginTop: 6 }}>
                {t.pg.message && <p style={{ margin: '0 0 8px', fontSize: 13 }}>{t.pg.message}</p>}
                <Button variant="outline" size="sm" onClick={data.reload} disabled={data.loading}>
                  다시 조회
                </Button>
              </div>
            )}
          </section>
          {hint && <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600 }}>{hint}</p>}
          {actions.length === 0 && (
            <p style={{ marginTop: 12, fontSize: 14 }}>지금 상태에서는 정리할 수 없어요. 목록을 새로 불러와 주세요.</p>
          )}
        </div>
      )}
      {error && (
        <p className={f.error} role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
