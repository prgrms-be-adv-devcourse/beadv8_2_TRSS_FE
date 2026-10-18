import { Link, useSearchParams } from 'react-router-dom'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './SellerOrders.module.css'
import SellerLayout from '../components/SellerLayout'
import Pager from '../components/Pager'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { toPageParam } from '../lib/api'
import { getSellerOrderItems, type SellerOrderStatus } from '../lib/api/order'
import { useApi } from '../lib/useApi'
import { SMALL_BTN, fmtDay } from '../lib/admin'

const cx = makeCx(styles)

const PAGE_SIZE = 20

/** 상태 [이름, 칩 색]. 주문 상세(OrderDetail)와 같은 표기예요. */
const STATUS: Record<SellerOrderStatus, [string, string]> = {
  PAID: ['결제 완료', 'c-ok'],
  CONFIRMED: ['구매 확정', 'c-mute'],
  RETURN_REQUESTED: ['반품 요청', 'c-blue'],
  RETURNED: ['반품 완료', 'c-mute'],
}
const STATUS_ORDER: SellerOrderStatus[] = ['PAID', 'CONFIRMED', 'RETURN_REQUESTED', 'RETURNED']

/** 기간 선택지 [쿼리 값, 이름, 몇 개월 전부터 (null이면 전체)] */
const PERIODS: Array<[string, string, number | null]> = [
  ['1m', '최근 1개월', 1],
  ['3m', '최근 3개월', 3],
  ['all', '전체 기간', null],
]
const DEFAULT_PERIOD = '1m'

/** 오늘에서 n개월 전 날짜를 yyyy-MM-dd로 (내 컴퓨터 날짜 기준) */
function monthsAgo(n: number) {
  const d = new Date()
  d.setMonth(d.getMonth() - n)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * 상태·기간·검색어·페이지는 URL 쿼리(status, period, q, page)에 두어서 새로고침해도 그대로예요.
 */
function useSellerOrdersView() {
  const [params, setParams] = useSearchParams()
  const status = STATUS_ORDER.find((s) => s === params.get('status'))
  const period = PERIODS.find((p) => p[0] === params.get('period')) ?? PERIODS.find((p) => p[0] === DEFAULT_PERIOD)!
  const keyword = params.get('q') ?? ''
  const page = Math.max(1, Number(params.get('page')) || 1)

  /** 쿼리 일부를 바꿔요. 값이 없으면 지우고, 조건이 바뀌면 1페이지로 돌아가요. */
  const update = (next: Record<string, string | undefined>, keepPage = false) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v)
        else p.delete(k)
      }
      if (!keepPage) p.delete('page')
      return p
    })
  }

  const [input, setInput] = useState(keyword)
  useEffect(() => setInput(keyword), [keyword])

  const from = period[2] != null ? monthsAgo(period[2]) : undefined
  const list = useApi(
    () =>
      getSellerOrderItems({
        status,
        from,
        keyword: keyword || undefined,
        page: toPageParam(page),
        size: PAGE_SIZE,
      }),
    [status, from, keyword, page],
  )

  const result = list.data
  const rows = (result?.items ?? []).map((it) => {
    const [label, chip] = STATUS[it.status] ?? [it.status, 'c-mute']
    return {
      id: it.orderItemId,
      day: fmtDay(it.orderedAt),
      orderNumber: it.orderNumber,
      productId: it.productId,
      productName: it.productName,
      // 기본 옵션 하나뿐인 상품은 옵션 이름을 따로 보여주지 않아요.
      optionName: it.optionName && it.optionName !== '기본' ? it.optionName : '',
      quantity: it.quantity,
      amount: won(it.lineAmount),
      label,
      chip,
    }
  })

  const filtered = !!status || !!keyword || period[0] !== 'all'
  const view = {
    statusValue: status ?? '',
    statuses: STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s][0] })),
    pickStatus: (e: ChangeEvent<HTMLSelectElement>) => update({ status: e.target.value || undefined }),
    periodValue: period[0],
    periods: PERIODS.map(([value, label]) => ({ value, label })),
    pickPeriod: (e: ChangeEvent<HTMLSelectElement>) =>
      update({ period: e.target.value === DEFAULT_PERIOD ? undefined : e.target.value }),
    input,
    changeInput: (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
    submitSearch: (e: FormEvent) => {
      e.preventDefault()
      update({ q: input.trim() || undefined })
    },
    rows,
    loading: list.loading && !result,
    busy: list.loading,
    error: list.error,
    retry: list.reload,
    empty: !list.loading && !list.error && !!result && rows.length === 0,
    emptyText: keyword
      ? `‘${keyword}’에 맞는 주문 항목이 없어요.`
      : filtered
        ? '이 조건에 맞는 주문 항목이 없어요. 기간이나 상태를 바꿔 보세요.'
        : '아직 들어온 주문이 없어요.',
    page,
    totalPages: result?.totalPages ?? 0,
    changePage: (n: number) => update({ page: n > 1 ? String(n) : undefined }, true),
  }
  return view
}

/** 주문 항목 */
export default function SellerOrdersPage() {
  const v = useSellerOrdersView()
  return (
    <div className={styles.page}>
      <SellerLayout active="주문 항목" minHeight={820}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문 항목</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <select className={cx('in')} aria-label="상태" value={v.statusValue} onChange={v.pickStatus}>
            <option value="">모든 상태</option>
            {v.statuses.map((s) => (
              <option value={s.value} key={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select className={cx('in')} aria-label="기간" value={v.periodValue} onChange={v.pickPeriod}>
            {v.periods.map((p) => (
              <option value={p.value} key={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <form role="search" onSubmit={v.submitSearch} style={{ display: 'flex', flex: '1 1 240px' }}>
            <input
              className={cx('in')}
              aria-label="검색"
              placeholder="주문번호나 상품명"
              value={v.input}
              onChange={v.changeInput}
              maxLength={100}
              style={{ flex: '1' }}
            />
          </form>
        </div>
        {v.error && (
          <div role="alert" style={{ ...NOTICE, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: '1' }}>주문 항목을 불러오지 못했어요. {v.error}</span>
            <button className={cx('btn')} style={SMALL_BTN} onClick={v.retry}>
              다시 시도
            </button>
          </div>
        )}
        <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
          <div style={{ overflowX: 'auto', opacity: v.busy ? 0.5 : 1 }} aria-busy={v.busy}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>주문일</th>
                  <th style={{ textAlign: 'left' }}>주문번호</th>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'right' }}>수량</th>
                  <th style={{ textAlign: 'right' }}>금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {v.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'left' }}>{r.day}</td>
                    <td style={{ textAlign: 'left' }}>{r.orderNumber}</td>
                    <td style={{ textAlign: 'left' }}>
                      <Link to={`/product/${r.productId}`} style={{ color: '#26262C' }}>
                        {r.productName}
                      </Link>
                      {r.optionName && (
                        <span className={cx('sub')} style={{ marginLeft: '6px' }}>
                          {r.optionName}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{r.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{r.amount}원</td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip', r.chip)}>{r.label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.loading && (
              <p className={cx('sub')} style={{ margin: '0', padding: '32px 0', textAlign: 'center' }}>
                주문 항목을 불러오고 있어요
              </p>
            )}
            {v.empty && (
              <p className={cx('sub')} style={{ margin: '0', padding: '32px 0', textAlign: 'center' }}>
                {v.emptyText}
              </p>
            )}
          </div>
        </section>
        <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} buttonClassName={cx('btn')} />
      </SellerLayout>
    </div>
  )
}
