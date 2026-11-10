import { Link, useParams, useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Empty, ErrorView, Loading, Thumb, won } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { AiTag, imageOf, loadProduct } from './common'
import { MOCK_PROFILE } from './mock'
import styles from './DetailMatch.module.css'

// TODO(API 미구현): AI 피부 맞춤 분석 — 맞춤도·이유·주요 성분·전성분(판매자 입력)이 API에 없어 고정 목업이에요
const MATCH = {
  rate: 92,
  reasons: [
    '선호 성분 2개 포함 · 시카(병풀), 나이아신아마이드',
    '피하는 성분(인공 향료 · 알코올) 없음',
  ],
  creator: '[크리에이터 A]',
  ingredients: [
    { name: '시카(병풀)', mine: true },
    { name: '나이아신아마이드', mine: true },
    { name: '판테놀', mine: false },
    { name: '세라마이드', mine: false },
  ],
}

/**
 * ④ 상품 상세 · AI 매칭 블록
 * 기존 상세의 가격·배송 아래, 옵션 선택 위에 들어가는 내용을 따로 보여줘요.
 * ?avoid=1 이면 피하는 성분이 들어 있을 때의 안내를 보여줘요.
 */
export default function DetailMatchPage() {
  const { productId: idParam } = useParams()
  const productId = Number(idParam)
  const [params] = useSearchParams()
  const avoid = params.get('avoid') === '1'
  const loaded = useApi(() => loadProduct(productId), [productId])
  const product = loaded.data

  return (
    <AppFrame
      bottom={
        product && (
          <BottomBar>
            <Button to={`/product/${productId}`}>상품 상세로 돌아가기</Button>
          </BottomBar>
        )
      }
    >
      <PageHeader back title="상품 상세" />
      {loaded.loading && !product && <Loading />}
      {loaded.error && <ErrorView message={loaded.error} onRetry={loaded.reload} />}
      {!loaded.loading && !loaded.error && !product && <Empty title="판매하지 않는 상품이에요" />}

      {product && (
        <>
          <Link to={`/product/${productId}`} className={styles.product}>
            <Thumb src={imageOf(product)} width={64} height={64} radius={10} />
            <div>
              <p className={styles.brand}>{product.businessName}</p>
              <p className={styles.name}>{product.name}</p>
              <p className={styles.price}>{won(product.price)}</p>
            </div>
          </Link>

          <section aria-labelledby="mm" className={styles.match}>
            <div className={styles.matchHead}>
              <span className={styles.rate}>{MATCH.rate}%</span>
              <div>
                <h2 id="mm">
                  내 피부와 잘 맞아요 <AiTag />
                </h2>
                <p>{[...MOCK_PROFILE.type, ...MOCK_PROFILE.concern].join(' · ')} 기준</p>
              </div>
            </div>
            <ul className={styles.reasons}>
              {MATCH.reasons.map((r) => (
                <li key={r}>
                  <Icon name="check" size={16} />
                  <span>{r}</span>
                </li>
              ))}
              <li>
                <Icon name="check" size={16} />
                <span>
                  나와 피부가 비슷한 <Link to="/recommend?tab=creator">{MATCH.creator}</Link>의 pick
                </span>
              </li>
            </ul>
          </section>

          {avoid && (
            <section aria-label="성분 주의" className={styles.caution}>
              <Icon name="close" size={18} />
              <p>
                <b>피하는 성분 1개가 들어 있어요</b>
                <br />
                인공 향료 · 전성분 9번째
              </p>
            </section>
          )}

          <section aria-labelledby="ig" className={styles.ingredients}>
            <h2 id="ig">주요 성분</h2>
            <div className={styles.chips}>
              {MATCH.ingredients.map((i) => (
                <span key={i.name} className={i.mine ? styles.chipMine : styles.chip}>
                  {i.name}
                  {i.mine && ' · 내 선호'}
                </span>
              ))}
            </div>
            <details className={styles.all}>
              <summary>전성분 보기</summary>
              <p>[판매자가 상품 등록 때 입력한 전성분]</p>
            </details>
            <p className={styles.note}>
              성분 정보는 판매자가 등록한 내용이에요. 맞춤 정도는 참고용이며 피부 상태에 따라 다를 수 있어요.
            </p>
          </section>
        </>
      )}
    </AppFrame>
  )
}
