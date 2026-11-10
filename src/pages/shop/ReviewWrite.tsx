import { useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, Thumb } from '../../components/ui/Misc'
import form from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import { createReview } from '../../lib/api/review'
import styles from './ReviewWrite.module.css'

const MIN = 10
const MAX = 1000
const WORDS = ['', '별로예요', '그저 그래요', '괜찮아요', '좋아요', '아주 좋아요']

/** 주문 화면에서 넘겨주면 위에 상품 정보를 보여줘요. (없어도 쓸 수 있어요) */
export type ReviewWriteState = {
  productName?: string | null
  optionName?: string | null
  thumbnailUrl?: string | null
  quantity?: number
} | null

/**
 * ④-2 리뷰 작성 (/reviews/write?orderItemId=)
 * 리뷰 사진은 정책상 넣지 않기로 해서 사진 첨부 UI가 없어요.
 */
export default function ReviewWritePage() {
  const [params] = useSearchParams()
  const orderItemId = Number(params.get('orderItemId')) || 0
  const navigate = useNavigate()
  const item = useLocation().state as ReviewWriteState

  const [rating, setRating] = useState(5)
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const len = content.trim().length
  const tooShort = len < MIN

  const submit = async () => {
    if (busy || tooShort || !orderItemId) return
    setBusy(true)
    setError('')
    try {
      await createReview({ orderItemId, rating, content: content.trim() })
      navigate('/mypage/reviews', { replace: true, state: { notice: '리뷰를 등록했어요' } })
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  if (!orderItemId)
    return (
      <AppFrame>
        <PageHeader back title="리뷰 작성" />
        <Empty title="리뷰를 쓸 주문을 찾지 못했어요" action={<Button to="/orders" variant="outline" size="sm">주문 내역 보기</Button>}>
          구매 확정한 주문에서 리뷰 쓰기를 눌러 주세요.
        </Empty>
      </AppFrame>
    )

  return (
    <AppFrame
      bottom={
        <BottomBar note={tooShort ? `후기를 ${MIN}자 이상 적어 주세요` : undefined}>
          <Button disabled={busy || tooShort} onClick={submit}>
            {busy ? '등록하는 중이에요' : '리뷰 등록하기'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader back title="리뷰 작성" />

      {item?.productName && (
        <div className={styles.item}>
          <Thumb src={item.thumbnailUrl} width={56} height={56} radius={8} />
          <div>
            <p className={styles.itemName}>{item.productName}</p>
            <p className={styles.itemOpt}>
              {[item.optionName, item.quantity ? `${item.quantity}개` : ''].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <fieldset className={styles.rating}>
        <legend>상품은 어떠셨나요?</legend>
        <div role="radiogroup" aria-label="별점" className={styles.stars}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === rating}
              aria-label={`${i}점`}
              className={i <= rating ? styles.starOn : styles.star}
              onClick={() => setRating(i)}
            >
              <Icon name="star" size={36} strokeWidth={1.4} fill={i <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <p className={styles.ratingText}>
          {rating}점 · {WORDS[rating]}
        </p>
      </fieldset>

      <div className={`${form.field} ${styles.textBox}`}>
        <label htmlFor="rv-text" className={form.label}>
          후기
        </label>
        <textarea
          id="rv-text"
          rows={6}
          className={form.textarea}
          placeholder="사이즈, 색감, 사용감처럼 다른 분께 도움이 될 내용을 적어 주세요 (10~1,000자)"
          maxLength={MAX}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <p className={styles.counter}>
          {content.length.toLocaleString('ko-KR')} / {MAX.toLocaleString('ko-KR')}
        </p>
      </div>

      <p className={styles.notice}>
        등록한 리뷰는 고칠 수 없고 삭제만 할 수 있어요. 삭제하면 이 주문으로 다시 쓸 수 없어요.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </AppFrame>
  )
}
