import { useState } from 'react'
import { Link } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import PageHeader, { HeaderIcon } from '../../components/ui/PageHeader'
import { ErrorView, Loading, Tabs } from '../../components/ui/Misc'
import { useApi } from '../../lib/useApi'
import { categoryIcon } from '../../lib/products'
import { loadCategories } from './common'
import styles from './Category.module.css'

/** 대분류 이름 → 배너 (카테고리에 이미지 필드가 없어 프론트에서 정해요) */
const BANNERS: Record<string, { en: string; img: string }> = {
  뷰티: { en: 'BEAUTY', img: '/images/banner/beauty-creator.jpg' },
  의류: { en: 'FASHION', img: '/images/banner/dailylook-creator.jpg' },
}

/** ② 카테고리 */
export default function CategoryPage() {
  const categories = useApi(loadCategories, [])
  const tree = categories.data ?? []
  const [picked, setPicked] = useState<string>('')
  const cur = tree.find((g) => String(g.categoryId) === picked) ?? tree[0]
  const banner = (cur && BANNERS[cur.name]) ?? { en: 'PALETTE', img: '/images/banner/influencer-pick.jpg' }

  return (
    <AppFrame tab="category">
      <PageHeader
        title={
          <Link to="/" aria-label="팔레트 홈" className={styles.logo}>
            <img src="/images/logo.png" alt="Palette" />
            <span className={styles.sr}>카테고리</span>
          </Link>
        }
        right={<HeaderIcon to="/search" icon="search" label="검색" />}
      />

      {categories.loading && !categories.data && <Loading />}
      {categories.error && <ErrorView message={categories.error} onRetry={categories.reload} />}

      {cur && (
        <>
          <div className={styles.tabs}>
            <Tabs
              label="대분류"
              items={tree.map((g) => ({ value: String(g.categoryId), label: g.name }))}
              value={String(cur.categoryId)}
              onChange={setPicked}
            />
          </div>

          <Link to={`/products?categoryId=${cur.categoryId}`} className={styles.banner}>
            <img src={banner.img} alt="" />
            <span className={styles.shade} />
            <span className={styles.bannerText}>
              <span className={styles.en}>{banner.en}</span>
              <span className={styles.bannerTitle}>{cur.name} 전체 보기</span>
              <span className={styles.go}>상품 둘러보기 →</span>
            </span>
          </Link>

          <section aria-label="소분류" className={styles.grid}>
            {cur.children.map((c) => (
              <Link key={c.categoryId} to={`/products?categoryId=${c.categoryId}`} className={styles.sub}>
                <span className={styles.icon}>
                  <img src={categoryIcon(c.name, cur.name)} alt="" />
                </span>
                {c.name}
              </Link>
            ))}
          </section>
        </>
      )}
    </AppFrame>
  )
}
