import { NOTICE, makeCx, won } from '../lib/ui'
import styles from './AdminProducts.module.css'
import AdminLayout from '../components/AdminLayout'
import Pager from '../components/Pager'
import ConfirmModal from '../components/ConfirmModal'

import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { errorMessage, toPageParam } from '../lib/api'
import {
  approveStopRequest,
  createCategory,
  getAdminCategories,
  getAdminProducts,
  getAdminStopRequests,
  modifyCategory,
  rejectStopRequest,
  stopProductByAdmin,
  type AdminProductStatus,
  type AdminProductStopRequest,
  type AdminProductSummary,
  type ProductStoppedBy,
} from '../lib/api/product'
import { getAdminSellers } from '../lib/api/member'
import { useApi } from '../lib/useApi'
import { SMALL_BTN, fmtDay } from '../lib/admin'

const cx = makeCx(styles)

const PRODUCT_PAGE_SIZE = 20
const REQUEST_PAGE_SIZE = 10
/** 판매자 상호명을 맞추려고 불러오는 최대 판매자 수 (백엔드 size 최대 100) */
const SELLER_LIMIT = 100
/** 중지·반려 사유 최대 길이 (백엔드 @Size(max = 300)) */
const REASON_MAX = 300
/** 카테고리 이름 최대 길이 (백엔드 @Size(max = 50)) */
const CATEGORY_NAME_MAX = 50

const ROW_BTN = { ...SMALL_BTN }
const DANGER_BTN = { ...SMALL_BTN, borderColor: '#C2410C', color: '#A33A1F' }
const CAT_BTN = { minHeight: '32px', padding: '0 8px', fontSize: '13px' }

/** 상태 [이름, 칩 색] */
const STATUS: Record<AdminProductStatus, [string, string]> = {
  ON_SALE: ['판매중', 'c-ok'],
  SOLD_OUT: ['품절', 'c-mute'],
  STOPPED: ['판매 중지', 'c-mute'],
  DELETED: ['삭제됨', 'c-mute'],
}
const STATUS_ORDER: AdminProductStatus[] = ['ON_SALE', 'SOLD_OUT', 'STOPPED', 'DELETED']

const STOPPED_BY: Record<ProductStoppedBy, string> = {
  ADMIN: '관리자가 중지',
  SELLER_REQUEST: '판매자 요청으로 중지',
  SELLER_WITHDRAWN: '판매자 철회·제재로 중지',
}

/** 열려 있는 확인 패널 */
type Action =
  | { kind: 'approve'; request: AdminProductStopRequest }
  | { kind: 'reject'; request: AdminProductStopRequest }
  | { kind: 'stop'; product: AdminProductSummary }

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useAdminProductsView() {
  // ── 판매자 상호명 (응답에 sellerId만 있어서 관리자 판매자 목록으로 맞춰요)
  const sellers = useApi(() => getAdminSellers({ size: SELLER_LIMIT }), [])
  const sellerName = (id: number) =>
    sellers.data?.sellers.items.find((s) => s.sellerId === id)?.businessName ?? `판매자 #${id}`

  // ── 판매 중지 요청 (심사 중)
  const [requestPage, setRequestPage] = useState(1)
  const requests = useApi(
    () => getAdminStopRequests({ page: toPageParam(requestPage), size: REQUEST_PAGE_SIZE }),
    [requestPage],
  )

  // ── 전체 상품
  const [keyword, setKeyword] = useState('')
  const [input, setInput] = useState('')
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

  // ── 요청 승인·반려, 즉시 중지 패널
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
  const [adding, setAdding] = useState(false)
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
    if (catPending) return
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
    if (ok) {
      setNewName('')
      setAdding(false)
    }
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

  const tree = categories.data ?? []
  const reasonTrim = reason.trim()
  const needReason = action?.kind === 'reject' || action?.kind === 'stop'

  const view = {
    // 판매 중지 요청
    requestCount: requests.data?.totalElements ?? 0,
    requestRows: (requests.data?.items ?? []).map((r) => ({
      id: r.requestId,
      day: fmtDay(r.createdAt),
      productName: r.productName,
      seller: sellerName(r.sellerId),
      reason: r.reason,
      approve: () => open({ kind: 'approve', request: r }),
      reject: () => open({ kind: 'reject', request: r }),
    })),
    requestsLoading: requests.loading && !requests.data,
    requestsError: requests.error,
    requestsEmpty: !requests.loading && !requests.error && requests.data?.items.length === 0,
    requestPage,
    requestTotalPages: requests.data?.totalPages ?? 0,
    changeRequestPage: setRequestPage,

    // 전체 상품
    input,
    changeInput: (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
    submitSearch: (e: FormEvent) => {
      e.preventDefault()
      filter(() => setKeyword(input.trim()))
    },
    sellerOptions: (sellers.data?.sellers.items ?? []).map((s) => ({
      value: String(s.sellerId),
      label: s.businessName,
    })),
    sellerValue: sellerId ? String(sellerId) : '',
    pickSeller: (e: ChangeEvent<HTMLSelectElement>) => filter(() => setSellerId(Number(e.target.value) || undefined)),
    statusOptions: STATUS_ORDER.map((s) => ({ value: s, label: STATUS[s][0] })),
    statusValue: status ?? '',
    pickStatus: (e: ChangeEvent<HTMLSelectElement>) =>
      filter(() => setStatus((e.target.value || undefined) as AdminProductStatus | undefined)),
    categoryGroups: tree.map((g) => ({
      value: String(g.categoryId),
      label: g.name,
      children: g.children.map((c) => ({ value: String(c.categoryId), label: c.active ? c.name : `${c.name} (숨김)` })),
    })),
    categoryValue: categoryId ? String(categoryId) : '',
    pickCategory: (e: ChangeEvent<HTMLSelectElement>) =>
      filter(() => setCategoryId(Number(e.target.value) || undefined)),
    productRows: (products.data?.items ?? []).map((p) => {
      const [label, chip] = STATUS[p.status]
      return {
        id: p.productId,
        name: p.name,
        seller: sellerName(p.sellerId),
        category: p.categoryName,
        price: won(p.price),
        stock: p.stock,
        noStock: p.status === 'SOLD_OUT',
        label,
        chip,
        stoppedNote:
          p.status === 'STOPPED'
            ? [p.stoppedBy ? STOPPED_BY[p.stoppedBy] : '', p.stoppedReason].filter(Boolean).join(' · ')
            : '',
        // 판매중·품절 상품만 즉시 중지할 수 있어요.
        canStop: p.status === 'ON_SALE' || p.status === 'SOLD_OUT',
        stop: () => open({ kind: 'stop', product: p }),
      }
    }),
    productsLoading: products.loading && !products.data,
    productsBusy: products.loading,
    productsError: products.error,
    productsEmpty: !products.loading && !products.error && products.data?.items.length === 0,
    productTotal: products.data?.totalElements ?? 0,
    productPage,
    productTotalPages: products.data?.totalPages ?? 0,
    changeProductPage: setProductPage,
    retryProducts: products.reload,

    // 확인 패널
    action,
    actionTitle:
      action?.kind === 'approve'
        ? '판매 중지 요청을 승인할까요?'
        : action?.kind === 'reject'
          ? '판매 중지 요청을 반려할까요?'
          : '이 상품의 판매를 바로 중지할까요?',
    actionTarget: action ? (action.kind === 'stop' ? action.product.name : action.request.productName) : '',
    actionNote:
      action?.kind === 'approve'
        ? `판매자 사유: ${action.request.reason}`
        : action?.kind === 'reject'
          ? '반려 사유는 판매자에게 보여요. 상품은 그대로 판매 중이에요.'
          : '판매 중지는 다시 열 수 없어요. 결제를 기다리는 주문은 취소되고, 심사 중인 중지 요청은 닫혀요.',
    needReason,
    reasonLabel: action?.kind === 'reject' ? '반려 사유 (필수)' : '중지 사유 (필수)',
    reason,
    changeReason: (e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value.slice(0, REASON_MAX)),
    reasonCount: `${reason.length}/${REASON_MAX}`,
    canConfirm: !pending && (!needReason || reasonTrim.length > 0),
    confirmLabel: pending
      ? '처리 중이에요'
      : action?.kind === 'approve'
        ? '승인하기'
        : action?.kind === 'reject'
          ? '반려하기'
          : '판매 중지하기',
    pending,
    actionError,
    confirm,
    close: () => setAction(null),
    done,

    // 카테고리
    tree: tree.map((g) => ({
      id: g.categoryId,
      name: g.name,
      children: g.children.map((c) => ({
        id: c.categoryId,
        name: c.name,
        active: c.active,
        editing: editingId === c.categoryId,
        startEdit: () => {
          setEditingId(c.categoryId)
          setEditName(c.name)
          setCatError('')
        },
        submitRename: (e: FormEvent) => submitRename(e, c.categoryId, c.name),
        toggle: () =>
          runCategory(
            () => modifyCategory(c.categoryId, { active: !c.active }),
            c.active
              ? `‘${c.name}’을(를) 숨겼어요. 구매자 화면에서 안 보여요.`
              : `‘${c.name}’을(를) 다시 보이게 했어요.`,
          ),
      })),
    })),
    categoriesLoading: categories.loading && !categories.data,
    categoriesError: categories.error,
    editName,
    changeEditName: (e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value.slice(0, CATEGORY_NAME_MAX)),
    cancelEdit: () => setEditingId(null),
    adding,
    toggleAdding: () => {
      setAdding((a) => !a)
      setCatError('')
    },
    parentOptions: tree.map((g) => ({ value: String(g.categoryId), label: g.name })),
    newParentValue: newParentId ? String(newParentId) : '',
    pickNewParent: (e: ChangeEvent<HTMLSelectElement>) => setNewParentId(Number(e.target.value) || null),
    newName,
    changeNewName: (e: ChangeEvent<HTMLInputElement>) => setNewName(e.target.value.slice(0, CATEGORY_NAME_MAX)),
    submitNew,
    catPending,
    catError,
    catDone,
  }
  return view
}

/** 확인 모달: 요청 승인·반려, 즉시 판매 중지 */
function ActionPanel({ v }: { v: ReturnType<typeof useAdminProductsView> }) {
  return (
    <ConfirmModal labelledBy="action-title" onClose={v.close} busy={v.pending}>
      <h2 id="action-title" style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
        {v.actionTitle}
      </h2>
      <p style={{ margin: '0', color: '#45454F' }}>{v.actionTarget}</p>
      <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
        {v.actionNote}
      </p>
      {v.needReason && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label htmlFor="reason" style={{ fontSize: '14px', fontWeight: '500' }}>
            {v.reasonLabel}
          </label>
          <textarea
            id="reason"
            className={cx('in')}
            style={{ minHeight: '96px', padding: '12px 14px' }}
            value={v.reason}
            onChange={v.changeReason}
            autoFocus
          ></textarea>
          <span className={cx('sub num')} style={{ alignSelf: 'flex-end' }}>
            {v.reasonCount}
          </span>
        </div>
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
          {v.confirmLabel}
        </button>
      </div>
    </ConfirmModal>
  )
}

/** 관리자 · 상품과 카테고리 */
export default function AdminProductsPage() {
  const v = useAdminProductsView()
  const kind = v.action?.kind
  return (
    <div className={styles.page}>
      <AdminLayout active="상품과 카테고리" minHeight={1700}>
        <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>상품과 카테고리</h1>
        {v.done && (
          <p className={cx('done')} role="status">
            {v.done}
          </p>
        )}

        {/* 판매 중지 요청 */}
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매 중지 요청</h2>
            <span className={cx('chip c-blue num')}>{v.requestCount}건</span>
          </div>
          {v.requestsError && (
            <p role="alert" style={NOTICE}>
              중지 요청을 불러오지 못했어요. {v.requestsError}
            </p>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>요청일</th>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'left' }}>사유</th>
                  <th style={{ textAlign: 'right' }} aria-label="처리"></th>
                </tr>
              </thead>
              <tbody>
                {v.requestRows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ textAlign: 'left' }}>{r.day}</td>
                    <td style={{ textAlign: 'left' }}>{r.productName}</td>
                    <td style={{ textAlign: 'left' }}>{r.seller}</td>
                    <td style={{ textAlign: 'left', whiteSpace: 'normal', minWidth: '240px' }}>{r.reason}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button className={cx('btn')} style={ROW_BTN} onClick={r.reject}>
                          반려
                        </button>
                        <button className={cx('btn btn-p')} style={ROW_BTN} onClick={r.approve}>
                          승인
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.requestsLoading && <p className={cx('sub empty')}>중지 요청을 불러오고 있어요</p>}
            {v.requestsEmpty && <p className={cx('sub empty')}>심사할 판매 중지 요청이 없어요.</p>}
          </div>
          <Pager
            page={v.requestPage}
            totalPages={v.requestTotalPages}
            onChange={v.changeRequestPage}
            buttonClassName={cx('btn')}
          />
          <p className={cx('sub')} style={{ margin: '4px 0 0' }}>
            승인하면 판매가 멈추고 결제 대기 주문이 취소돼요. 반려할 때는 사유를 남겨요.
          </p>
        </section>
        {(kind === 'approve' || kind === 'reject') && <ActionPanel v={v} />}

        {/* 전체 상품 */}
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>전체 상품</h2>
            {!v.productsLoading && !v.productsError && (
              <span className={cx('sub num')}>{v.productTotal.toLocaleString('ko-KR')}개</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <form role="search" onSubmit={v.submitSearch} style={{ display: 'flex', flex: '1 1 200px' }}>
              <input
                className={cx('in')}
                placeholder="상품명"
                aria-label="상품명"
                value={v.input}
                onChange={v.changeInput}
                maxLength={100}
                style={{ flex: '1' }}
              />
            </form>
            <select className={cx('in')} aria-label="판매자" value={v.sellerValue} onChange={v.pickSeller}>
              <option value="">모든 판매자</option>
              {v.sellerOptions.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select className={cx('in')} aria-label="상태" value={v.statusValue} onChange={v.pickStatus}>
              <option value="">모든 상태</option>
              {v.statusOptions.map((o) => (
                <option value={o.value} key={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select className={cx('in')} aria-label="카테고리" value={v.categoryValue} onChange={v.pickCategory}>
              <option value="">모든 카테고리</option>
              {v.categoryGroups.map((g) => (
                <optgroup label={g.label} key={g.value}>
                  <option value={g.value}>{g.label} 전체</option>
                  {g.children.map((c) => (
                    <option value={c.value} key={c.value}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {v.productsError && (
            <div role="alert" style={{ ...NOTICE, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ flex: '1' }}>상품을 불러오지 못했어요. {v.productsError}</span>
              <button className={cx('btn')} style={ROW_BTN} onClick={v.retryProducts}>
                다시 시도
              </button>
            </div>
          )}
          <div style={{ overflowX: 'auto', opacity: v.productsBusy ? 0.5 : 1 }} aria-busy={v.productsBusy}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>상품</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'left' }}>카테고리</th>
                  <th style={{ textAlign: 'right' }}>가격</th>
                  <th style={{ textAlign: 'right' }}>재고</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'right' }} aria-label="관리"></th>
                </tr>
              </thead>
              <tbody>
                {v.productRows.map((p) => (
                  <tr key={p.id}>
                    <td style={{ textAlign: 'left' }}>{p.name}</td>
                    <td style={{ textAlign: 'left' }}>{p.seller}</td>
                    <td style={{ textAlign: 'left' }}>{p.category}</td>
                    <td style={{ textAlign: 'right' }}>{p.price}원</td>
                    <td style={{ textAlign: 'right' }}>
                      <span style={p.noStock ? { color: '#A33A1F', fontWeight: '700' } : undefined}>{p.stock}</span>
                    </td>
                    <td style={{ textAlign: 'left' }}>
                      <span className={cx('chip', p.chip)}>{p.label}</span>
                      {p.stoppedNote && (
                        <div
                          className={cx('sub')}
                          style={{ whiteSpace: 'normal', marginTop: '4px', maxWidth: '260px' }}
                        >
                          {p.stoppedNote}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {p.canStop ? (
                        <button className={cx('btn')} style={DANGER_BTN} onClick={p.stop}>
                          바로 판매 중지
                        </button>
                      ) : (
                        <span className={cx('sub')}>다시 열 수 없어요</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {v.productsLoading && <p className={cx('sub empty')}>상품을 불러오고 있어요</p>}
            {v.productsEmpty && <p className={cx('sub empty')}>이 조건에 맞는 상품이 없어요.</p>}
          </div>
          <Pager
            page={v.productPage}
            totalPages={v.productTotalPages}
            onChange={v.changeProductPage}
            buttonClassName={cx('btn')}
          />
        </section>
        {kind === 'stop' && <ActionPanel v={v} />}

        {/* 카테고리 */}
        <section
          className={cx('panel')}
          style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>카테고리</h2>
            <button
              className={cx(v.adding ? 'btn' : 'btn btn-p')}
              style={ROW_BTN}
              onClick={v.toggleAdding}
              aria-expanded={v.adding}
            >
              {v.adding ? '추가 닫기' : '소분류 추가하기'}
            </button>
          </div>
          {v.adding && (
            <form
              onSubmit={v.submitNew}
              style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}
            >
              <select
                className={cx('in')}
                aria-label="추가할 대분류"
                value={v.newParentValue}
                onChange={v.pickNewParent}
              >
                {v.parentOptions.map((o) => (
                  <option value={o.value} key={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                className={cx('in')}
                aria-label="새 소분류 이름"
                placeholder="새 소분류 이름 (50자까지)"
                value={v.newName}
                onChange={v.changeNewName}
                style={{ flex: '1 1 200px' }}
                autoFocus
              />
              <button type="submit" className={cx('btn btn-p')} disabled={v.catPending || !v.newName.trim()}>
                추가하기
              </button>
            </form>
          )}
          {v.catDone && (
            <p className={cx('done')} role="status">
              {v.catDone}
            </p>
          )}
          {(v.catError || v.categoriesError) && (
            <p role="alert" style={NOTICE}>
              {v.catError || `카테고리를 불러오지 못했어요. ${v.categoriesError}`}
            </p>
          )}
          {v.categoriesLoading && <p className={cx('sub')}>카테고리를 불러오고 있어요</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '24px' }}>
            {v.tree.map((g) => (
              <div style={{ display: 'flex', flexDirection: 'column' }} key={g.id}>
                <strong style={{ padding: '6px 0' }}>{g.name}</strong>
                {g.children.map((c) => (
                  <div className={cx('cat-row', !c.active && 'cat-hidden')} key={c.id}>
                    {c.editing ? (
                      <form onSubmit={c.submitRename} style={{ display: 'flex', gap: '4px', flex: '1' }}>
                        <input
                          className={cx('in')}
                          aria-label={`${c.name} 새 이름`}
                          value={v.editName}
                          onChange={v.changeEditName}
                          style={{ flex: '1', minHeight: '36px' }}
                          autoFocus
                        />
                        <button
                          type="submit"
                          className={cx('btn btn-p')}
                          style={CAT_BTN}
                          disabled={v.catPending || !v.editName.trim()}
                        >
                          저장
                        </button>
                        <button type="button" className={cx('btn btn-q')} style={CAT_BTN} onClick={v.cancelEdit}>
                          취소
                        </button>
                      </form>
                    ) : (
                      <>
                        <span>
                          {c.name}
                          {!c.active && (
                            <span className={cx('chip c-mute')} style={{ marginLeft: '6px' }}>
                              숨김
                            </span>
                          )}
                        </span>
                        <span style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className={cx('btn btn-q')}
                            style={CAT_BTN}
                            onClick={c.startEdit}
                            disabled={v.catPending}
                          >
                            이름 바꾸기
                          </button>
                          <button
                            className={cx('btn btn-q')}
                            style={CAT_BTN}
                            onClick={c.toggle}
                            disabled={v.catPending}
                          >
                            {c.active ? '숨기기' : '다시 보이기'}
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p className={cx('sub')} style={{ margin: '0' }}>
            같은 대분류 안에서는 이름이 겹칠 수 없어요. 추가한 소분류는 맨 뒤에 붙고, 순서는 바꿀 수 없어요. 숨긴
            소분류의 상품은 구매자 화면에서 보이지 않아요.
          </p>
        </section>
      </AdminLayout>
    </div>
  )
}
