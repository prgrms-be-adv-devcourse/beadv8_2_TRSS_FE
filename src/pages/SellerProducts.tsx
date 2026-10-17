import { Link, useSearchParams } from 'react-router-dom'
import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './SellerProducts.module.css'
import SellerLayout from '../components/SellerLayout'
import Pager from '../components/Pager'

import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import {
  deleteProduct,
  getSellerProductCounts,
  getSellerProducts,
  requestProductStop,
  type ProductDisplayStatus,
  type ProductStoppedBy,
  type SellerProductSummary,
} from '../lib/api/product'
import { useApi } from '../lib/useApi'
import { SMALL_BTN, SMALL_BTN_ON } from '../lib/admin'

const cx = makeCx(styles)

const PAGE_SIZE = 20
/** 판매 중지 요청 사유 최대 길이 (백엔드 @Size(max = 300)) */
const REASON_MAX = 300

/** [탭 이름, 상태 필터, counts 키] */
const TABS: Array<[string, ProductDisplayStatus | undefined, 'all' | 'onSale' | 'soldOut' | 'stopped']> = [
  ['전체', undefined, 'all'],
  ['판매중', 'ON_SALE', 'onSale'],
  ['품절', 'SOLD_OUT', 'soldOut'],
  ['판매 중지', 'STOPPED', 'stopped'],
]

const STATUS_CHIP: Record<ProductDisplayStatus, [string, string]> = {
  ON_SALE: ['c-ok', '판매중'],
  SOLD_OUT: ['c-mute', '품절'],
  STOPPED: ['c-mute', '판매 중지'],
}

const STOPPED_BY: Record<ProductStoppedBy, string> = {
  ADMIN: '관리자가 중지했어요.',
  SELLER_REQUEST: '중지 요청이 승인됐어요.',
  SELLER_WITHDRAWN: '판매자 철회·제재로 중지됐어요.',
}

/** 열려 있는 확인 패널: 판매 중지 요청 또는 삭제 */
type Action = { kind: 'stop' | 'delete'; product: SellerProductSummary }

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * 탭·검색어·페이지는 URL 쿼리(status, q, page)에 두어서 재고 화면에 다녀와도 그대로예요.
 */
function useSellerProductsView() {
  const [params, setParams] = useSearchParams()
  const status = TABS.find((t) => t[1] === params.get('status'))?.[1]
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

  const list = useApi(
    () => getSellerProducts({ status, keyword: keyword || undefined, page: toPageParam(page), size: PAGE_SIZE }),
    [status, keyword, page],
  )
  const counts = useApi(() => getSellerProductCounts(keyword || undefined), [keyword])

  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState('')

  const open = (kind: Action['kind'], product: SellerProductSummary) => {
    setAction({ kind, product })
    setReason('')
    setActionError('')
    setDone('')
  }
  const close = () => setAction(null)

  /** 패널의 확인 버튼. 성공하면 목록과 탭 개수를 다시 불러와요. */
  const confirm = async () => {
    if (!action || pending) return
    setPending(true)
    setActionError('')
    try {
      if (action.kind === 'stop') {
        await requestProductStop(action.product.productId, reason.trim())
        setDone(`‘${action.product.name}’ 판매 중지를 요청했어요. 관리자가 승인할 때까지는 계속 판매돼요.`)
      } else {
        await deleteProduct(action.product.productId)
        setDone(`‘${action.product.name}’을(를) 삭제했어요.`)
      }
      setAction(null)
      list.reload()
      counts.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const result = list.data
  const rows = (result?.items ?? []).map((p) => {
    const stopped = p.status === 'STOPPED'
    const [chip, label] = STATUS_CHIP[p.status]
    return {
      id: p.productId,
      name: p.name,
      category: p.categoryName,
      price: won(p.price),
      stock: p.stock,
      noStock: p.stock === 0,
      chip,
      label,
      stopped,
      stopPending: p.stopRequestPending,
      stoppedNote: stopped
        ? [p.stoppedBy ? STOPPED_BY[p.stoppedBy] : '판매가 중지됐어요.', p.stoppedReason && `사유: ${p.stoppedReason}`]
            .filter(Boolean)
            .join(' ')
        : '',
      editTo: `/seller/products/${p.productId}/edit`,
      stockTo: `/seller/stock?productId=${p.productId}&optionId=${p.optionId}`,
      // 판매 중지 상품은 삭제·중지 요청 불가, 중지 요청 심사 중이면 중지 요청 불가
      canStop: !stopped && !p.stopRequestPending,
      canDelete: !stopped && !p.stopRequestPending,
      openStop: () => open('stop', p),
      openDelete: () => open('delete', p),
    }
  })

  const c = counts.data
  const reasonTrim = reason.trim()
  const view = {
    tabs: TABS.map(([name, value, key]) => ({
      label: c ? `${name} ${c[key].toLocaleString('ko-KR')}` : name,
      on: value === status,
      pick: () => update({ status: value }),
    })),
    input,
    changeInput: (e: { target: { value: string } }) => setInput(e.target.value),
    submitSearch: (e: FormEvent) => {
      e.preventDefault()
      update({ q: input.trim() || undefined })
    },
    rows,
    loading: list.loading && !result,
    busy: list.loading,
    error: list.error,
    retry: () => {
      list.reload()
      counts.reload()
    },
    empty: !list.loading && !list.error && !!result && rows.length === 0,
    emptyText: keyword
      ? `‘${keyword}’에 맞는 상품이 없어요.`
      : status
        ? '이 상태의 상품이 없어요.'
        : '아직 등록한 상품이 없어요.',
    page,
    totalPages: result?.totalPages ?? 0,
    changePage: (n: number) => update({ page: n > 1 ? String(n) : undefined }, true),
    action,
    reason,
    changeReason: (e: { target: { value: string } }) => setReason(e.target.value.slice(0, REASON_MAX)),
    reasonCount: `${reason.length}/${REASON_MAX}`,
    canConfirm: !pending && (action?.kind !== 'stop' || reasonTrim.length > 0),
    pending,
    actionError,
    confirm,
    close,
    done,
  }
  return view
}

/** 상품 관리 */
export default function SellerProductsPage() {
  const v = useSellerProductsView()
  return (
    <div className={styles.page}>
      <SellerLayout active="상품 관리" minHeight={1100}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>상품 관리</h1>
          <Link className={cx('btn btn-p')} to="/seller/products/new">
            상품 등록하기
          </Link>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {v.tabs.map((t) => (
            <button
              className={cx('btn')}
              style={t.on ? SMALL_BTN_ON : SMALL_BTN}
              aria-pressed={t.on}
              onClick={t.pick}
              key={t.label}
            >
              {t.label}
            </button>
          ))}
          <form role="search" onSubmit={v.submitSearch} style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <input
              className={cx('in')}
              aria-label="상품명 검색"
              placeholder="상품명으로 찾기"
              value={v.input}
              onChange={v.changeInput}
              maxLength={100}
              style={{ minWidth: '240px' }}
            />
          </form>
        </div>
        {v.done && (
          <p className={cx('done')} role="status">
            {v.done}
          </p>
        )}
        {v.error && (
          <div role="alert" style={{ ...NOTICE, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: '1' }}>상품 목록을 불러오지 못했어요. {v.error}</span>
            <button className={cx('btn')} style={SMALL_BTN} onClick={v.retry}>
              다시 시도
            </button>
          </div>
        )}
        <section className={cx('panel')} style={{ padding: '8px 20px' }}>
          <div style={{ overflowX: 'auto', position: 'relative', opacity: v.busy ? 0.5 : 1 }} aria-busy={v.busy}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>카테고리</th>
                  <th style={{ textAlign: 'left' }}>가격</th>
                  <th style={{ textAlign: 'left' }}>재고</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'right' }} aria-label="관리"></th>
                </tr>
              </thead>
              <tbody>
                {v.rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'left' }}>
                      {r.stopped ? (
                        <span style={{ fontWeight: '500' }}>{r.name}</span>
                      ) : (
                        <Link to={r.editTo} style={{ color: '#26262C', fontWeight: '500' }}>
                          {r.name}
                        </Link>
                      )}
                    </td>
                    <td style={{ textAlign: 'left' }}>{r.category}</td>
                    <td style={{ textAlign: 'left' }}>{r.price}원</td>
                    <td style={{ textAlign: 'left' }}>
                      <span style={r.noStock ? { color: '#A33A1F', fontWeight: '700' } : undefined}>{r.stock}</span>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip', r.chip)}>{r.label}</span>
                      {r.stopPending && (
                        <>
                          {' '}
                          <span className={cx('chip c-low')}>중지 요청 심사 중</span>
                        </>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.stopped ? (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <span className={cx('sub')}>{r.stoppedNote}</span>
                          <Link className={cx('btn btn-q')} to={r.stockTo} style={SMALL_BTN}>
                            재고 이력
                          </Link>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <Link className={cx('btn')} to={r.editTo} style={SMALL_BTN}>
                            수정
                          </Link>
                          <Link className={cx('btn')} to={r.stockTo} style={SMALL_BTN}>
                            재고
                          </Link>
                          {r.canStop && (
                            <button className={cx('btn')} onClick={r.openStop} style={SMALL_BTN}>
                              판매 중지 요청
                            </button>
                          )}
                          {r.canDelete && (
                            <button className={cx('btn btn-q')} onClick={r.openDelete} style={SMALL_BTN}>
                              삭제
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.loading && (
              <p className={cx('sub')} style={{ margin: '0', padding: '32px 0', textAlign: 'center' }}>
                상품을 불러오고 있어요
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
        {v.action && (
          <section
            className={cx('panel')}
            role="dialog"
            aria-labelledby="action-title"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              maxWidth: '560px',
              outline: '2px solid #8A6A2C',
            }}
          >
            <h2 id="action-title" style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
              {v.action.kind === 'stop' ? '판매 중지를 요청할까요?' : '상품을 삭제할까요?'}
            </h2>
            <p style={{ margin: '0', color: '#45454F' }}>{v.action.product.name}</p>
            {v.action.kind === 'stop' ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="rs" style={{ fontSize: '14px', fontWeight: '500' }}>
                    사유 (필수)
                  </label>
                  <textarea
                    id="rs"
                    className={cx('in')}
                    style={{ minHeight: '96px', padding: '12px 14px' }}
                    placeholder="예: 재료 수급이 어려워 판매를 멈추려고 해요."
                    value={v.reason}
                    onChange={v.changeReason}
                    autoFocus
                  ></textarea>
                  <span className={cx('sub num')} style={{ alignSelf: 'flex-end' }}>
                    {v.reasonCount}
                  </span>
                </div>
                <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                  관리자가 승인하면 판매가 멈추고, 결제를 기다리는 주문은 취소돼요. 한 번 중지된 상품은 다시 판매할 수
                  없어요.
                </p>
              </>
            ) : (
              <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                삭제한 상품은 목록과 구매자 화면에서 사라지고 되돌릴 수 없어요. 이미 받은 주문에는 영향이 없어요.
              </p>
            )}
            {v.actionError && (
              <p role="alert" style={NOTICE}>
                {v.actionError}
              </p>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className={cx('btn')} onClick={v.close} disabled={v.pending}>
                닫기
              </button>
              <button className={cx('btn btn-p')} onClick={v.confirm} disabled={!v.canConfirm}>
                {v.pending ? '처리 중이에요' : v.action.kind === 'stop' ? '중지 요청하기' : '삭제하기'}
              </button>
            </div>
          </section>
        )}
      </SellerLayout>
    </div>
  )
}
