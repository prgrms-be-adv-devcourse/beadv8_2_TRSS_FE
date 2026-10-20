import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './CurationBanner.module.css'

const cx = makeCx(styles)

type Props = {
  /** 대분류 카테고리 (이름으로 뷰티·의류 ID를 찾아 바로가기 링크를 만들어요) */
  categories: Array<{ id: number; name: string }>
}

type Slide = {
  key: 'pick' | 'beauty' | 'daily' | 'special'
  code: string
  title: string
  /** 제목 중 강조할 부분 (구독자 특별가의 '특별가') */
  accent?: string
  desc: string
  cta: string
  to: string
  img?: string
}

/**
 * 메인 상단 기획전 배너
 *
 * 인플루언서는 시스템 사용자가 아니라서 배너 문구·이미지는 프론트 고정값이에요.
 * 바로가기는 기존 상품 목록 쿼리(category, sort)로 연결해요.
 */
export default function CurationBanner({ categories }: Props) {
  const categoryLink = (name: string) => {
    const found = categories.find((c) => c.name === name)
    return found ? `/?category=${found.id}` : '/'
  }

  const slides: Slide[] = [
    {
      key: 'pick',
      code: 'PALETTE No.01',
      title: '인플루언서\nPICK',
      desc: '크리에이터들이 많이 고른 아이템',
      cta: 'PICK 보기',
      // TODO: 인플루언서 PICK 연결 대상 확정 후 변경
      to: '/',
      img: '/images/banner/influencer-pick.jpg',
    },
    {
      key: 'beauty',
      code: 'PALETTE No.02',
      title: '뷰티 크리에이터\n추천',
      desc: '뷰티 카테고리 바로가기',
      cta: '뷰티 보기',
      to: categoryLink('뷰티'),
      img: '/images/banner/beauty-creator.jpg',
    },
    {
      key: 'daily',
      code: 'PALETTE No.03',
      title: '데일리룩\n크리에이터 추천',
      desc: '의류 카테고리 바로가기',
      cta: '의류 보기',
      to: categoryLink('의류'),
      img: '/images/banner/dailylook-creator.jpg',
    },
    {
      key: 'special',
      code: 'PALETTE No.04',
      title: '구독자\n',
      accent: '특별가',
      desc: '낮은 가격순으로 모아보기',
      cta: '특별가 보기',
      to: '/?sort=PRICE_ASC',
    },
  ]

  return (
    <section className={cx('band')} aria-label="기획전">
      <div className={cx('wrap')}>
        <div className={cx('banner')}>
          {slides.map((s) => (
            <Link to={s.to} className={cx('slide', s.key)} key={s.key}>
              <div className={cx('text')}>
                <span className={cx('code')}>{s.code}</span>
                <h2 className={cx('title')}>
                  {s.title}
                  {s.accent && <b>{s.accent}</b>}
                </h2>
                <p className={cx('desc')}>{s.desc}</p>
              </div>
              <span className={cx('cta')}>{s.cta} →</span>
              {s.img && (
                <img
                  className={cx('photo')}
                  src={s.img}
                  alt=""
                  loading="eager"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}
              {s.key === 'pick' && (
                <span className={cx('sticker')} aria-hidden="true">
                  NEW
                </span>
              )}
              {s.key === 'special' && (
                <span className={cx('big')} aria-hidden="true">
                  -20%
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
