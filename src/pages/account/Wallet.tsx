import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Chips, Empty, ErrorView, Loading, won } from '../../components/ui/Misc'
import { getWallet, getWalletTransactions, type WalletTransactionType } from '../../lib/api/wallet'
import { TOPUP_NOTICE_KEY } from '../../lib/notices/topup'
import { useApi } from '../../lib/useApi'
import { fmtDateTime, usePaged } from './util'
import s from './account.module.css'

/** 거래 내역 '내용' 문구. 응답에 주문번호·충전번호가 없어서 유형 라벨만 보여 줘요 */
export const LEDGER_LABEL: Record<WalletTransactionType, string> = {
  CHARGE: '충전',
  CHARGE_CANCEL: '충전 취소',
  PAYMENT: '주문 결제',
  REFUND: '반품 환불',
  SETTLEMENT: '정산 지급',
  FEE: '정산 수수료',
}

/** +50,000원 / −52,000원 (빼기는 U+2212 기호) */
const signedWon = (amount: number) => `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${won(Math.abs(amount))}`

type Filter = 'ALL' | WalletTransactionType
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'CHARGE', label: '충전' },
  { value: 'PAYMENT', label: '결제' },
  { value: 'REFUND', label: '환불' },
  { value: 'CHARGE_CANCEL', label: '충전 취소' },
]
const PAGE = 20

/** ⑩ 예치금: 잔액 + 거래 내역. 충전은 /wallet/topup */
export default function WalletPage() {
  const location = useLocation()
  const [filter, setFilter] = useState<Filter>('ALL')
  const wallet = useApi(getWallet, [])
  const ledger = usePaged(
    (page) => getWalletTransactions({ page, size: PAGE, ...(filter === 'ALL' ? {} : { type: filter }) }),
    [filter],
  )

  // 주문서의 잔액 부족(/wallet?orderId=&orderNumber=&shortage=)과 충전 결과 안내 모달은 충전 화면이 맡아요
  const handed = (location.state as Record<string, unknown> | null)?.[TOPUP_NOTICE_KEY]
  if (new URLSearchParams(location.search).get('orderId') || handed)
    return <Navigate to={`/wallet/topup${location.search}`} replace state={location.state} />

  const items = ledger.items

  return (
    <AppFrame>
      <PageHeader title="예치금" back="/mypage" />
      <div className={s.balance}>
        <p className={s.balanceLabel}>남은 예치금</p>
        <p className={s.balanceAmount}>{wallet.data ? won(wallet.data.balance) : '-'}</p>
        <p className={s.balanceHeld}>
          <span>구매 확정을 기다리는 금액</span>
          <b>{wallet.data ? won(wallet.data.heldAmount) : '-'}</b>
        </p>
        <div className={s.balanceActions}>
          <Button to="/wallet/topup" variant="soft" size="sm">
            충전하기
          </Button>
        </div>
      </div>
      {wallet.error && <ErrorView message={wallet.error} onRetry={wallet.reload} />}
      <p className={s.note}>구매가 확정되면 판매자에게 넘어가고, 반품이 승인되면 예치금으로 돌아와요.</p>

      <section aria-labelledby="w-hist" className={s.block}>
        <div className={s.blockHead}>
          <h2 id="w-hist">거래 내역</h2>
          <Link to="/wallet/topups">충전 내역 · 충전 취소 ›</Link>
        </div>
        <Chips
          label="거래 유형"
          items={FILTERS}
          value={filter}
          onChange={setFilter}
        />
        {ledger.loading && !ledger.loaded && <Loading />}
        {ledger.error && <ErrorView message={ledger.error} onRetry={ledger.reload} />}
        {ledger.loaded && items.length === 0 && <Empty title="아직 거래 내역이 없어요" />}
        <ul className={s.ledger}>
          {items.map((t) => (
            <li key={t.transactionId}>
              <span className={s.ledgerMain}>
                <b>{LEDGER_LABEL[t.type] ?? t.type}</b>
                <span>
                  {fmtDateTime(t.createdAt)} · 잔액 {won(t.balanceAfter)}
                </span>
              </span>
              <b className={t.amount > 0 ? s.plus : s.minus}>{signedWon(t.amount)}</b>
            </li>
          ))}
        </ul>
        {ledger.hasMore && (
          <div className={s.more}>
            <Button variant="outline" size="sm" disabled={ledger.loading} onClick={ledger.loadMore}>
              더 보기
            </Button>
          </div>
        )}
      </section>
    </AppFrame>
  )
}
