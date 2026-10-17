import { Link, useNavigate, useParams } from 'react-router-dom'
import { NOTICE, makeCx } from '../lib/ui'
import styles from './SellerProductForm.module.css'
import SellerLayout from '../components/SellerLayout'

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError, errorMessage } from '../lib/api'
import {
  createProduct,
  getCategories,
  getSellerProductForm,
  modifyProduct,
  type ProductModifyRequest,
  type SellerProductForm,
} from '../lib/api/product'
import { useApi } from '../lib/useApi'

const cx = makeCx(styles)

/** 백엔드 제약 (ProductCreateRequest·이미지 검사) */
const NAME_MAX = 100
const DETAIL_MAX = 10
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Field = 'name' | 'categoryId' | 'price' | 'stock' | 'description' | 'thumbnail' | 'detailImages'
type Errors = Partial<Record<Field, string>>

/** 상세 이미지 한 장. 기존 이미지는 imageId, 새로 고른 이미지는 file이 있어요. */
type DetailImage = { key: string; url: string; imageId?: number; file?: File }
type Thumbnail = { url: string; file?: File } | null

/** 백엔드 오류 코드 → 오류를 붙일 칸 */
const CODE_FIELD: Record<string, Field> = {
  THUMBNAIL_REQUIRED: 'thumbnail',
  IMAGE_TYPE_NOT_ALLOWED: 'detailImages',
  DETAIL_IMAGE_LIMIT_EXCEEDED: 'detailImages',
  DETAIL_IMAGE_NOT_FOUND: 'detailImages',
  CATEGORY_NOT_SELECTABLE: 'categoryId',
  CATEGORY_NOT_FOUND: 'categoryId',
}

/** 고른 파일이 올릴 수 있는 이미지인지. 안 되면 이유를 돌려줘요. */
function imageProblem(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name}: jpg, png, webp 이미지만 올릴 수 있어요.`
  if (file.size > IMAGE_MAX_BYTES) return `${file.name}: 한 장에 5MB까지 올릴 수 있어요.`
  return ''
}

const digits = (s: string) => s.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '')

let keySeq = 0
const nextKey = () => `n${++keySeq}`

/**
 * 화면 상태와 화면에 그릴 값을 만들어요.
 * productId가 있으면 수정 모드: 폼을 채우고, 저장할 때 바뀐 값만 보내요.
 */
function useSellerProductFormView() {
  const { productId } = useParams()
  const editing = !!productId
  const navigate = useNavigate()

  const categories = useApi(getCategories, [])
  const loaded = useApi(
    () =>
      editing
        ? getSellerProductForm(productId!).catch((e) => {
            if (e instanceof ApiError && e.status === 404) return null
            throw e
          })
        : Promise.resolve(null),
    [productId],
  )
  /** 수정 모드에서 처음 불러온 값. 바뀐 값만 보내려고 비교해요. */
  const original = loaded.data as SellerProductForm | null

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState<Thumbnail>(null)
  const [details, setDetails] = useState<DetailImage[]>([])
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)

  // 수정 모드: 불러온 값으로 폼을 채워요.
  useEffect(() => {
    if (!original) return
    setName(original.name)
    setParentId(original.parentCategoryId)
    setCategoryId(original.categoryId)
    setPrice(String(original.price))
    setDescription(original.description)
    setThumbnail(original.thumbnail ? { url: original.thumbnail.url } : null)
    setDetails(original.detailImages.map((d) => ({ key: `i${d.imageId}`, url: d.url, imageId: d.imageId })))
  }, [original])

  // 새로 고른 파일의 미리보기 주소는 화면을 떠날 때 정리해요.
  const blobUrls = useRef(new Set<string>())
  useEffect(() => {
    const urls = blobUrls.current
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [])
  const preview = (file: File) => {
    const url = URL.createObjectURL(file)
    blobUrls.current.add(url)
    return url
  }

  const clearError = (field: Field) => setErrors((e) => ({ ...e, [field]: undefined }))

  const pickThumbnail = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const problem = imageProblem(file)
    if (problem) return setErrors((er) => ({ ...er, thumbnail: problem }))
    clearError('thumbnail')
    setThumbnail({ url: preview(file), file })
  }

  const pickDetails = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const problems = files.map(imageProblem).filter(Boolean)
    const ok = files.filter((f) => !imageProblem(f))
    const room = DETAIL_MAX - details.length
    const added = ok.slice(0, room)
    if (ok.length > room) problems.push(`상세 이미지는 ${DETAIL_MAX}장까지 올릴 수 있어요.`)
    setErrors((er) => ({ ...er, detailImages: problems.join(' ') || undefined }))
    if (added.length) setDetails((d) => [...d, ...added.map((file) => ({ key: nextKey(), url: preview(file), file }))])
  }

  /**
   * 새로 고른 이미지는 저장하면 기존 이미지 뒤에 붙어요(백엔드 규칙).
   * 그래서 순서 바꾸기는 기존끼리, 새 이미지끼리만 해요.
   */
  const move = (index: number, dir: -1 | 1) =>
    setDetails((d) => {
      const j = index + dir
      if (j < 0 || j >= d.length || !!d[index].file !== !!d[j].file) return d
      const next = [...d]
      ;[next[index], next[j]] = [next[j], next[index]]
      return next
    })
  const removeDetail = (key: string) => {
    setDetails((d) => d.filter((x) => x.key !== key))
    clearError('detailImages')
  }

  /** 화면에서 먼저 확인해요. 백엔드도 같은 규칙으로 다시 확인해요. */
  const validate = (): Errors => {
    const e: Errors = {}
    if (!name.trim()) e.name = '상품명을 입력해 주세요.'
    else if (name.trim().length > NAME_MAX) e.name = `상품명은 ${NAME_MAX}자까지 쓸 수 있어요.`
    if (!categoryId) e.categoryId = '소분류를 골라 주세요.'
    if (!(Number(price) > 0)) e.price = '가격은 1원 이상이어야 해요.'
    if (!editing && !(Number(stock) > 0)) e.stock = '처음 재고는 1개 이상이어야 해요.'
    if (!description.trim()) e.description = '상품 설명을 입력해 주세요.'
    if (!thumbnail) e.thumbnail = '대표 이미지를 올려 주세요.'
    return e
  }

  /** 수정 모드에서 바뀐 값만 담아요. */
  const changes = (): ProductModifyRequest => {
    const req: ProductModifyRequest = {}
    if (!original) return req
    if (name.trim() !== original.name) req.name = name.trim()
    if (Number(price) !== original.price) req.price = Number(price)
    if (categoryId !== original.categoryId) req.categoryId = categoryId!
    if (description !== original.description) req.description = description
    const kept = details.filter((d) => d.imageId != null).map((d) => d.imageId!)
    const before = original.detailImages.map((d) => d.imageId)
    if (kept.join(',') !== before.join(',')) req.detailImageIds = kept
    return req
  }

  const submit = async (ev: FormEvent) => {
    ev.preventDefault()
    if (saving || locked) return
    setFormError('')
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length) return
    const newDetails = details.filter((d) => d.file).map((d) => d.file!)
    setSaving(true)
    try {
      if (editing) {
        const req = changes()
        if (Object.keys(req).length === 0 && !thumbnail?.file && newDetails.length === 0) {
          navigate('/seller/products', { state: { done: '바뀐 내용이 없어서 그대로 두었어요.' } })
          return
        }
        await modifyProduct(productId!, req, { thumbnail: thumbnail?.file, detailImages: newDetails })
        navigate('/seller/products', { state: { done: `‘${name.trim()}’을(를) 수정했어요.` } })
      } else {
        await createProduct(
          {
            name: name.trim(),
            price: Number(price),
            categoryId: categoryId!,
            description,
            stock: Number(stock),
          },
          { thumbnail: thumbnail?.file, detailImages: newDetails },
        )
        navigate('/seller/products', { state: { done: `‘${name.trim()}’을(를) 등록했어요. 바로 판매중으로 보여요.` } })
      }
    } catch (e) {
      handleError(e)
    } finally {
      setSaving(false)
    }
  }

  /** 백엔드 오류를 해당 칸이나 폼 위에 보여줘요. */
  const handleError = (e: unknown) => {
    if (!(e instanceof ApiError)) return setFormError(errorMessage(e))
    const fieldErrors = (e.data as { fieldErrors?: Array<{ field: string; reason: string }> } | null)?.fieldErrors
    if (fieldErrors?.length) {
      const next: Errors = {}
      const rest: string[] = []
      for (const f of fieldErrors) {
        const key = (['name', 'categoryId', 'price', 'stock', 'description'] as Field[]).find((k) => f.field === k)
        if (key) next[key] = f.reason
        else if (f.field === 'detailImageIds') next.detailImages = f.reason
        else rest.push(f.reason)
      }
      setErrors(next)
      if (rest.length) setFormError(rest.join(' '))
      return
    }
    const code = e.resultCode.split('-').slice(1).join('-')
    if (code === 'PRODUCT_NOT_EDITABLE') {
      setLocked(true)
      return setFormError('판매 중지된 상품은 수정할 수 없어요.')
    }
    const field = CODE_FIELD[code]
    if (field) setErrors((er) => ({ ...er, [field]: e.message }))
    else setFormError(errorMessage(e))
  }

  const tree = categories.data ?? []
  const parent = tree.find((g) => g.categoryId === parentId)
  const firstNew = details.findIndex((d) => d.file)

  const view = {
    editing,
    title: editing ? '상품 수정' : '상품 등록',
    loading: (editing && loaded.loading && !original) || (categories.loading && !categories.data),
    loadError: loaded.error || categories.error,
    retry: () => {
      loaded.reload()
      categories.reload()
    },
    notFound: editing && !loaded.loading && !loaded.error && !original,
    name,
    changeName: (e: ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value.slice(0, NAME_MAX))
      clearError('name')
    },
    nameCount: `${name.length}/${NAME_MAX}`,
    parents: tree.map((g) => ({ value: String(g.categoryId), label: g.name })),
    parentValue: parentId ? String(parentId) : '',
    pickParent: (e: ChangeEvent<HTMLSelectElement>) => {
      setParentId(Number(e.target.value) || null)
      setCategoryId(null) // 대분류를 바꾸면 소분류를 다시 골라요
    },
    subs: (parent?.children ?? []).map((c) => ({ value: String(c.categoryId), label: c.name })),
    categoryValue: categoryId ? String(categoryId) : '',
    pickCategory: (e: ChangeEvent<HTMLSelectElement>) => {
      setCategoryId(Number(e.target.value) || null)
      clearError('categoryId')
    },
    price,
    changePrice: (e: ChangeEvent<HTMLInputElement>) => {
      setPrice(digits(e.target.value).slice(0, 10))
      clearError('price')
    },
    priceLabel: Number(price) > 0 ? `${Number(price).toLocaleString('ko-KR')}원` : '',
    stock,
    changeStock: (e: ChangeEvent<HTMLInputElement>) => {
      setStock(digits(e.target.value).slice(0, 6))
      clearError('stock')
    },
    description,
    changeDescription: (e: ChangeEvent<HTMLTextAreaElement>) => {
      setDescription(e.target.value)
      clearError('description')
    },
    thumbnail,
    pickThumbnail,
    details: details.map((d, i) => ({
      key: d.key,
      url: d.url,
      isNew: !!d.file,
      label: `상세 이미지 ${i + 1}`,
      canUp: i > 0 && !!details[i - 1].file === !!d.file,
      canDown: i < details.length - 1 && !!details[i + 1].file === !!d.file,
      up: () => move(i, -1),
      down: () => move(i, 1),
      remove: () => removeDetail(d.key),
      /** 새 이미지 묶음이 시작되는 자리 (기존 이미지 뒤에 붙는다는 안내용) */
      newStart: editing && i === firstNew && firstNew > 0,
    })),
    detailCount: `${details.length}/${DETAIL_MAX}`,
    canAddDetail: details.length < DETAIL_MAX,
    pickDetails,
    errors,
    formError,
    locked,
    saving,
    submit,
    submitLabel: saving ? '저장하는 중이에요' : editing ? '저장하기' : '등록하기',
  }
  return view
}

/** 상품 등록·수정 */
export default function SellerProductFormPage() {
  const v = useSellerProductFormView()
  const thumbInput = useRef<HTMLInputElement>(null)
  const detailInput = useRef<HTMLInputElement>(null)
  const err = (field: Field) =>
    v.errors[field] && (
      <span className={cx('field-error')} id={`${field}-error`} role="alert">
        {v.errors[field]}
      </span>
    )
  const describedBy = (field: Field) => (v.errors[field] ? `${field}-error` : undefined)

  return (
    <div className={styles.page}>
      <SellerLayout active={v.editing ? '상품 관리' : '상품 등록'} minHeight={1060}>
        <div>
          <Link to="/seller/products" className={cx('sub')} style={{ fontWeight: '500' }}>
            ‹ 상품 관리
          </Link>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>{v.title}</h1>
        </div>
        {v.loading && <p className={cx('sub')}>불러오고 있어요</p>}
        {v.loadError && (
          <div role="alert" style={{ ...NOTICE, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ flex: '1' }}>불러오지 못했어요. {v.loadError}</span>
            <button className={cx('btn')} onClick={v.retry}>
              다시 시도
            </button>
          </div>
        )}
        {v.notFound && (
          <section className={cx('panel')} style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px' }}>상품을 찾을 수 없어요. 삭제됐거나 다른 판매자의 상품이에요.</p>
            <Link className={cx('btn')} to="/seller/products">
              상품 관리로
            </Link>
          </section>
        )}
        {!v.loading && !v.loadError && !v.notFound && (
          <form
            onSubmit={v.submit}
            noValidate
            style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start', maxWidth: '1040px' }}
          >
            <div style={{ flex: '999 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {v.formError && (
                <p role="alert" style={NOTICE}>
                  {v.formError}
                </p>
              )}
              <section
                className={cx('panel')}
                style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>기본 정보</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="pn" style={{ fontSize: '14px', fontWeight: '500' }}>
                    상품명
                  </label>
                  <input
                    id="pn"
                    className={cx('in', v.errors.name && 'in-error')}
                    type="text"
                    placeholder="예: 약산성 수분 진정 토너 300ml"
                    style={{ width: '100%' }}
                    value={v.name}
                    onChange={v.changeName}
                    aria-invalid={!!v.errors.name}
                    aria-describedby={describedBy('name')}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    {err('name') || <span />}
                    <span className={cx('sub num')}>{v.nameCount}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="c1" style={{ fontSize: '14px', fontWeight: '500' }}>
                      대분류
                    </label>
                    <select id="c1" className={cx('in')} value={v.parentValue} onChange={v.pickParent}>
                      <option value="">고르기</option>
                      {v.parents.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="c2" style={{ fontSize: '14px', fontWeight: '500' }}>
                      소분류
                    </label>
                    <select
                      id="c2"
                      className={cx('in', v.errors.categoryId && 'in-error')}
                      value={v.categoryValue}
                      onChange={v.pickCategory}
                      disabled={!v.parentValue}
                      aria-invalid={!!v.errors.categoryId}
                      aria-describedby={describedBy('categoryId')}
                    >
                      <option value="">{v.parentValue ? '고르기' : '대분류를 먼저 골라 주세요'}</option>
                      {v.subs.map((o) => (
                        <option value={o.value} key={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {err('categoryId')}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="pp" style={{ fontSize: '14px', fontWeight: '500' }}>
                      가격 (원)
                    </label>
                    <input
                      id="pp"
                      className={cx('in num', v.errors.price && 'in-error')}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      style={{ width: '100%' }}
                      value={v.price}
                      onChange={v.changePrice}
                      aria-invalid={!!v.errors.price}
                      aria-describedby={describedBy('price')}
                    />
                    {err('price') || <span className={cx('sub num')}>{v.priceLabel}</span>}
                  </div>
                  {v.editing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>재고</span>
                      <span className={cx('sub')} style={{ fontSize: '14px', lineHeight: '44px' }}>
                        재고는 <Link to="/seller/products">상품 관리</Link>의 재고 화면에서 바꿔요
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label htmlFor="ps" style={{ fontSize: '14px', fontWeight: '500' }}>
                        처음 재고
                      </label>
                      <input
                        id="ps"
                        className={cx('in num', v.errors.stock && 'in-error')}
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        style={{ width: '100%' }}
                        value={v.stock}
                        onChange={v.changeStock}
                        aria-invalid={!!v.errors.stock}
                        aria-describedby={describedBy('stock')}
                      />
                      {err('stock') || <span className={cx('sub')}>등록한 뒤에는 재고 화면에서만 바꿀 수 있어요</span>}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="pd" style={{ fontSize: '14px', fontWeight: '500' }}>
                    상품 설명
                  </label>
                  <textarea
                    id="pd"
                    className={cx('in', v.errors.description && 'in-error')}
                    style={{ minHeight: '160px', padding: '12px 14px' }}
                    value={v.description}
                    onChange={v.changeDescription}
                    aria-invalid={!!v.errors.description}
                    aria-describedby={describedBy('description')}
                  ></textarea>
                  {err('description')}
                </div>
              </section>
              <section
                className={cx('panel')}
                style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>이미지</h2>
                <p className={cx('sub')} style={{ margin: '-10px 0 0', fontSize: '14px' }}>
                  jpg, png, webp 파일을 한 장에 5MB까지 올릴 수 있어요.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>대표 이미지 (필수)</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
                    {v.thumbnail && (
                      <div className={cx('thumb')}>
                        <img src={v.thumbnail.url} alt="대표 이미지" />
                      </div>
                    )}
                    <button
                      type="button"
                      className={cx('btn', !v.thumbnail && 'add')}
                      onClick={() => thumbInput.current?.click()}
                      aria-describedby={describedBy('thumbnail')}
                    >
                      {v.thumbnail ? '바꾸기' : '대표 이미지 추가'}
                    </button>
                    <input
                      ref={thumbInput}
                      type="file"
                      accept={IMAGE_TYPES.join(',')}
                      onChange={v.pickThumbnail}
                      hidden
                    />
                  </div>
                  {err('thumbnail')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    상세 이미지 <span className={cx('sub num')}>{v.detailCount}</span>
                  </span>
                  <ol className={cx('details')}>
                    {v.details.map((d) => (
                      <li key={d.key} className={cx('detail', d.newStart && 'new-start')}>
                        <div className={cx('thumb')}>
                          <img src={d.url} alt={d.label} />
                          {d.isNew && v.editing && <span className={cx('chip c-blue badge')}>새 이미지</span>}
                        </div>
                        <div className={cx('detail-tools')}>
                          <button type="button" onClick={d.up} disabled={!d.canUp} aria-label={`${d.label} 앞으로`}>
                            ‹
                          </button>
                          <button type="button" onClick={d.down} disabled={!d.canDown} aria-label={`${d.label} 뒤로`}>
                            ›
                          </button>
                          <button type="button" onClick={d.remove} aria-label={`${d.label} 빼기`}>
                            ✕
                          </button>
                        </div>
                      </li>
                    ))}
                    {v.canAddDetail && (
                      <li>
                        <button
                          type="button"
                          className={cx('btn add')}
                          onClick={() => detailInput.current?.click()}
                          aria-describedby={describedBy('detailImages')}
                        >
                          이미지 추가
                        </button>
                        <input
                          ref={detailInput}
                          type="file"
                          accept={IMAGE_TYPES.join(',')}
                          multiple
                          onChange={v.pickDetails}
                          hidden
                        />
                      </li>
                    )}
                  </ol>
                  {err('detailImages')}
                  {v.editing && (
                    <span className={cx('sub')}>새로 추가한 이미지는 저장하면 기존 이미지 뒤에 붙어요.</span>
                  )}
                </div>
              </section>
            </div>
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 260px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>
                {v.editing ? '저장하면' : '등록하면'}
              </h2>
              <p style={{ margin: '0', fontSize: '14px', color: '#45454F' }}>
                {v.editing
                  ? '바뀐 내용만 바로 구매자 화면에 반영돼요. 재고는 바뀌지 않아요.'
                  : '바로 판매중으로 보여요. 재고가 0이 되면 품절로, 다시 채우면 판매중으로 자동으로 바뀌어요.'}
              </p>
              <button
                type="submit"
                className={cx('btn btn-p')}
                style={{ minHeight: '52px' }}
                disabled={v.saving || v.locked}
              >
                {v.submitLabel}
              </button>
              <Link className={cx('btn btn-q')} to="/seller/products">
                취소
              </Link>
            </aside>
          </form>
        )}
      </SellerLayout>
    </div>
  )
}
