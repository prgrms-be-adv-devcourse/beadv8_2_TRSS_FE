import { useState } from 'react'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty, ErrorView, Loading, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { getTopups, type Topup, type TopupStatus } from '../../lib/api/wallet'
import { fmtDateTime, usePaged } from './util'
import s from './account.module.css'

/** [배지 색, 배지 글자, 안내 문구] */
const TOPUP_STATUS: Record<TopupStatus, [Tone, string, string]> = {
  READY: ['neutral', '결제 전', '결제를 진행하지 않았어요'],
  PROCESSING: ['amber', '확인 중', '토스 승인을 기다리고 있어요'],
  DONE: ['green', '충전 완료', ''],
  CANCELED: ['neutral', '취소됨', '충전을 취소했어요'],
  FAILED_USER_CANCEL: ['neutral', '실패', '결제를 취소했어요'],
  FAILED_PG_DECLINED: ['red', '실패', '카드사에서 승인하지 않았어요'],
  FAILED_AMOUNT_MISMATCH: ['red', '실패', '금액이 맞지 않아요'],
  FAILED_EXPIRED: ['neutral', '실패', '결제 시간이 지났어요'],
  FAILED_SYSTEM_ERROR: ['red', '실패', '일시적인 오류예요'],
}

/** ⑩-3 충전 내역 · 충전 취소 */
export default function TopupHistoryPage() {
  const list = usePaged((page) => getTopups({ page, size: 20 }), [])
  const [target, setTarget] = useState<Topup | null>(null)
  // 목업으로 취소한 충전 건 (화면 안에서만)
  const [canceled, setCanceled] = useState<Set<number>>(new Set())
  const [msg, setMsg] = useState('')

  function cancel() {
    if (!target) return
    // TODO(API 미구현): POST /api/v1/topups/{topupId}/cancel — 한 번도 쓰지 않은 충전 건 전액 취소(토스 결제 취소 + 예치금 차감).
    //   지금은 화면 안 상태만 '취소됨'으로 바꿔요.
    setCanceled((prev) => new Set(prev).add(target.topupId))
    setMsg(`${won(target.amount)} 충전을 취소했어요. (목업: 실제 환불은 아직 되지 않아요)`)
    setTarget(null)
  }

  return (
    <AppFrame>
      <PageHeader title="충전 내역" back="/wallet" />
      <p className={s.note}>
        한 번도 쓰지 않은 충전 건만 전액 취소(환불)할 수 있어요. 예치금은 오래된 충전 건부터 쓰여요. 반품 환불·정산으로
        들어온 예치금은 충전 취소 대상이 아니에요.
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
          const status: TopupStatus = canceled.has(t.topupId) ? 'CANCELED' : t.status
          const [tone, label, note] = TOPUP_STATUS[status]
          const done = status === 'DONE'
          const cancellable = done && t.remainingAmount === t.amount
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
                </p>
              )}
              {done && !cancellable && <p className={s.liSub}>일부를 써서 취소할 수 없어요</p>}
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
          onClose={() => setTarget(null)}
          actions={
            <>
              <Button variant="outline" onClick={() => setTarget(null)}>
                닫기
              </Button>
              <Button onClick={cancel}>취소하기</Button>
            </>
          }
        >
          {won(target.amount)}을 결제한 수단으로 돌려드리고, 같은 금액이 예치금에서 빠져요.
        </Modal>
      )}
    </AppFrame>
  )
}
