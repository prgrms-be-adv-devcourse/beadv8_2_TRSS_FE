import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Empty, ErrorView, Loading, Segment } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { ApiError, errorMessage } from '../../lib/api'
import {
  createProduct,
  getCategories,
  getSellerProductForm,
  modifyProduct,
  type ProductModifyRequest,
  type SellerProductForm,
} from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { Notice, digits } from './shared'
import s from './seller.module.css'
import pf from './ProductForm.module.css'

/** 백엔드 제약 (ProductCreateRequest·이미지 검사) */
const NAME_MAX = 100
const DETAIL_MAX = 10
const IMAGE_MAX_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
/** 옵션 그룹 최대 개수 (TRSS-201 확정: 2개) */
const GROUP_MAX = 2
/** 한 그룹의 값 최대 개수 */
const VALUE_MAX = 10

type Field = 'name' | 'categoryId' | 'price' | 'stock' | 'description' | 'thumbnail' | 'detailImages' | 'options'
type Errors = Partial<Record<Field, string>>

/** 상세 이미지 한 장. 기존 이미지는 imageId, 새로 고른 이미지는 file이 있어요. */
type DetailImage = { key: string; url: string; imageId?: number; file?: File }
type Thumbnail = { url: string; file?: File } | null
type OptionGroup = { key: string; name: string; values: string[] }

/** 백엔드 오류 코드 → 오류를 붙일 칸 */
const CODE_FIELD: Record<string, Field> = {
  THUMBNAIL_REQUIRED: 'thumbnail',
  IMAGE_TYPE_NOT_ALLOWED: 'detailImages',
  DETAIL_IMAGE_LIMIT_EXCEEDED: 'detailImages',
  DETAIL_IMAGE_NOT_FOUND: 'detailImages',
  CATEGORY_NOT_SELECTABLE: 'categoryId',
  CATEGORY_NOT_FOUND: 'categoryId',
}

function imageProblem(file: File) {
  if (!IMAGE_TYPES.includes(file.type)) return `${file.name}: jpg, png, webp 이미지만 올릴 수 있어요.`
  if (file.size > IMAGE_MAX_BYTES) return `${file.name}: 한 장에 5MB까지 올릴 수 있어요.`
  return ''
}

let keySeq = 0
const nextKey = () => `n${++keySeq}`

/** 옵션 값 조합 (블랙 / M …) */
function combosOf(groups: OptionGroup[]) {
  const used = groups.filter((g) => g.values.length > 0)
  if (used.length === 0) return []
  return used.reduce<string[]>(
    (acc, g) => (acc.length === 0 ? [...g.values] : acc.flatMap((a) => g.values.map((v) => `${a} / ${v}`))),
    [],
  )
}

/**
 * S2 상품 등록·수정 (+ 뷰티 카테고리면 성분 입력)
 * productId가 있으면 수정 모드: 폼을 채우고, 저장할 때 바뀐 값만 보내요.
 */
export default function SellerProductFormPage() {
  const desktop = useIsDesktop()
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
  const original = loaded.data as SellerProductForm | null

  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [thumbnail, setThumbnail] = useState<Thumbnail>(null)
  const [details, setDetails] = useState<DetailImage[]>([])
  // 옵션과 재고 (등록 때만)
  const [optionMode, setOptionMode] = useState<'none' | 'use'>('none')
  const [stock, setStock] = useState('')
  const [groups, setGroups] = useState<OptionGroup[]>([{ key: nextKey(), name: '', values: [] }])
  const [valueInputs, setValueInputs] = useState<Record<string, string>>({})
  const [comboStock, setComboStock] = useState<Record<string, string>>({})
  // 뷰티 성분
  const [perOption, setPerOption] = useState(false)
  const [ingredients, setIngredients] = useState<Record<string, string>>({})

  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [locked, setLocked] = useState(false)
  const [saving, setSaving] = useState(false)

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

  const thumbInput = useRef<HTMLInputElement>(null)
  const detailInput = useRef<HTMLInputElement>(null)

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
    const ok = files.filter((file) => !imageProblem(file))
    const room = DETAIL_MAX - details.length
    const added = ok.slice(0, room)
    if (ok.length > room) problems.push(`상세 이미지는 ${DETAIL_MAX}장까지 올릴 수 있어요.`)
    setErrors((er) => ({ ...er, detailImages: problems.join(' ') || undefined }))
    if (added.length) setDetails((d) => [...d, ...added.map((file) => ({ key: nextKey(), url: preview(file), file }))])
  }
  /** 새로 고른 이미지는 저장하면 기존 이미지 뒤에 붙어요(백엔드 규칙). 그래서 순서 바꾸기는 기존끼리, 새 이미지끼리만 해요. */
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

  // ── 옵션 ──
  const combos = combosOf(groups)
  const optionTotal = combos.reduce((sum, k) => sum + (Number(comboStock[k]) || 0), 0)
  const changeGroupName = (key: string, v: string) =>
    setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, name: v.slice(0, 20) } : g)))
  const addValue = (key: string) => {
    const v = (valueInputs[key] ?? '').trim().slice(0, 30)
    if (!v) return
    setGroups((gs) =>
      gs.map((g) =>
        g.key === key && !g.values.includes(v) && g.values.length < VALUE_MAX ? { ...g, values: [...g.values, v] } : g,
      ),
    )
    setValueInputs((m) => ({ ...m, [key]: '' }))
    clearError('options')
  }
  const onValueKey = (key: string) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addValue(key)
    }
  }
  const removeValue = (key: string, v: string) =>
    setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, values: g.values.filter((x) => x !== v) } : g)))
  const removeGroup = (key: string) =>
    setGroups((gs) => (gs.length > 1 ? gs.filter((g) => g.key !== key) : [{ key: nextKey(), name: '', values: [] }]))
  const addGroup = () =>
    setGroups((gs) => (gs.length >= GROUP_MAX ? gs : [...gs, { key: nextKey(), name: '', values: [] }]))

  // ── 카테고리 ──
  const tree = categories.data ?? []
  const parent = tree.find((g) => g.categoryId === parentId)
  const beauty = !!parent && parent.name.includes('뷰티')
  const firstGroup = groups.find((g) => g.values.length > 0)
  const ingredientKeys = optionMode === 'use' && perOption && firstGroup ? firstGroup.values : ['all']

  const validate = (): Errors => {
    const e: Errors = {}
    if (!name.trim()) e.name = '상품명을 입력해 주세요.'
    else if (name.trim().length > NAME_MAX) e.name = `상품명은 ${NAME_MAX}자까지 쓸 수 있어요.`
    if (!categoryId) e.categoryId = '소분류를 골라 주세요.'
    if (!(Number(price) > 0)) e.price = '가격은 1원 이상이어야 해요.'
    if (!editing) {
      if (optionMode === 'none' && !(Number(stock) > 0)) e.stock = '처음 재고는 1개 이상이어야 해요.'
      if (optionMode === 'use') {
        if (groups.some((g) => g.values.length > 0 && !g.name.trim())) e.options = '옵션 이름을 입력해 주세요.'
        else if (combos.length === 0) e.options = '옵션 값을 하나 이상 추가해 주세요.'
        else if (optionTotal <= 0) e.options = '옵션별 처음 재고를 1개 이상 입력해 주세요.'
      }
    }
    if (!description.trim()) e.description = '상품 설명을 입력해 주세요.'
    if (!thumbnail) e.thumbnail = '대표 이미지를 올려 주세요.'
    return e
  }

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

  const handleError = (e: unknown) => {
    if (!(e instanceof ApiError)) return setFormError(errorMessage(e))
    const fieldErrors = (e.data as { fieldErrors?: Array<{ field: string; reason: string }> } | null)?.fieldErrors
    if (fieldErrors?.length) {
      const next: Errors = {}
      const rest: string[] = []
      for (const fe of fieldErrors) {
        const key = (['name', 'categoryId', 'price', 'stock', 'description'] as Field[]).find((k) => fe.field === k)
        if (key) next[key] = fe.reason
        else if (fe.field === 'detailImageIds') next.detailImages = fe.reason
        else rest.push(fe.reason)
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
        // TODO(API 미구현): 옵션 그룹(최대 2개)·조합별 재고 등록 — 지금 백엔드는 상품마다 기본 옵션 1개(stock 하나)만 받아요.
        //   옵션을 쓰면 조합별 재고 합계를 기본 옵션 재고로 보내고, 옵션 그룹·값은 보내지 않아요.
        // TODO(API 미구현): 뷰티 전성분 저장 — ProductCreateRequest에 성분 필드가 없어 화면에만 둬요.
        const initialStock = optionMode === 'use' ? optionTotal : Number(stock)
        await createProduct(
          { name: name.trim(), price: Number(price), categoryId: categoryId!, description, stock: initialStock },
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

  const err = (field: Field) =>
    errors[field] && (
      <p className={f.error} id={`${field}-error`} role="alert">
        {errors[field]}
      </p>
    )
  const describedBy = (field: Field) => (errors[field] ? `${field}-error` : undefined)

  const title = editing ? '상품 수정' : '상품 등록'
  const submitLabel = saving ? '저장하는 중이에요' : editing ? '저장하기' : '등록하기'
  const loading = (editing && loaded.loading && !original) || (categories.loading && !categories.data)
  const loadError = loaded.error || categories.error
  const notFound = editing && !loaded.loading && !loaded.error && !original
  const ready = !loading && !loadError && !notFound
  const firstNew = details.findIndex((d) => d.file)

  const submitBtn = (
    <Button type="submit" form="product-form" size={desktop ? 'md' : 'lg'} disabled={saving || locked || !ready}>
      {submitLabel}
    </Button>
  )

  /* ── 섹션: 기본 정보 + 이미지 ── */
  const basicSection = (
    <section className={pf.card} aria-labelledby="pf-basic">
      <h2 id="pf-basic" className={pf.h2}>
        기본 정보
      </h2>
      <div className={f.field}>
        <label htmlFor="pn" className={f.label}>
          상품명
        </label>
        <input
          id="pn"
          className={f.input}
          placeholder="예: 라이트 윈드브레이커"
          value={name}
          onChange={(e) => {
            setName(e.target.value.slice(0, NAME_MAX))
            clearError('name')
          }}
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name')}
        />
        <div className={pf.between}>
          {err('name') || <span />}
          <span className={f.help}>
            {name.length}/{NAME_MAX}
          </span>
        </div>
      </div>
      <div className={pf.grid3}>
        <div className={f.field}>
          <label htmlFor="c1" className={f.label}>
            대분류
          </label>
          <select
            id="c1"
            className={f.select}
            value={parentId ? String(parentId) : ''}
            onChange={(e) => {
              setParentId(Number(e.target.value) || null)
              setCategoryId(null) // 대분류를 바꾸면 소분류를 다시 골라요
            }}
          >
            <option value="">고르기</option>
            {tree.map((g) => (
              <option key={g.categoryId} value={g.categoryId}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div className={f.field}>
          <label htmlFor="c2" className={f.label}>
            소분류
          </label>
          <select
            id="c2"
            className={f.select}
            value={categoryId ? String(categoryId) : ''}
            disabled={!parentId}
            onChange={(e) => {
              setCategoryId(Number(e.target.value) || null)
              clearError('categoryId')
            }}
            aria-invalid={!!errors.categoryId}
            aria-describedby={describedBy('categoryId')}
          >
            <option value="">{parentId ? '고르기' : '대분류 먼저'}</option>
            {(parent?.children ?? []).map((ch) => (
              <option key={ch.categoryId} value={ch.categoryId}>
                {ch.name}
              </option>
            ))}
          </select>
          {err('categoryId')}
        </div>
        <div className={f.field}>
          <label htmlFor="pr" className={f.label}>
            가격
          </label>
          <div className={pf.unitInput}>
            <input
              id="pr"
              className={f.input}
              inputMode="numeric"
              placeholder="0"
              value={price ? Number(price).toLocaleString('ko-KR') : ''}
              onChange={(e) => {
                setPrice(digits(e.target.value).slice(0, 10))
                clearError('price')
              }}
              aria-invalid={!!errors.price}
              aria-describedby={describedBy('price')}
            />
            <span>원</span>
          </div>
          {err('price')}
        </div>
      </div>
      {beauty && !editing && <p className={f.help}>뷰티를 고르면 성분 입력이 나타나요.</p>}
      <div className={f.field}>
        <label htmlFor="ds" className={f.label}>
          상품 설명
        </label>
        <textarea
          id="ds"
          className={f.textarea}
          rows={7}
          placeholder="소재, 용량, 사용법처럼 구매자가 궁금해할 내용을 적어 주세요"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            clearError('description')
          }}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy('description')}
        />
        {err('description')}
      </div>

      <h2 className={pf.h2}>이미지</h2>
      <div className={pf.images}>
        {thumbnail ? (
          <span className={pf.img}>
            <img src={thumbnail.url} alt="대표 이미지" />
            <span className={pf.imgTag}>대표</span>
            <button type="button" className={pf.imgBtn} onClick={() => thumbInput.current?.click()}>
              바꾸기
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={pf.addImg}
            onClick={() => thumbInput.current?.click()}
            aria-describedby={describedBy('thumbnail')}
          >
            <Icon name="camera" size={20} />
            대표 이미지
          </button>
        )}
        {details.map((d, i) => (
          <span key={d.key} className={`${pf.img} ${editing && i === firstNew && firstNew > 0 ? pf.newStart : ''}`}>
            <img src={d.url} alt={`상세 이미지 ${i + 1}`} />
            {d.file && editing && <span className={pf.imgTag}>새 이미지</span>}
            <span className={pf.imgTools}>
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={!(i > 0 && !!details[i - 1].file === !!d.file)}
                aria-label={`상세 이미지 ${i + 1} 앞으로`}
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={!(i < details.length - 1 && !!details[i + 1].file === !!d.file)}
                aria-label={`상세 이미지 ${i + 1} 뒤로`}
              >
                ›
              </button>
              <button type="button" onClick={() => removeDetail(d.key)} aria-label={`상세 이미지 ${i + 1} 빼기`}>
                ✕
              </button>
            </span>
          </span>
        ))}
        {details.length < DETAIL_MAX && (
          <button
            type="button"
            className={pf.addImg}
            onClick={() => detailInput.current?.click()}
            aria-describedby={describedBy('detailImages')}
          >
            <Icon name="plus" size={20} />
            이미지 추가
          </button>
        )}
        <input ref={thumbInput} type="file" accept={IMAGE_TYPES.join(',')} onChange={pickThumbnail} hidden />
        <input ref={detailInput} type="file" accept={IMAGE_TYPES.join(',')} multiple onChange={pickDetails} hidden />
      </div>
      {err('thumbnail')}
      {err('detailImages')}
      <p className={f.help}>
        대표 1장 필수 · 상세 최대 {DETAIL_MAX}장({details.length}/{DETAIL_MAX}) · jpg·png·webp, 장당 5MB
        {editing && ' · 새로 추가한 이미지는 저장하면 기존 이미지 뒤에 붙어요.'}
      </p>
    </section>
  )

  /* ── 섹션: 옵션과 재고 ── */
  const optionSection = (
    <section className={pf.card} aria-labelledby="pf-opt">
      <div className={pf.between}>
        <h2 id="pf-opt" className={pf.h2}>
          옵션과 재고
        </h2>
        <span className={f.help}>옵션은 최대 {GROUP_MAX}개</span>
      </div>
      {editing ? (
        <p className={pf.para}>
          재고는 등록한 뒤에는 <Link to={`/seller/stock?productId=${productId}`}>재고 화면</Link>에서 옵션별로만 바꿀 수
          있어요. 저장해도 재고는 바뀌지 않아요.
        </p>
      ) : (
        <>
          {beauty && <p className={f.help}>예: 색상(호수) · 종류 · 용량 · 구성</p>}
          <Segment
            label="옵션 사용"
            value={optionMode}
            onChange={(v) => {
              setOptionMode(v)
              clearError('options')
              clearError('stock')
            }}
            items={[
              { value: 'none', label: '옵션 없음' },
              { value: 'use', label: '옵션 사용' },
            ]}
          />
          {optionMode === 'none' ? (
            <div className={`${f.field} ${pf.mt}`}>
              <label htmlFor="st0" className={f.label}>
                처음 재고
              </label>
              <div className={pf.unitInput}>
                <input
                  id="st0"
                  className={f.input}
                  inputMode="numeric"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => {
                    setStock(digits(e.target.value).slice(0, 6))
                    clearError('stock')
                  }}
                  aria-invalid={!!errors.stock}
                  aria-describedby={describedBy('stock')}
                />
                <span>개</span>
              </div>
              {err('stock')}
            </div>
          ) : (
            <div className={pf.mt}>
              {groups.map((g, gi) => (
                <div key={g.key} className={pf.group}>
                  <div className={pf.groupHead}>
                    <span className={pf.groupNo}>옵션 {gi + 1}</span>
                    <input
                      aria-label={`옵션 ${gi + 1} 이름`}
                      className={`${f.input} ${pf.groupName}`}
                      placeholder={gi === 0 ? '예: 색상' : '예: 사이즈'}
                      value={g.name}
                      onChange={(e) => changeGroupName(g.key, e.target.value)}
                    />
                    <button type="button" className={pf.textBtn} onClick={() => removeGroup(g.key)}>
                      삭제
                    </button>
                  </div>
                  <div className={pf.values}>
                    {g.values.map((v) => (
                      <span key={v} className={pf.value}>
                        {v}
                        <button type="button" aria-label={`${v} 빼기`} onClick={() => removeValue(g.key, v)}>
                          ✕
                        </button>
                      </span>
                    ))}
                    {g.values.length < VALUE_MAX && (
                      <span className={pf.valueAdd}>
                        <input
                          aria-label={`옵션 ${gi + 1} 값 입력`}
                          placeholder="값 입력"
                          value={valueInputs[g.key] ?? ''}
                          onChange={(e) => setValueInputs((m) => ({ ...m, [g.key]: e.target.value }))}
                          onKeyDown={onValueKey(g.key)}
                        />
                        <button type="button" onClick={() => addValue(g.key)}>
                          + 값 추가
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <button type="button" className={pf.addGroup} onClick={addGroup} disabled={groups.length >= GROUP_MAX}>
                + 옵션 추가 ({groups.length}/{GROUP_MAX})
              </button>
              <h3 className={pf.h3}>
                옵션별 처음 재고 <span>{combos.length}개 조합</span>
              </h3>
              {combos.length === 0 ? (
                <p className={f.help}>옵션 값을 추가하면 조합별로 재고를 넣을 수 있어요.</p>
              ) : (
                <ul className={pf.combos}>
                  {combos.map((k) => (
                    <li key={k}>
                      <span>{k}</span>
                      <span className={pf.unitInput}>
                        <input
                          aria-label={`${k} 재고`}
                          className={f.input}
                          inputMode="numeric"
                          placeholder="0"
                          value={comboStock[k] ?? ''}
                          onChange={(e) => {
                            setComboStock((m) => ({ ...m, [k]: digits(e.target.value).slice(0, 6) }))
                            clearError('options')
                          }}
                        />
                        <span>개</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {err('options')}
              <Notice tone="info">
                옵션별 등록은 준비 중이에요. 지금은 조합별 재고 합계({optionTotal}개)가 한 번에 등록돼요.
              </Notice>
            </div>
          )}
          <p className={`${f.help} ${pf.mt}`}>재고는 등록한 뒤에는 재고 화면에서 옵션별로만 바꿀 수 있어요.</p>
        </>
      )}
    </section>
  )

  /* ── 섹션: 성분 (뷰티) ── */
  // TODO(API 미구현): 상품 전성분 저장·조회 — 백엔드에 성분 필드가 없어 입력값은 화면에만 남아요.
  const ingredientSection = beauty ? (
    <section className={pf.card} aria-labelledby="pf-ing">
      <div className={pf.between}>
        <h2 id="pf-ing" className={pf.h2}>
          성분
        </h2>
        <span className={pf.req}>필수</span>
      </div>
      {optionMode === 'use' && firstGroup && (
        <label className={f.check}>
          <input type="checkbox" checked={perOption} onChange={(e) => setPerOption(e.target.checked)} />
          옵션 1({firstGroup.name || '옵션'})마다 전성분이 달라요
        </label>
      )}
      {ingredientKeys.map((k) => (
        <div key={k} className={f.field}>
          <label htmlFor={`ing-${k}`} className={f.label}>
            {k === 'all' ? '전성분' : `${k} 전성분`}
          </label>
          <textarea
            id={`ing-${k}`}
            className={f.textarea}
            rows={4}
            placeholder="정제수, 병풀추출물, 나이아신아마이드, …"
            value={ingredients[k] ?? ''}
            onChange={(e) => setIngredients((m) => ({ ...m, [k]: e.target.value }))}
          />
        </div>
      ))}
      <p className={f.help}>
        패키지에 적힌 순서대로 쉼표로 구분해 붙여넣어 주세요. 상품 상세 “전성분 보기”에 선택한 옵션 기준으로 보여요.
      </p>
    </section>
  ) : null

  return (
    <ConsoleShell
      variant="seller"
      active="products"
      title={title}
      description={
        <>
          <Link to="/seller/products">상품 관리</Link> › {title}
          {beauty && ' · 뷰티 카테고리는 성분 입력이 추가돼요'}
        </>
      }
      back="/seller/products"
      hideMobileNav
      actions={
        <>
          <Button variant="outline" to="/seller/products">
            취소
          </Button>
          {submitBtn}
        </>
      }
      bottom={ready ? <BottomBar>{submitBtn}</BottomBar> : undefined}
    >
      {loading && <Loading />}
      {loadError && (
        <ErrorView
          message={`불러오지 못했어요. ${loadError}`}
          onRetry={() => {
            loaded.reload()
            categories.reload()
          }}
        />
      )}
      {notFound && (
        <Empty
          title="상품을 찾을 수 없어요"
          action={
            <Button variant="outline" size="sm" to="/seller/products">
              상품 관리로
            </Button>
          }
        >
          삭제됐거나 다른 판매자의 상품이에요.
        </Empty>
      )}
      {ready && (
        <form id="product-form" onSubmit={submit} noValidate>
          {formError && (
            <div className={desktop ? s.gapBottom : s.mobileBlock}>
              <Notice tone="error">{formError}</Notice>
            </div>
          )}
          <div className={`${pf.layout} ${beauty ? pf.layoutBeauty : ''}`}>
            {basicSection}
            {optionSection}
            {ingredientSection}
          </div>
        </form>
      )}
    </ConsoleShell>
  )
}
