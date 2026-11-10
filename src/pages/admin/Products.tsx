import { useEffect, useState, type FormEvent } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import { Badge, Empty, ErrorView, Loading, Segment, Thumb, won, type Tone } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import Icon from '../../components/ui/Icon'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  approveStopRequest,
  createCategory,
  getAdminCategories,
  getAdminProducts,
  getAdminStopRequests,
  modifyCategory,
  rejectStopRequest,
  stopProductByAdmin,
  type AdminCategoryNode,
  type AdminProductStatus,
  type AdminProductStopRequest,
  type AdminProductSummary,
  type ProductStoppedBy,
} from '../../lib/api/product'
import { getAdminSellers } from '../../lib/api/member'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, Pager, ReasonField, fmtDay } from './shared'
import s from './admin.module.css'

const PRODUCT_PAGE_SIZE = 20
const REQUEST_PAGE_SIZE = 10
/** 판매자 상호명을 맞추려고 불러오는 최대 판매자 수 (백엔드 size 최대 100) */
const SELLER_LIMIT = 100
/** 중지·반려 사유 최대 길이 (백엔드 @Size(max = 300)) */
const REASON_MAX = 300
/** 카테고리 이름 최대 길이 (백엔드 @Size(max = 50)) */
const CATEGORY_NAME_MAX = 50
const COLS = { gridTemplateColumns: '2fr 1fr 1.1fr .8fr .5fr .8fr .9fr' }

const STATUS: Record<AdminProductStatus, [string, Tone]> = {
  ON_SALE: ['판매중', 'green'],
  SOLD_OUT: ['품절', 'neutral'],
  STOPPED: ['판매 중지', 'red'],
  DELETED: ['삭제됨', 'neutral'],
}
const STATUS_ORDER: AdminProductStatus[] = ['ON_SALE', 'SOLD_OUT', 'STOPPED', 'DELETED']
const STOPPED_BY: Record<ProductStoppedBy, string> = {
  ADMIN: '관리자가 중지',
  SELLER_REQUEST: '판매자 요청으로 중지',
  SELLER_WITHDRAWN: '판매자 철회·제재로 중지',
}

/** 열려 있는 확인 모달 */
type Action =
  | { kind: 'approve'; request: AdminProductStopRequest }
  | { kind: 'reject'; request: AdminProductStopRequest }
  | { kind: 'stop'; product: AdminProductSummary }

/** 판매중·품절 상품만 즉시 중지할 수 있어요 */
const canStop = (p: AdminProductSummary) => p.status === 'ON_SALE' || p.status === 'SOLD_OUT'
const stoppedNote = (p: AdminProductSummary) =>
  p.status === 'STOPPED' ? [p.stoppedBy ? STOPPED_BY[p.stoppedBy] : '', p.stoppedReason].filter(Boolean).join(' · ') : ''

function useProductsView() {
  // ── 판매자 상호명 (응답에 sellerId만 있어서 관리자 판매자 목록으로 맞춰요)
  const sellers = useApi(() => getAdminSellers({ size: SELLER_LIMIT }), [])
  const sellerName = (id: number) =>
    sellers.data?.sellers.items.find((x) => x.sellerId === id)?.businessName ?? `판매자 #${id}`

  // ── 판매 중지 요청 (심사 중)
  const [requestPage, setRequestPage] = useState(1)
  const requests = useApi(
    () => getAdminStopRequests({ page: toPageParam(requestPage), size: REQUEST_PAGE_SIZE }),
    [requestPage],
  )

  // ── 전체 상품
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [sellerId, setSellerId] = useState<number | undefined>()
  const [status, setStatus] = useState<AdminProductStatus | undefined>()
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [productPage, setProductPage] = useState(1)
  const products = useApi(
    () =>
      getAdminProducts({
        keyword: keyword || undefined,
        sellerId,
        status,
        categoryId,
        page: toPageParam(productPage),
        size: PRODUCT_PAGE_SIZE,
      }),
    [keyword, sellerId, status, categoryId, productPage],
  )
  /** 필터를 바꾸면 1페이지로 돌아가요. */
  const filter = (apply: () => void) => {
    apply()
    setProductPage(1)
  }

  // ── 카테고리
  const categories = useApi(getAdminCategories, [])

  // ── 요청 승인·반려, 즉시 중지 모달
  const [action, setAction] = useState<Action | null>(null)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState('')
  const [done, setDone] = useState('')

  const open = (next: Action) => {
    setAction(next)
    setReason('')
    setActionError('')
    setDone('')
  }

  const confirm = async () => {
    if (!action || pending) return
    setPending(true)
    setActionError('')
    try {
      if (action.kind === 'approve') {
        await approveStopRequest(action.request.requestId)
        setDone(`‘${action.request.productName}’ 판매 중지 요청을 승인했어요. 판매가 멈췄어요.`)
      } else if (action.kind === 'reject') {
        await rejectStopRequest(action.request.requestId, reason.trim())
        setDone(`‘${action.request.productName}’ 판매 중지 요청을 반려했어요. 계속 판매돼요.`)
      } else {
        await stopProductByAdmin(action.product.productId, reason.trim())
        setDone(`‘${action.product.name}’ 판매를 바로 중지했어요.`)
      }
      setAction(null)
      // 즉시 중지는 심사 중인 요청도 닫으니 두 목록을 함께 다시 불러와요.
      requests.reload()
      products.reload()
    } catch (e) {
      setActionError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }

  // ── 카테고리 추가·이름 바꾸기·숨기기
  const [newParentId, setNewParentId] = useState<number | null>(null)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [catPending, setCatPending] = useState(false)
  const [catError, setCatError] = useState('')
  const [catDone, setCatDone] = useState('')

  // 대분류가 처음 불러와지면 추가 폼의 기본 대분류로 골라 둬요.
  useEffect(() => {
    if (newParentId == null && categories.data?.length) setNewParentId(categories.data[0].categoryId)
  }, [categories.data, newParentId])

  const runCategory = async (work: () => Promise<unknown>, message: string) => {
    if (catPending) return false
    setCatPending(true)
    setCatError('')
    setCatDone('')
    try {
      await work()
      setCatDone(message)
      categories.reload()
      return true
    } catch (e) {
      setCatError(errorMessage(e))
      return false
    } finally {
      setCatPending(false)
    }
  }

  const submitNew = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || !newParentId) return
    const ok = await runCategory(
      () => createCategory({ name, parentId: newParentId }),
      `소분류 ‘${name}’을(를) 추가했어요.`,
    )
    if (ok) setNewName('')
  }

  const submitRename = async (e: FormEvent, categoryId: number, before: string) => {
    e.preventDefault()
    const name = editName.trim()
    if (!name) return
    if (name === before) return setEditingId(null)
    const ok = await runCategory(
      () => modifyCategory(categoryId, { name }),
      `‘${before}’을(를) ‘${name}’(으)로 바꿨어요.`,
    )
    if (ok) setEditingId(null)
  }

  const toggleCategory = (cat: AdminCategoryNode) =>
    runCategory(
      () => modifyCategory(cat.categoryId, { active: !cat.active }),
      cat.active ? `‘${cat.name}’을(를) 숨겼어요. 구매자 화면에서 안 보여요.` : `‘${cat.name}’을(를) 다시 보이게 했어요.`,
    )

  const needReason = action?.kind === 'reject' || action?.kind === 'stop'

  return {
    sellerName,
    sellerOptions: sellers.data?.sellers.items ?? [],
    // 중지 요청
    requests,
    requestPage,
    setRequestPage,
    // 상품
    products,
    input,
    setInput,
    submitSearch: (e: FormEvent) => {
      e.preventDefault()
      filter(() => setKeyword(input.trim()))
    },
    sellerId,
    pickSeller: (v: string) => filter(() => setSellerId(Number(v) || undefined)),
    status,
    pickStatus: (v: string) => filter(() => setStatus((v || undefined) as AdminProductStatus | undefined)),
    categoryId,
    pickCategory: (v: string) => filter(() => setCategoryId(Number(v) || undefined)),
    productPage,
    setProductPage,
    // 확인 모달
    action,
    open,
    close: () => setAction(null),
    reason,
    setReason,
    needReason,
    canConfirm: !pending && (!needReason || reason.trim().length > 0),
    pending,
    actionError,
    confirm,
    done,
    // 카테고리
    categories,
    tree: categories.data ?? [],
    newParentId,
    setNewParentId,
    newName,
    setNewName: (v: string) => setNewName(v.slice(0, CATEGORY_NAME_MAX)),
    submitNew,
    editingId,
    startEdit: (cat: AdminCategoryNode) => {
      setEditingId(cat.categoryId)
      setEditName(cat.name)
      setCatError('')
    },
    cancelEdit: () => setEditingId(null),
    editName,
    setEditName: (v: string) => setEditName(v.slice(0, CATEGORY_NAME_MAX)),
    submitRename,
    toggleCategory,
    catPending,
    catError,
    catDone,
  }
}
type View = ReturnType<typeof useProductsView>

/** 확인 모달: 요청 승인·반려, 즉시 판매 중지 */
function ActionModal({ v }: { v: View }) {
  const a = v.action
  if (!a) return null
  const title =
    a.kind === 'approve'
      ? '판매 중지 요청을 승인할까요?'
      : a.kind === 'reject'
        ? '판매 중지 요청을 반려할까요?'
        : '이 상품의 판매를 바로 중지할까요?'
  const target = a.kind === 'stop' ? a.product.name : a.request.productName
  const note =
    a.kind === 'approve'
      ? `판매자 사유: ${a.request.reason}`
      : a.kind === 'reject'
        ? '반려 사유는 판매자에게 보여요. 상품은 그대로 판매 중이에요.'
        : '판매 중지는 다시 열 수 없어요. 결제를 기다리는 주문은 취소되고, 심사 중인 중지 요청은 닫혀요.'
  const label = v.pending
    ? '처리 중이에요'
    : a.kind === 'approve'
      ? '승인하기'
      : a.kind === 'reject'
        ? '반려하기'
        : '판매 중지하기'
  return (
    <Modal
      title={title}
      onClose={v.pending ? undefined : v.close}
      actions={
        <>
          <Button variant="outline" onClick={v.close} disabled={v.pending}>
            닫기
          </Button>
          <Button variant={a.kind === 'stop' ? 'danger' : 'primary'} onClick={v.confirm} disabled={!v.canConfirm}>
            {label}
          </Button>
        </>
      }
    >
      <p className={s.modalTarget}>{target}</p>
      {note}
      {v.needReason && (
        <>
          <ReasonField
            id="product-action-reason"
            label={a.kind === 'reject' ? '반려 사유 (필수)' : '중지 사유 (필수)'}
            value={v.reason}
            onChange={v.setReason}
            max={REASON_MAX}
          />
          <span className={s.counter}>
            {v.reason.length}/{REASON_MAX}
          </span>
        </>
      )}
      <Notice tone="error">{v.actionError}</Notice>
    </Modal>
  )
}

/** 판매 중지 요청 목록 (PC 패널 · 모바일 탭 공통) */
function StopRequests({ v }: { v: View }) {
  const { requests } = v
  const items = requests.data?.items ?? []
  return (
    <>
      {requests.loading && !requests.data && <Loading />}
      {requests.error && <ErrorView message={`중지 요청을 불러오지 못했어요. ${requests.error}`} onRetry={requests.reload} />}
      {requests.data && items.length === 0 && <p className={s.panelEmpty}>심사할 판매 중지 요청이 없어요.</p>}
      {items.map((r) => (
        <div key={r.requestId} className={s.reqItem}>
          <div className={s.reqHead}>
            <div>
              <b>{r.productName}</b>
              <span>
                {v.sellerName(r.sellerId)} · 요청 {fmtDay(r.createdAt)}
              </span>
            </div>
          </div>
          <p className={s.reqReason}>
            <b>사유</b>
            {r.reason}
          </p>
          <div className={s.btnRow}>
            <Button variant="outline" size="sm" onClick={() => v.open({ kind: 'reject', request: r })}>
              반려하기
            </Button>
            <Button size="sm" onClick={() => v.open({ kind: 'approve', request: r })}>
              승인하기
            </Button>
          </div>
        </div>
      ))}
      <Pager page={v.requestPage} totalPages={requests.data?.totalPages ?? 0} onChange={v.setRequestPage} />
    </>
  )
}

/** 카테고리: 대분류별 소분류 이름 바꾸기·숨기기, 소분류 추가 */
function Categories({ v }: { v: View }) {
  const { categories } = v
  return (
    <>
      {categories.loading && !categories.data && <Loading />}
      {categories.error && (
        <ErrorView message={`카테고리를 불러오지 못했어요. ${categories.error}`} onRetry={categories.reload} />
      )}
      <Notice>{v.catDone}</Notice>
      <Notice tone="error">{v.catError}</Notice>
      {v.tree.map((g) => (
        <div key={g.categoryId} className={s.catGroup}>
          <p className={s.catName}>
            {g.name} <span>{g.children.length}</span>
          </p>
          {g.children.map((cat) => (
            <div key={cat.categoryId} className={`${s.catRow} ${cat.active ? '' : s.catHidden}`}>
              {v.editingId === cat.categoryId ? (
                <form onSubmit={(e) => v.submitRename(e, cat.categoryId, cat.name)}>
                  <input
                    className={s.inlineInput}
                    aria-label={`${cat.name} 새 이름`}
                    value={v.editName}
                    onChange={(e) => v.setEditName(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className={s.linkBtn} disabled={v.catPending || !v.editName.trim()}>
                    저장
                  </button>
                  <button type="button" className={s.linkBtn} onClick={v.cancelEdit}>
                    취소
                  </button>
                </form>
              ) : (
                <>
                  <span>
                    {cat.name} {!cat.active && <Badge>숨김</Badge>}
                  </span>
                  <span className={s.catBtns}>
                    <button type="button" className={s.linkBtn} disabled={v.catPending} onClick={() => v.startEdit(cat)}>
                      이름 바꾸기
                    </button>
                    <button
                      type="button"
                      className={s.linkBtn}
                      disabled={v.catPending}
                      onClick={() => v.toggleCategory(cat)}
                    >
                      {cat.active ? '숨기기' : '다시 보이기'}
                    </button>
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      ))}
      {v.tree.length > 0 && (
        <form className={s.addRow} onSubmit={v.submitNew}>
          <select
            aria-label="추가할 대분류"
            value={v.newParentId ?? ''}
            onChange={(e) => v.setNewParentId(Number(e.target.value) || null)}
          >
            {v.tree.map((g) => (
              <option key={g.categoryId} value={g.categoryId}>
                {g.name}
              </option>
            ))}
          </select>
          <input
            className={s.inlineInput}
            aria-label="새 소분류 이름"
            placeholder="새 소분류 이름"
            value={v.newName}
            onChange={(e) => v.setNewName(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={v.catPending || !v.newName.trim()}>
            추가
          </Button>
        </form>
      )}
      <p className={s.panelNote}>
        같은 대분류 안에서는 이름이 겹칠 수 없어요. 추가한 소분류는 맨 뒤에 붙고, 순서는 바꿀 수 없어요. 숨긴 소분류의
        상품은 구매자 화면에서 보이지 않아요.
      </p>
    </>
  )
}

function StatusSelect({ v, className }: { v: View; className?: string }) {
  return (
    <select aria-label="상태" className={className} value={v.status ?? ''} onChange={(e) => v.pickStatus(e.target.value)}>
      <option value="">모든 상태</option>
      {STATUS_ORDER.map((st) => (
        <option key={st} value={st}>
          {STATUS[st][0]}
        </option>
      ))}
    </select>
  )
}

function SellerSelect({ v, className }: { v: View; className?: string }) {
  return (
    <select
      aria-label="판매자"
      className={className}
      value={v.sellerId ?? ''}
      onChange={(e) => v.pickSeller(e.target.value)}
    >
      <option value="">모든 판매자</option>
      {v.sellerOptions.map((o) => (
        <option key={o.sellerId} value={o.sellerId}>
          {o.businessName}
        </option>
      ))}
    </select>
  )
}

function CategorySelect({ v, className }: { v: View; className?: string }) {
  return (
    <select
      aria-label="카테고리"
      className={className}
      value={v.categoryId ?? ''}
      onChange={(e) => v.pickCategory(e.target.value)}
    >
      <option value="">모든 카테고리</option>
      {v.tree.map((g) => (
        <optgroup key={g.categoryId} label={g.name}>
          <option value={g.categoryId}>{g.name} 전체</option>
          {g.children.map((cat) => (
            <option key={cat.categoryId} value={cat.categoryId}>
              {cat.active ? cat.name : `${cat.name} (숨김)`}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

function DesktopProducts({ v }: { v: View }) {
  const { products } = v
  const items = products.data?.items ?? []
  return (
    <div className={s.split}>
      <div>
        <div className={c.toolbar}>
          <div className={c.toolGroup}>
            <form role="search" onSubmit={v.submitSearch} className={c.search}>
              <Icon name="search" size={16} />
              <input
                aria-label="상품명"
                placeholder="상품명"
                maxLength={100}
                value={v.input}
                onChange={(e) => v.setInput(e.target.value)}
              />
            </form>
            <StatusSelect v={v} className={c.select} />
            <SellerSelect v={v} className={c.select} />
            <CategorySelect v={v} className={c.select} />
          </div>
          {products.data && <span className={s.total}>{products.data.totalElements.toLocaleString('ko-KR')}개</span>}
        </div>
        <Notice>{v.done}</Notice>
        <div role="table" className={`${c.table} ${products.loading && products.data ? s.busy : ''}`}>
          <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
            <span>상품</span>
            <span>판매자</span>
            <span>카테고리</span>
            <span className={s.right}>가격</span>
            <span className={s.right}>재고</span>
            <span>상태</span>
            <span />
          </div>
          {products.loading && !products.data && <Loading />}
          {products.error && (
            <ErrorView message={`상품을 불러오지 못했어요. ${products.error}`} onRetry={products.reload} />
          )}
          {products.data && items.length === 0 && <div className={s.tableEmpty}>이 조건에 맞는 상품이 없어요.</div>}
          {items.map((p) => {
            const note = stoppedNote(p)
            return (
              <div role="row" key={p.productId} className={c.tr} style={COLS}>
                <span className={s.productCell}>
                  <Thumb src={p.thumbnailUrl} width={40} height={40} />
                  <b>{p.name}</b>
                </span>
                <span className={c.ellipsis}>{v.sellerName(p.sellerId)}</span>
                <span className={c.ellipsis}>{p.categoryName}</span>
                <span className={`${s.right} ${c.num}`}>{won(p.price)}</span>
                <span className={`${s.right} ${c.num} ${p.stock === 0 ? s.danger : ''}`}>{p.stock}</span>
                <span>
                  <Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>
                  {note && (
                    <span className={c.sub} title={note}>
                      {note}
                    </span>
                  )}
                </span>
                <span>
                  {canStop(p) && (
                    <Button variant="dangerOutline" size="sm" onClick={() => v.open({ kind: 'stop', product: p })}>
                      판매 중지
                    </Button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        <Pager page={v.productPage} totalPages={products.data?.totalPages ?? 0} onChange={v.setProductPage} />
      </div>
      <section className={s.panel} aria-label="판매 중지 요청과 카테고리">
        <h2 className={s.panelTitle}>판매 중지 요청 {v.requests.data?.totalElements ?? ''}</h2>
        <StopRequests v={v} />
        <div className={s.panelSection}>
          <h2 className={s.panelTitle}>카테고리</h2>
          <Categories v={v} />
        </div>
      </section>
    </div>
  )
}

type Seg = 'all' | 'req' | 'cat'

function MobileProducts({ v }: { v: View }) {
  const [seg, setSeg] = useState<Seg>('all')
  const { products } = v
  const items = products.data?.items ?? []
  const reqCount = v.requests.data?.totalElements
  return (
    <div className={s.mBody}>
      <div className={`${s.mBar} ${s.mSegment}`}>
        <Segment
          label="보기"
          value={seg}
          onChange={setSeg}
          items={[
            { value: 'all', label: '전체 상품' },
            { value: 'req', label: `중지 요청${reqCount !== undefined ? ` ${reqCount}` : ''}` },
            { value: 'cat', label: '카테고리' },
          ]}
        />
      </div>
      {v.done && (
        <div className={s.mBar}>
          <Notice>{v.done}</Notice>
        </div>
      )}
      {seg === 'all' && (
        <>
          <div className={s.mBar}>
            <form role="search" onSubmit={v.submitSearch} className={`${c.mobileSearch} ${s.flush}`}>
              <Icon name="search" size={18} />
              <input
                type="search"
                aria-label="상품명"
                placeholder="상품명"
                maxLength={100}
                value={v.input}
                onChange={(e) => v.setInput(e.target.value)}
              />
            </form>
            <div className={s.mSelects}>
              <StatusSelect v={v} />
              <SellerSelect v={v} />
            </div>
          </div>
          {products.loading && !products.data && <Loading />}
          {products.error && (
            <ErrorView message={`상품을 불러오지 못했어요. ${products.error}`} onRetry={products.reload} />
          )}
          {products.data && items.length === 0 && <Empty title="이 조건에 맞는 상품이 없어요" />}
          <ul className={s.mList}>
            {items.map((p) => (
              <li key={p.productId} className={s.mItem}>
                <Thumb src={p.thumbnailUrl} width={56} height={56} />
                <div className={s.mItemBody}>
                  <span className={s.mItemTitle}>
                    <Badge tone={STATUS[p.status][1]}>{STATUS[p.status][0]}</Badge>
                    <span className={s.mItemMeta}>{v.sellerName(p.sellerId)}</span>
                  </span>
                  <p className={c.liTitle}>{p.name}</p>
                  <span className={s.mItemMeta}>
                    {won(p.price)} · 재고 {p.stock}
                    {stoppedNote(p) && ` · ${stoppedNote(p)}`}
                  </span>
                </div>
                {canStop(p) && (
                  <Button variant="dangerOutline" size="sm" onClick={() => v.open({ kind: 'stop', product: p })}>
                    중지
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <Pager page={v.productPage} totalPages={products.data?.totalPages ?? 0} onChange={v.setProductPage} />
        </>
      )}
      {seg === 'req' && (
        <div className={`${s.card} ${s.mCards}`}>
          <StopRequests v={v} />
        </div>
      )}
      {seg === 'cat' && (
        <div className={`${s.card} ${s.mCards}`}>
          <Categories v={v} />
        </div>
      )}
    </div>
  )
}

/** 관리자 · 상품과 카테고리 */
export default function AdminProducts() {
  const desktop = useIsDesktop()
  const v = useProductsView()
  return (
    <ConsoleShell variant="admin" active="products" title="상품과 카테고리">
      {desktop ? <DesktopProducts v={v} /> : <MobileProducts v={v} />}
      <ActionModal v={v} />
    </ConsoleShell>
  )
}
