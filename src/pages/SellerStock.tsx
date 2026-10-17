import { Link, useSearchParams } from 'react-router-dom'
import { NOTICE, makeCx } from '../lib/ui'
import styles from './SellerStock.module.css'
import SellerLayout from '../components/SellerLayout'
import Pager from '../components/Pager'

import { useEffect, useState } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import { adjustStock, getSellerProducts, getStockHistory, type StockChangeType } from '../lib/api/product'
import { useApi } from '../lib/useApi'
import { categoryIcon } from '../lib/products'

const cx = makeCx(styles)

const HISTORY_PAGE_SIZE = 20
/** 상품 선택 목록에 불러올 최대 개수 (백엔드 size 최대 100) */
const PRODUCT_LIMIT = 100

/** 재고 변경 사유 → [칩 색, 이름] */
const CHANGE_TYPE: Record<StockChangeType, [string, string]> = {
  INIT: ['c-mute', '등록'],
  ADJUST: ['c-low', '직접 조정'],
  ORDER_DEDUCT: ['c-blue', '주문'],
  ORDER_RESTORE: ['c-mute', '주문 취소'],
  RETURN_RESTORE: ['c-ok', '반품'],
}

/** 주문 번호가 응답에 없어서 주문 ID로 보여줘요. (백엔드와 협의 중) */
function historyNote(type: StockChangeType, orderId: number | null) {
  const order = orderId != null ? ` · 주문 #${orderId}` : ''
  switch (type) {
    case 'INIT':
      return '상품 등록'
    case 'ADJUST':
      return '판매자가 직접 조정'
    case 'ORDER_DEDUCT':
      return `주문 결제 대기${order}`
    case 'ORDER_RESTORE':
      return `주문 취소·결제 시간 초과${order}`
    case 'RETURN_RESTORE':
      return `반품 승인${order}`
  }
}

/** '2026-10-09T14:06:00' → '10.09 14:06' */
const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 증감 표시. 음수는 진짜 빼기 기호(−)로 써요. */
const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0')

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * 대상 상품은 URL 쿼리(productId, optionId)로 받아요. 상품 관리 목록의 재고 버튼이 이 주소로 보내요.
 */
function useSellerStockView() {
  const [params, setParams] = useSearchParams()
  const productId = Number(params.get('productId')) || null

  const products = useApi(() => getSellerProducts({ size: PRODUCT_LIMIT }), [])
  const all = products.data?.items ?? []
  // 쿼리가 없으면 첫 상품을 보여줘요.
  const product = all.find((p) => p.productId === productId) ?? (productId == null ? all[0] : undefined)
  const optionId = product?.optionId ?? null

  const [historyPage, setHistoryPage] = useState(1)
  const history = useApi(
    () =>
      product && optionId
        ? getStockHistory(product.productId, optionId, { page: toPageParam(historyPage), size: HISTORY_PAGE_SIZE })
        : Promise.resolve(null),
    [product?.productId, optionId, historyPage],
  )

  /** 조정 뒤 서버가 돌려준 재고. 목록을 다시 불러오기 전까지 이 값을 보여줘요. */
  const [stockOverride, setStockOverride] = useState<number | null>(null)
  /** 입력칸 글자 그대로 (빈칸·'-'만 입력한 중간 상태도 둬요) */
  const [deltaText, setDeltaText] = useState('0')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [imgFailed, setImgFailed] = useState(false)

  // 상품을 바꾸면 조정 값과 결과를 지워요.
  useEffect(() => {
    setStockOverride(null)
    setDeltaText('0')
    setError('')
    setDone('')
    setHistoryPage(1)
    setImgFailed(false)
  }, [product?.productId])

  const stock = stockOverride ?? product?.stock ?? 0
  const stopped = product?.status === 'STOPPED'
  const delta = Number(deltaText) || 0
  const after = stock + delta
  const setDelta = (n: number) => setDeltaText(String(n))

  const adjust = async () => {
    if (!product || !optionId || delta === 0 || after < 0 || pending) return
    setPending(true)
    setError('')
    setDone('')
    try {
      const res = await adjustStock(product.productId, optionId, delta)
      setDone(`재고를 ${stock}개에서 ${res.stock}개로 ${delta > 0 ? '늘렸어요' : '줄였어요'}.`)
      setStockOverride(res.stock)
      setDelta(0)
      setHistoryPage(1)
      history.reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const view = {
    loading: products.loading && !products.data,
    loadError: products.error,
    retry: products.reload,
    noProducts: !products.loading && !products.error && all.length === 0,
    notFound: !products.loading && !products.error && all.length > 0 && !product,
    options: all.map((p) => ({
      value: String(p.productId),
      label: p.status === 'STOPPED' ? `${p.name} (판매 중지)` : p.name,
    })),
    selected: product ? String(product.productId) : '',
    pick: (e: { target: { value: string } }) => {
      const p = all.find((x) => String(x.productId) === e.target.value)
      if (p) setParams({ productId: String(p.productId), optionId: String(p.optionId) })
    },
    product,
    // 사진이 없거나 못 불러오면 카테고리 대표 아이콘을 보여줘요.
    img:
      product && product.thumbnailUrl && !imgFailed ? product.thumbnailUrl : categoryIcon(product?.categoryName ?? ''),
    imgIsIcon: !product?.thumbnailUrl || imgFailed,
    imgError: () => setImgFailed(true),
    meta: product
      ? `${product.categoryName}, ${product.status === 'ON_SALE' ? '판매중' : product.status === 'SOLD_OUT' ? '품절' : '판매 중지'}`
      : '',
    stock,
    stopped,
    deltaText: delta > 0 && !deltaText.startsWith('+') ? `+${delta}` : deltaText,
    /** 숫자와 맨 앞의 +·-만 받아요. */
    changeDelta: (e: { target: { value: string } }) => {
      const t = e.target.value.replace(/\s/g, '')
      if (/^[+-]?\d{0,6}$/.test(t)) setDeltaText(t.replace(/^\+/, ''))
    },
    canDec: !stopped && after > 0,
    // 빠르게 여러 번 눌러도 누른 만큼 바뀌도록 직전 값에서 계산해요.
    dec: () => setDeltaText((t) => String(Math.max(-stock, (Number(t) || 0) - 1))),
    inc: () => setDeltaText((t) => String((Number(t) || 0) + 1)),
    tooLow: after < 0,
    after,
    canAdjust: !stopped && !pending && delta !== 0 && after >= 0,
    adjust,
    pending,
    error,
    done,
    rows: (history.data?.items ?? []).map((h) => {
      const [chip, label] = CHANGE_TYPE[h.changeType]
      return {
        id: h.historyId,
        at: fmtDateTime(h.createdAt),
        chip,
        label,
        qty: signed(h.changeQty),
        after: h.stockAfter,
        note: historyNote(h.changeType, h.orderId),
      }
    }),
    historyLoading: history.loading && !history.data,
    historyBusy: history.loading,
    historyError: history.error,
    historyEmpty: !history.loading && !history.error && !!history.data && history.data.items.length === 0,
    historyPage,
    historyTotalPages: history.data?.totalPages ?? 0,
    changeHistoryPage: setHistoryPage,
  }
  return view
}

/** 재고 */
export default function SellerStockPage() {
  const v = useSellerStockView()
  return (
    <div className={styles.page}>
      <SellerLayout active="재고" minHeight={1000}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>재고</h1>
        {v.loading && <p className={cx('sub')}>상품을 불러오고 있어요</p>}
        {v.loadError && (
          <div role="alert" style={{ ...NOTICE, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: '1' }}>상품을 불러오지 못했어요. {v.loadError}</span>
            <button className={cx('btn')} onClick={v.retry}>
              다시 시도
            </button>
          </div>
        )}
        {v.noProducts && (
          <section className={cx('panel')} style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px' }}>재고를 관리할 상품이 아직 없어요.</p>
            <Link className={cx('btn btn-p')} to="/seller/products/new">
              상품 등록하기
            </Link>
          </section>
        )}
        {v.notFound && (
          <section className={cx('panel')} style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px' }}>상품을 찾을 수 없어요. 삭제된 상품일 수 있어요.</p>
            <Link className={cx('btn')} to="/seller/products">
              상품 관리로
            </Link>
          </section>
        )}
        {v.product && (
          <>
            <section
              className={cx('panel')}
              style={{ padding: '24px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center' }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#F4F4F6',
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={v.img}
                  alt=""
                  onError={v.imgError}
                  style={
                    v.imgIsIcon
                      ? { width: '56%', opacity: 0.6 }
                      : { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
                  }
                />
              </div>
              <div style={{ flex: '1 1 240px' }}>
                <select
                  className={cx('in')}
                  aria-label="상품 선택"
                  style={{ fontWeight: '700', minWidth: '280px', maxWidth: '100%' }}
                  value={v.selected}
                  onChange={v.pick}
                >
                  {v.options.map((o) => (
                    <option value={o.value} key={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className={cx('sub')} style={{ marginTop: '6px' }}>
                  {v.meta}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={cx('sub')}>지금 재고</span>
                <div className={cx('num')} style={{ fontSize: '36px', fontWeight: '700', lineHeight: '1.1' }}>
                  {v.stock}개
                </div>
              </div>
            </section>
            <section
              className={cx('panel')}
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>재고 조정</h2>
              {v.stopped ? (
                <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                  판매 중지된 상품은 재고를 바꿀 수 없어요. 아래에서 이력만 볼 수 있어요.
                </p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label htmlFor="delta" style={{ fontSize: '14px', fontWeight: '500' }}>
                        늘리거나 줄일 수량
                      </label>
                      <div className={cx('step')}>
                        <button onClick={v.dec} disabled={!v.canDec} aria-label="줄이기">
                          −
                        </button>
                        <input
                          id="delta"
                          className={cx('num')}
                          inputMode="numeric"
                          value={v.deltaText}
                          aria-describedby="after"
                          onChange={v.changeDelta}
                          style={{
                            width: '64px',
                            border: 'none',
                            textAlign: 'center',
                            font: 'inherit',
                            fontWeight: 500,
                          }}
                        />
                        <button onClick={v.inc} aria-label="늘리기">
                          +
                        </button>
                      </div>
                    </div>
                    <button className={cx('btn btn-p')} onClick={v.adjust} disabled={!v.canAdjust}>
                      {v.pending ? '조정하는 중이에요' : '조정하기'}
                    </button>
                  </div>
                  <p
                    id="after"
                    className={cx('num')}
                    style={{ margin: '0', fontSize: '14px', color: v.tooLow ? '#A33A1F' : undefined }}
                  >
                    {v.tooLow ? (
                      <>
                        지금 재고보다 많이 줄일 수 없어요. 최대 <strong>{v.stock}개</strong>까지 줄일 수 있어요.
                      </>
                    ) : (
                      <>
                        조정한 뒤 재고 <strong>{v.after}개</strong>. 0보다 적게는 줄일 수 없어요.
                      </>
                    )}
                  </p>
                </>
              )}
              {v.done && (
                <p className={cx('done')} role="status">
                  {v.done}
                </p>
              )}
              {v.error && (
                <p role="alert" style={NOTICE}>
                  {v.error}
                </p>
              )}
            </section>
            <section className={cx('panel')} style={{ padding: '8px 20px 12px' }}>
              {v.historyError && (
                <p role="alert" style={{ ...NOTICE, margin: '12px 0' }}>
                  재고 이력을 불러오지 못했어요. {v.historyError}
                </p>
              )}
              <div style={{ overflowX: 'auto', opacity: v.historyBusy ? 0.5 : 1 }} aria-busy={v.historyBusy}>
                <table className={cx('num')}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>일시</th>
                      <th style={{ textAlign: 'left' }}>유형</th>
                      <th style={{ textAlign: 'right' }}>증감</th>
                      <th style={{ textAlign: 'right' }}>변경 후</th>
                      <th style={{ textAlign: 'left' }}>내용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.rows.map((r) => (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'left' }}>{r.at}</td>
                        <td style={{ textAlign: 'left' }}>
                          <span className={cx('chip', r.chip)}>{r.label}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>{r.qty}</td>
                        <td style={{ textAlign: 'right' }}>{r.after}</td>
                        <td style={{ textAlign: 'left' }}>{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {v.historyLoading && (
                  <p className={cx('sub')} style={{ margin: '0', padding: '24px 0', textAlign: 'center' }}>
                    재고 이력을 불러오고 있어요
                  </p>
                )}
                {v.historyEmpty && (
                  <p className={cx('sub')} style={{ margin: '0', padding: '24px 0', textAlign: 'center' }}>
                    아직 재고 이력이 없어요.
                  </p>
                )}
              </div>
              <Pager
                page={v.historyPage}
                totalPages={v.historyTotalPages}
                onChange={v.changeHistoryPage}
                buttonClassName={cx('btn')}
              />
            </section>
          </>
        )}
      </SellerLayout>
    </div>
  )
}
