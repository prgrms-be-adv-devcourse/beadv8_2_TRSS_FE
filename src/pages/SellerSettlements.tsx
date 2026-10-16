import { useEffect, useState } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import {
  fmtMonth,
  getMyExpectedSettlement,
  getMySettlement,
  getMySettlements,
  type SellerSettlementDetail,
  type SettlementSellerStatus,
} from '../lib/api/settlement'
import { SMALL_BTN, SMALL_BTN_ON, fmtDay } from '../lib/admin'
import { useApi } from '../lib/useApi'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './SellerSettlements.module.css'
import SellerLayout from '../components/SellerLayout'
import Pager from '../components/Pager'

const cx = makeCx(styles)

const PAGE_SIZE = 12

/** 판매자 정산서 상태 → 칩 색 (글자는 백엔드 statusLabel을 그대로 써요) */
const CHIP: Record<SettlementSellerStatus, string> = {
  SCHEDULED: 'c-blue', // 지급 예정
  PAID: 'c-ok', // 지급 완료
  DELAYED: 'c-low', // 지급 지연
  ON_HOLD: 'c-mute', // 지급 보류
}

/** '2026-11-10' 또는 '2026-10-10T00:12:00' → '11월 10일' */
const fmtMonthDay = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일`

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useSellerSettlementsView() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<SellerSettlementDetail | null>(null)
  const [detailError, setDetailError] = useState('')

  // 화면에 들어올 때 불러오는 API 3개
  const expected = useApi(getMyExpectedSettlement, [])
  const lastPaid = useApi(() => getMySettlements({ status: 'PAID', size: 1 }), [])
  const list = useApi(() => getMySettlements({ page: toPageParam(page), size: PAGE_SIZE }), [page])

  // "자세히"를 누르면 상세를 불러와요. 같은 행을 다시 누르면 닫아요.
  useEffect(() => {
    // 다른 행을 열면 이전 상세를 먼저 지워서, 응답이 오기 전·실패했을 때 남의 상세가 보이지 않게
    setDetail(null)
    setDetailError('')
    if (selectedId === null) return
    let alive = true // 응답이 늦게 와서 다른 행의 상세를 덮어쓰지 않게
    getMySettlement(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  const items = list.data?.items ?? []
  const nextPayDate = expected.data?.months[0]?.expectedPayDate
  const paid = lastPaid.data?.items[0] ?? null

  return {
    // 카드
    expectedPayout: expected.data?.payoutAmount ?? 0, // 수수료를 뺀, 실제로 받을 금액
    expectedFee: expected.data?.totalFee ?? 0,
    nextPayText: nextPayDate ? `${fmtMonthDay(nextPayDate)}에 정산돼요` : '정산 예정 금액이 없어요',
    paidAmount: paid?.payoutAmount ?? 0,
    paidText: paid?.paidAt ? `${fmtMonthDay(paid.paidAt)} 예치금으로 들어왔어요` : '아직 받은 정산금이 없어요',
    cardError: expected.error ?? lastPaid.error,
    // 목록
    items,
    loading: list.loading,
    listError: list.error,
    listEmpty: !list.loading && !list.error && items.length === 0,
    page,
    changePage: (next: number) => {
      setPage(next)
      setSelectedId(null)
    },
    totalPages: list.data?.totalPages ?? 0,
    // 상세
    selectedId,
    toggleDetail: (id: number) => setSelectedId((cur) => (cur === id ? null : id)),
    detail,
    detailError,
  }
}

/** 정산 */
export default function SellerSettlementsPage() {
  const v = useSellerSettlementsView()
  const d = v.detail
  return (
    <div className={styles.page}>
      <SellerLayout active="정산" minHeight={1100}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>정산</h1>
        {v.cardError && (
          <p role="alert" style={NOTICE}>
            {v.cardError}
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              정산 예정 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
              {won(v.expectedPayout)}원
            </div>
            <span className={cx('sub')}>{v.nextPayText}</span>
          </section>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              예상 수수료 10%
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
              {won(v.expectedFee)}원
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '24px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              최근 받은 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '30px', fontWeight: '700', color: '#8A6A2C' }}>
              {won(v.paidAmount)}원
            </div>
            <span className={cx('sub')}>{v.paidText}</span>
          </section>
        </div>
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>월별 정산서</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>정산월</th>
                  <th style={{ textAlign: 'right' }}>판매 금액</th>
                  <th style={{ textAlign: 'right' }}>수수료</th>
                  <th style={{ textAlign: 'right' }}>받는 금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'left' }}>지급일</th>
                  <th style={{ textAlign: 'left' }}></th>
                </tr>
              </thead>
              <tbody>
                {v.loading && v.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      불러오는 중이에요.
                    </td>
                  </tr>
                )}
                {v.listEmpty && (
                  <tr>
                    <td colSpan={7} className={cx('sub')} style={{ textAlign: 'center', padding: '32px 0' }}>
                      아직 정산서가 없어요. 매달 10일에 지난달 구매 확정분으로 만들어져요.
                    </td>
                  </tr>
                )}
                {v.items.map((s) => {
                  const open = v.selectedId === s.settlementId
                  return (
                    <tr key={s.settlementId} style={open ? { background: '#F3F1F6' } : undefined}>
                      <td style={{ textAlign: 'left' }}>{fmtMonth(s.settlementMonth)}</td>
                      <td style={{ textAlign: 'right' }}>{won(s.totalSalePrice)}원</td>
                      <td style={{ textAlign: 'right' }}>{won(s.totalFee)}원</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{won(s.payoutAmount)}원</strong>
                      </td>
                      <td style={{ textAlign: 'left' }}>
                        <span className={cx('chip', CHIP[s.status])}>{s.statusLabel}</span>
                      </td>
                      <td style={{ textAlign: 'left' }}>{s.paidAt ? fmtDay(s.paidAt) : ''}</td>
                      <td style={{ textAlign: 'left' }}>
                        <button
                          className={cx('btn')}
                          style={open ? SMALL_BTN_ON : SMALL_BTN}
                          aria-expanded={open}
                          onClick={() => v.toggleDetail(s.settlementId)}
                        >
                          {open ? '닫기' : '자세히'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {v.listError && (
            <p role="alert" style={{ ...NOTICE, marginTop: '12px' }}>
              {v.listError}
            </p>
          )}
          <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} buttonClassName={cx('btn')} />
        </section>
        {v.detailError && (
          <p role="alert" style={NOTICE}>
            {v.detailError}
          </p>
        )}
        {d && (
          <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
                {fmtMonth(d.settlement.settlementMonth)} 정산서 · 품목 {d.items.length}개
              </h2>
              <span className={cx('num')}>
                받는 금액 <strong>{won(d.settlement.payoutAmount)}원</strong>
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className={cx('num')}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left' }}>구매 확정일</th>
                    <th style={{ textAlign: 'left' }}>주문번호</th>
                    <th style={{ textAlign: 'right' }}>판매 금액</th>
                    <th style={{ textAlign: 'right' }}>수수료</th>
                    <th style={{ textAlign: 'right' }}>받는 금액</th>
                    <th style={{ textAlign: 'left' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {d.items.map((it) => (
                    <tr key={it.orderItemId}>
                      <td style={{ textAlign: 'left' }}>{fmtDay(it.confirmedAt)}</td>
                      <td style={{ textAlign: 'left' }}>#{it.orderId}</td>
                      <td style={{ textAlign: 'right' }}>{won(it.salePrice)}원</td>
                      <td style={{ textAlign: 'right' }}>{won(it.fee)}원</td>
                      <td style={{ textAlign: 'right' }}>{won(it.payoutAmount)}원</td>
                      <td style={{ textAlign: 'left' }}>
                        {it.carriedOver && (
                          <span className={cx('chip c-mute')}>{fmtMonth(it.settlementMonth)} 이월</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={cx('sub')} style={{ margin: '12px 0 0' }}>
              이월 표시는 지난달 정산서가 만들어진 뒤에 구매 확정되어 이번 정산서에 들어온 품목이에요.
            </p>
          </section>
        )}
      </SellerLayout>
    </div>
  )
}
