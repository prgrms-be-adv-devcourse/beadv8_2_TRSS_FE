import { useState } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import type { Notice } from '../../components/NoticeModal'
import { ApiError } from '../../lib/api'
import { cancelTopup, getTopups, type Topup, type TopupCancel, type TopupStatus } from '../../lib/api/wallet'
import { OK, codeOf, commonNotice } from '../../lib/notices/common'
import NoticeView from './NoticeView'
import { fmtDateTime, usePaged } from './util'
import s from './account.module.css'

/** [배지 색, 배지 글자, 안내 문구] */
const TOPUP_STATUS: Record<TopupStatus, [Tone, string, string]> = {
  READY: ['neutral', '결제 전', '결제를 진행하지 않았어요'],
  PROCESSING: ['amber', '확인 중', '결제 승인을 기다리고 있어요'],
  DONE: ['green', '충전 완료', ''],
  CANCELING: ['amber', '취소 중', '충전 취소를 처리하고 있어요'],
  CANCELED: ['neutral', '취소됨', '충전을 취소했어요'],
  METHOD_CANCELING: ['amber', '취소 중', '충전할 수 없는 결제 수단이라 결제를 취소하고 있어요'],
  FAILED_USER_CANCEL: ['neutral', '실패', '결제를 취소했어요'],
  FAILED_PG_DECLINED: ['red', '실패', '카드사에서 승인하지 않았어요'],
  FAILED_AMOUNT_MISMATCH: ['red', '실패', '금액이 맞지 않아요'],
  FAILED_EXPIRED: ['neutral', '실패', '결제 시간이 지났어요'],
  FAILED_SYSTEM_ERROR: ['red', '실패', '일시적인 오류예요'],
  FAILED_METHOD_NOT_ALLOWED: ['neutral', '실패', '충전할 수 없는 결제 수단이라 결제를 취소했어요'],
}

/** 충전 금액 중 결제에 쓴 금액 (이미 취소한 금액과 지금 취소할 수 있는 금액은 뺀다) */
const usedAmount = (t: Topup) => t.amount - t.cancelableAmount - t.canceledAmount

/** 취소 요청 결과 문구. CANCELED·DONE은 취소 완료(DONE은 일부만 남아 있던 건), CANCELING은 PG 결과 확인 중 */
function cancelResultMessage(r: TopupCancel) {
  if (r.status === 'CANCELING') return `${won(r.cancelAmount)} 취소를 처리하고 있어요. 잠시 후 충전 내역에서 확인해 주세요.`
  return `${won(r.cancelAmount)}을 취소했어요. 결제한 수단으로 돌려드려요.`
}

/** 충전 취소 API 오류 안내. 모든 실패에서 예치금은 원래대로 돌아온다 (BE 충전 취소 API 설명) */
function cancelErrorNotice(e: unknown): Notice {
  switch (codeOf(e)) {
    case 'TOPUP_CANCEL_DECLINED': {
      const pgMessage = ((e as ApiError).data as { message?: string } | null)?.message
      return {
        title: '충전을 취소하지 못했어요',
        body: (
          <>
            {pgMessage && <p style={{ margin: '0 0 12px' }}>결제사 안내: {pgMessage}</p>}
            취소할 수 있는 기간이 지났거나, 결제한 수단에서 취소를 받지 않았어요. 예치금은 그대로예요.
          </>
        ),
        actions: OK,
      }
    }
    case 'TOPUP_NOT_CANCELABLE':
      return {
        title: '취소할 수 있는 금액이 없어요',
        body: '이미 쓰였거나 취소된 충전 건이에요. 충전 내역을 새로 불러올게요.',
        actions: OK,
      }
    case 'EXTERNAL_SERVICE_ERROR':
      return {
        title: '결제 서비스에 연결하지 못했어요',
        body: '잠시 후 다시 시도해 주세요. 예치금은 그대로예요.',
        actions: OK,
      }
    default:
      return commonNotice(e)
  }
}

/** ⑩-3 충전 내역 · 충전 취소 */
export default function TopupHistoryPage() {
  const list = usePaged((page) => getTopups({ page, size: 20 }), [])
  const [target, setTarget] = useState<Topup | null>(null)
  const [canceling, setCanceling] = useState(false)
  const [msg, setMsg] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)

  async function cancel() {
    if (!target || canceling) return
    setCanceling(true)
    setMsg('')
    try {
      setMsg(cancelResultMessage(await cancelTopup(target.topupId)))
    } catch (e) {
      setNotice(cancelErrorNotice(e))
    } finally {
      setCanceling(false)
      setTarget(null)
      list.reload() // 성공·실패 모두 남은 금액·상태가 바뀌었을 수 있다
    }
  }

  return (
    <AppFrame>
      <PageHeader title="충전 내역" back="/wallet" />
      <p className={s.note}>
        아직 쓰지 않은 금액만 취소(환불)할 수 있어요. 일부를 쓴 충전 건은 남은 금액만 취소돼요. 예치금은 오래된 충전
        건부터 쓰여요. 반품 환불·정산으로 들어온 예치금은 충전 취소 대상이 아니에요.
      </p>
      {msg && (
        <p role="status" className={`${s.success} ${s.card}`}>
          {msg}
        </p>
      )}
      {list.loading && !list.loaded && <Loading />}
      {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
      {list.loaded && list.items.length === 0 && (
        <Empty title="아직 충전한 내역이 없어요" action={<Button to="/wallet/topup">충전하기</Button>} />
      )}
      <ul className={s.list}>
        {list.items.map((t) => {
          // 백엔드에 새 상태가 생겨도 화면이 깨지지 않게 enum 값을 그대로 보여 준다
          const [tone, label, note] = TOPUP_STATUS[t.status] ?? ['neutral', t.status, '']
          const done = t.status === 'DONE'
          const cancellable = done && t.cancelableAmount > 0
          return (
            <li key={t.topupId}>
              <div className={s.liHead}>
                <b>{won(t.amount)}</b>
                <Badge tone={tone}>{label}</Badge>
              </div>
              <p className={s.liSub}>
                {fmtDateTime(t.createdAt)} · 토스페이먼츠 · <span title={t.orderId}>{t.orderId.slice(0, 13)}</span>
              </p>
              {done && (
                <p className={s.liSub}>
                  남은 금액 {won(t.remainingAmount)} / {won(t.amount)}
                  {t.canceledAmount > 0 && ` · 취소한 금액 ${won(t.canceledAmount)}`}
                </p>
              )}
              {done && !cancellable && <p className={s.liSub}>취소할 수 있는 금액이 없어요</p>}
              {!done && (t.failReason || note) && <p className={s.liSub}>{t.failReason ?? note}</p>}
              {cancellable && (
                <div className={s.liRight}>
                  <Button variant="outline" size="sm" onClick={() => setTarget(t)}>
                    충전 취소
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {list.hasMore && (
        <div className={s.more}>
          <Button variant="outline" size="sm" disabled={list.loading} onClick={list.loadMore}>
            더 보기
          </Button>
        </div>
      )}

      {target && (
        <Modal
          title="충전을 취소할까요?"
          onClose={() => !canceling && setTarget(null)}
          actions={
            <>
              <Button variant="outline" disabled={canceling} onClick={() => setTarget(null)}>
                닫기
              </Button>
              <Button disabled={canceling} onClick={cancel}>
                {canceling ? '취소하는 중…' : '취소하기'}
              </Button>
            </>
          }
        >
          {won(target.cancelableAmount)}을 결제한 수단으로 돌려드리고, 같은 금액이 예치금에서 바로 빠져요.
          {usedAmount(target) > 0 && ` 이미 쓴 ${won(usedAmount(target))}은 취소되지 않아요.`}
        </Modal>
      )}
      <NoticeView notice={notice} onClose={() => setNotice(null)} />
    </AppFrame>
  )
}
