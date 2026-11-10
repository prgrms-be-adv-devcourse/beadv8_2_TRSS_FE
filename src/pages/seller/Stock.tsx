import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Thumb } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  adjustStock,
  getSellerProducts,
  getStockHistory,
  type SellerProductSummary,
  type StockChangeType,
} from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, PRODUCT_STATUS, Pager, fmtMDHM, signed, useQueryState } from './shared'
import s from './seller.module.css'
import st from './Stock.module.css'

const HISTORY_PAGE_SIZE = 20
/** 상품 선택 목록에 불러올 최대 개수 (백엔드 size 최대 100) */
const PRODUCT_LIMIT = 100
const OPT_COLS = '1fr .7fr .7fr 1.3fr 1.3fr .8fr'
const HIST_COLS = '1fr 1fr 1.4fr .6fr .7fr'
/** 지금은 상품마다 기본 옵션 1개라 옵션 이름을 '기본'으로 보여줘요. */
const BASE_OPTION = '기본'

const CHANGE_TYPE: Record<StockChangeType, string> = {
  INIT: '상품 등록',
  ADJUST: '판매자 조정',
  ORDER_DEDUCT: '주문',
  ORDER_RESTORE: '주문 취소',
  RETURN_RESTORE: '반품 복원',
}
const orderNote = (orderId: number | null) => (orderId != null ? ` · 주문 #${orderId}` : '')

/**
 * S3 재고 (옵션별)
 * 대상 상품은 URL 쿼리(productId)로 받아요. 상품 관리 목록의 재고 버튼이 이 주소로 보내요.
 * TODO(API 미구현): 옵션 그룹 구조 — 지금 백엔드는 상품마다 기본 옵션 1개라 옵션 표에 한 줄만 보여요.
 */
export default function SellerStockPage() {
  const desktop = useIsDesktop()
  const { params, update } = useQueryState()
  const productId = Number(params.get('productId')) || null

  const products = useApi(() => getSellerProducts({ size: PRODUCT_LIMIT }), [])
  const all = products.data?.items ?? []
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

  /** 입력칸 글자 그대로 (빈칸·'-'만 입력한 중간 상태도 둬요) */
  const [deltaText, setDeltaText] = useState('0')
  // TODO(API 미구현): 재고 조정 사유 — stock-adjustments API는 changeQty만 받아서 사유는 보내지 않아요.
  const [memo, setMemo] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  useEffect(() => {
    setDeltaText('0')
    setMemo('')
    setError('')
    setDone('')
    setHistoryPage(1)
  }, [product?.productId])

  const stock = product?.stock ?? 0
  const stopped = product?.status === 'STOPPED'
  const delta = Number(deltaText) || 0
  const after = stock + delta
  const tooLow = after < 0
  const canAdjust = !!product && !stopped && !pending && delta !== 0 && !tooLow

  const changeDelta = (v: string) => {
    const t = v.replace(/\s/g, '')
    if (/^[+-]?\d{0,6}$/.test(t)) setDeltaText(t.replace(/^\+/, ''))
  }
  // 빠르게 여러 번 눌러도 누른 만큼 바뀌도록 직전 값에서 계산해요.
  const dec = () => setDeltaText((t) => String(Math.max(-stock, (Number(t) || 0) - 1)))
  const inc = () => setDeltaText((t) => String((Number(t) || 0) + 1))
  const shownDelta = delta > 0 && !deltaText.startsWith('+') ? `+${delta}` : deltaText

  async function adjust() {
    if (!product || !optionId || !canAdjust) return
    setPending(true)
    setError('')
    setDone('')
    try {
      const res = await adjustStock(product.productId, optionId, delta)
      setDone(`재고를 ${stock}개에서 ${res.stock}개로 ${delta > 0 ? '늘렸어요' : '줄였어요'}.`)
      // 목록의 재고도 바로 바꿔요 (재고가 0이 되면 품절, 다시 채우면 판매중)
      products.setData((d) =>
        d
          ? {
              ...d,
              items: d.items.map(
                (p): SellerProductSummary =>
                  p.productId === product.productId
                    ? {
                        ...p,
                        stock: res.stock,
                        status: p.status === 'STOPPED' ? p.status : res.stock > 0 ? 'ON_SALE' : 'SOLD_OUT',
                      }
                    : p,
              ),
            }
          : d,
      )
      setDeltaText('0')
      setMemo('')
      setHistoryPage(1)
      history.reload()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  const pick = (id: number) => update({ productId: String(id) })
  const stateBadge = product ? (
    <Badge tone={PRODUCT_STATUS[product.status][1]}>{PRODUCT_STATUS[product.status][0]}</Badge>
  ) : null

  const stepper = (
    <span className={st.step}>
      <button type="button" onClick={dec} disabled={stopped || after <= 0} aria-label="줄이기">
        −
      </button>
      <input
        aria-label="조정 수량"
        inputMode="numeric"
        value={shownDelta}
        onChange={(e) => changeDelta(e.target.value)}
        disabled={stopped}
        aria-describedby="stock-after"
      />
      <button type="button" onClick={inc} disabled={stopped} aria-label="늘리기">
        +
      </button>
    </span>
  )
  const afterLine = stopped ? (
    <p id="stock-after" className={s.faintLine}>
      판매 중지된 상품은 재고를 바꿀 수 없어요. 이력만 볼 수 있어요.
    </p>
  ) : (
    <p id="stock-after" className={`${st.after} ${tooLow ? s.danger : ''}`}>
      {tooLow ? (
        <>
          지금 재고보다 많이 줄일 수 없어요. 최대 <b>{stock}개</b>까지 줄일 수 있어요.
        </>
      ) : (
        <>
          조정하면 <b>{after}개</b>가 돼요. 0 아래로는 내려가지 않아요.
        </>
      )}
    </p>
  )
  const results = (
    <>
      {done && <Notice onClose={() => setDone('')}>{done}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
    </>
  )

  const hist = history.data?.items ?? []
  const historyBlock = (
    <>
      {history.error && <ErrorView message={`재고 이력을 불러오지 못했어요. ${history.error}`} onRetry={history.reload} />}
      {history.loading && !history.data && <Loading label="재고 이력을 불러오고 있어요" />}
      {!history.loading && !history.error && history.data && hist.length === 0 && <Empty title="아직 재고 이력이 없어요" />}
      {hist.length > 0 &&
        (desktop ? (
          <div role="table" className={c.table} aria-busy={history.loading}>
            <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: HIST_COLS }}>
              <span>일시</span>
              <span>옵션</span>
              <span>사유</span>
              <span>변동</span>
              <span>변경 후</span>
            </div>
            {hist.map((h) => (
              <div role="row" key={h.historyId} className={c.tr} style={{ gridTemplateColumns: HIST_COLS }}>
                <span className={c.num}>{fmtMDHM(h.createdAt)}</span>
                <span>{BASE_OPTION}</span>
                <span>
                  {CHANGE_TYPE[h.changeType]}
                  {orderNote(h.orderId)}
                </span>
                <span className={c.num}>
                  <b className={h.changeQty < 0 ? s.danger : st.plus}>{signed(h.changeQty)}</b>
                </span>
                <span className={c.num}>{h.stockAfter}개</span>
              </div>
            ))}
          </div>
        ) : (
          <ul className={st.hist}>
            {hist.map((h) => (
              <li key={h.historyId}>
                <span className={st.histMain}>
                  <b>{CHANGE_TYPE[h.changeType]}</b>
                  <span className={s.faint}>
                    {BASE_OPTION} · {fmtMDHM(h.createdAt)}
                    {orderNote(h.orderId)}
                  </span>
                </span>
                <b className={h.changeQty < 0 ? s.danger : st.plus}>{signed(h.changeQty)}</b>
                <span className={s.faint}>→ {h.stockAfter}개</span>
              </li>
            ))}
          </ul>
        ))}
      <Pager page={historyPage} totalPages={history.data?.totalPages ?? 0} onChange={setHistoryPage} />
    </>
  )

  let content
  if (products.loading && !products.data) content = <Loading label="상품을 불러오고 있어요" />
  else if (products.error)
    content = <ErrorView message={`상품을 불러오지 못했어요. ${products.error}`} onRetry={products.reload} />
  else if (all.length === 0)
    content = (
      <Empty
        title="재고를 관리할 상품이 아직 없어요"
        action={
          <Button size="sm" to="/seller/products/new">
            상품 등록하기
          </Button>
        }
      />
    )
  else if (!product)
    content = (
      <Empty
        title="상품을 찾을 수 없어요"
        action={
          <Button variant="outline" size="sm" to="/seller/products">
            상품 관리로
          </Button>
        }
      >
        삭제된 상품일 수 있어요.
      </Empty>
    )
  else if (desktop)
    content = (
      <div className={st.pc}>
        <section className={st.side} aria-label="상품">
          <p className={st.sideTitle}>상품</p>
          {all.map((p) => (
            <Link
              key={p.productId}
              to={`/seller/stock?productId=${p.productId}`}
              replace
              aria-current={p.productId === product.productId ? 'true' : undefined}
              className={`${st.sideItem} ${p.productId === product.productId ? st.sideOn : ''}`}
            >
              <Thumb src={p.thumbnailUrl} width={36} height={40} radius={6} />
              <span className={s.prodText}>
                <b className={c.ellipsis}>{p.name}</b>
                <span className={s.faint}>
                  {p.stock}개{p.status === 'SOLD_OUT' ? ' · 품절' : p.status === 'STOPPED' ? ' · 판매 중지' : ''}
                </span>
              </span>
            </Link>
          ))}
        </section>
        <div className={s.stack}>
          <div role="table" className={c.table}>
            <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: OPT_COLS }}>
              <span>옵션</span>
              <span>지금 재고</span>
              <span>상태</span>
              <span>증감</span>
              <span>사유</span>
              <span />
            </div>
            <div role="row" className={c.tr} style={{ gridTemplateColumns: OPT_COLS }}>
              <span className={c.strong}>{BASE_OPTION}</span>
              <span className={c.num}>
                <b>{stock}개</b>
              </span>
              <span>{stateBadge}</span>
              <span>{stepper}</span>
              <span>
                <input
                  aria-label="조정 사유"
                  className={st.memo}
                  placeholder="예: 입고"
                  value={memo}
                  maxLength={50}
                  disabled={stopped}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </span>
              <span>
                <Button size="sm" onClick={adjust} disabled={!canAdjust}>
                  {pending ? '조정 중' : '조정하기'}
                </Button>
              </span>
            </div>
          </div>
          {afterLine}
          {results}
          <h2 className={s.h2}>변경 내역</h2>
          {historyBlock}
        </div>
      </div>
    )
  else
    content = (
      <>
        <div className={st.pickBox}>
          <label className={st.pick}>
            <Thumb src={product.thumbnailUrl} width={52} height={56} />
            <span className={st.pickText}>
              <span className={s.faint}>상품 선택</span>
              <select aria-label="상품 선택" value={product.productId} onChange={(e) => pick(Number(e.target.value))}>
                {all.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.status === 'STOPPED' ? `${p.name} (판매 중지)` : p.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <p className={st.pickMeta}>
            {product.categoryName} · 전체 재고 <b>{stock}개</b>
          </p>
        </div>
        <section className={st.mSection} aria-labelledby="opts">
          <h2 id="opts" className={s.h2}>
            옵션별 재고
          </h2>
          <div role="radiogroup" aria-label="조정할 옵션" className={st.opts}>
            <button type="button" role="radio" aria-checked="true" className={`${st.opt} ${st.optOn}`}>
              <span className={st.radio} />
              <span className={st.optName}>{BASE_OPTION}</span>
              {stateBadge}
              <b>{stock}개</b>
            </button>
          </div>
        </section>
        <section className={st.mSection} aria-labelledby="adj">
          <h2 id="adj" className={s.h2}>
            재고 조정 <span className={s.faint}>· {BASE_OPTION}</span>
          </h2>
          <div className={st.adjRow}>
            {stepper}
            <Button onClick={adjust} disabled={!canAdjust}>
              {pending ? '조정하는 중' : '조정하기'}
            </Button>
          </div>
          {afterLine}
          {results}
        </section>
        <section className={st.mSection} aria-labelledby="hist">
          <h2 id="hist" className={s.h2}>
            변경 내역
          </h2>
          {historyBlock}
        </section>
      </>
    )

  return (
    <ConsoleShell
      variant="seller"
      active="stock"
      title="재고"
      description="재고는 증감량으로만 바꿀 수 있어요. 0 아래로는 내려가지 않아요."
    >
      {content}
    </ConsoleShell>
  )
}
