import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, Thumb, won } from '../../components/ui/Misc'
import { searchProducts } from '../../lib/api/product'
import { useApi } from '../../lib/useApi'
import { useDebounced } from '../../lib/useDebounced'
import { MOCK_PICKS, type PickItem } from './mock'
import s from './influencer.module.css'

/**
 * I1 내 pick
 * 상품 검색은 실제 상품 검색 API(searchProducts)를 쓰고, pick 추가·해제는 목업이에요.
 * TODO(API 미구현): GET /api/v1/influencer/picks, POST /api/v1/influencer/picks { productId },
 *   DELETE /api/v1/influencer/picks/{pickId} (진행 중인 상품 쿠폰이 있으면 409) — 지금은 화면 안 상태만 바뀌어요
 */
export default function InfluencerPicksPage() {
  const [picks, setPicks] = useState<PickItem[]>(MOCK_PICKS)
  const [keyword, setKeyword] = useState('')
  const [msg, setMsg] = useState('')
  const q = useDebounced(keyword.trim(), 300)
  const results = useApi(
    () => (q ? searchProducts({ keyword: q, size: 5 }).then((r) => r.items) : Promise.resolve([])),
    [q],
  )
  const picked = new Set(picks.map((p) => p.productId))

  function add(p: { productId: number; name: string; price: number; thumbnailUrl: string | null }) {
    if (picked.has(p.productId)) return
    setPicks((list) => [{ ...p, pickId: Date.now(), hasActiveCoupon: false }, ...list])
    setKeyword('')
    setMsg(`${p.name}을(를) pick했어요.`)
  }

  function remove(p: PickItem) {
    setPicks((list) => list.filter((x) => x.pickId !== p.pickId))
    setMsg(`${p.name} pick을 해제했어요.`)
  }

  return (
    <AppFrame>
      <PageHeader title="내 pick" badge="인플루언서" back="/mypage" />
      <div className={s.searchWrap}>
        <label className={s.search}>
          <Icon name="search" size={18} />
          <input
            aria-label="판매 중인 상품 검색"
            placeholder="판매 중인 상품을 찾아 pick하기"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </label>
        {q && (
          <ul className={s.results} aria-label="검색 결과">
            {results.loading && <li>찾는 중이에요…</li>}
            {results.error && <li>{results.error}</li>}
            {!results.loading && results.data?.length === 0 && <li>맞는 상품이 없어요</li>}
            {results.data?.map((p) => (
              <li key={p.productId}>
                <Thumb src={p.thumbnailUrl} width={40} height={40} />
                <span className={s.info}>
                  <span>{p.name}</span>
                  <b>{won(p.price)}</b>
                </span>
                <Button size="sm" variant={picked.has(p.productId) ? 'soft' : 'primary'} disabled={picked.has(p.productId)} onClick={() => add(p)}>
                  {picked.has(p.productId) ? 'pick함' : 'pick'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className={s.hint}>
        pick한 상품 {picks.length}개 · 같은 상품은 한 번만 pick할 수 있어요. 상품 상세에 내 이름이 보여요.
      </p>
      {msg && (
        <p role="status" className={s.msg}>
          {msg} (목업: 서버에는 아직 저장되지 않아요)
        </p>
      )}
      {picks.length === 0 && <Empty title="아직 pick한 상품이 없어요">위에서 상품을 찾아 pick해 보세요.</Empty>}
      <ul className={s.list}>
        {picks.map((p) => (
          <li key={p.pickId}>
            <div className={s.row}>
              <Link to={`/product/${p.productId}`}>
                <Thumb src={p.thumbnailUrl} width={56} height={56} />
              </Link>
              <span className={s.info}>
                <span>{p.name}</span>
                <b>{won(p.price)}</b>
              </span>
              <Button variant="outline" size="sm" disabled={p.hasActiveCoupon} onClick={() => remove(p)}>
                pick 해제
              </Button>
            </div>
            {p.hasActiveCoupon && (
              <p className={s.warn}>
                진행 중인 상품 쿠폰이 있어 해제할 수 없어요. 쿠폰이 끝나거나 중지된 뒤 해제할 수 있어요.
              </p>
            )}
          </li>
        ))}
      </ul>
    </AppFrame>
  )
}
