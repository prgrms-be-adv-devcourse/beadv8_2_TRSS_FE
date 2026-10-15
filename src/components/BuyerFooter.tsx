import { matchPath, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { screens } from '../routes'
import styles from './BuyerFooter.module.css'

/**
 * 사업자 정보는 아직 정해지지 않아 예시 값이에요. 실제 값이 정해지면 여기만 바꿔요.
 * 링크할 페이지가 아직 없는 메뉴는 href를 '#'으로 두었어요.
 */
const COMPANY = {
  name: '(주)팔레트',
  ceo: '트랜잭션시스터즈',
  businessNumber: '000-00-00000',
  mailOrderNumber: '제2026-서울강남-0000호',
  address: '서울특별시 강남구 예시로 123, 4층',
  email: 'help@palette.example',
  hosting: '(주)예시클라우드',
  phone: '1588-0000',
}

const LINKS = [
  { label: '회사 소개', href: '#' },
  { label: '이용약관', href: '#' },
  { label: '개인정보처리방침', href: '#', strong: true },
  { label: '판매자 입점 안내', href: '/seller/apply' },
  { label: '공지사항', href: '#' },
  { label: '자주 묻는 질문', href: '#' },
]

const icon = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** 구매자 화면 공통 푸터 */
export function BuyerFooter() {
  const { name, ceo, businessNumber, mailOrderNumber, address, email, hosting, phone } = COMPANY
  // 한 줄에 들어갈 항목들. 넓은 화면에서는 항목 사이에 구분선을 그려요.
  const infoLines = [
    [
      <strong>{name}</strong>,
      `대표 ${ceo}`,
      <>
        사업자등록번호 {businessNumber}{' '}
      </>,
    ],
    [`통신판매업 신고 ${mailOrderNumber}`, address],
    [`이메일 ${email}`, `호스팅 제공자 ${hosting}`],
  ]
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <img src="/images/logo.png" alt="Palette" className={styles.logo} width={199} height={68} />
          <nav aria-label="사이트 정보" className={styles.links}>
            {LINKS.map((l) => (
              <a key={l.label} href={l.href} className={l.strong ? styles.linkStrong : undefined}>
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className={styles.middle}>
          <div className={styles.info}>
            {infoLines.map((line, i) => (
              <p key={i}>
                {line.map((item, j) => (
                  <span key={j} className={styles.item}>
                    {item}
                  </span>
                ))}
              </p>
            ))}
            <p className={styles.notice}>
              팔레트는 통신판매중개자로서 거래 당사자가 아니며, 입점 판매자가 등록한 상품 정보와 거래에 대한 책임은 각
              판매자에게 있어요.
            </p>
          </div>

          <div className={styles.cs}>
            <span className={styles.csLabel}>고객센터</span>
            <strong className={styles.phone}>{phone}</strong>
            <p className={styles.hours}>
              평일 10:00 – 18:00 (점심 12:30 – 13:30)
              <br />
              주말·공휴일 휴무
            </p>
            <div className={styles.csButtons}>
              <a href="#" className={styles.pill}>
                1:1 문의
              </a>
              <a href="#" className={styles.pill}>
                자주 묻는 질문
              </a>
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <small className={styles.copy}>© 2026 Palette. All rights reserved.</small>
          <div className={styles.social}>
            <a href="#" aria-label="인스타그램" className={styles.round}>
              <svg {...icon}>
                <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
                <circle cx="12" cy="12" r="3.8" />
                <circle cx="17" cy="7" r="0.6" fill="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="유튜브" className={styles.round}>
              <svg {...icon}>
                <rect x="2.5" y="5.5" width="19" height="13" rx="3.5" />
                <path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor" />
              </svg>
            </a>
            <a href="#" aria-label="카카오톡 채널" className={styles.round}>
              <svg {...icon}>
                <path d="M12 5c-4.7 0-8.5 2.9-8.5 6.5 0 2.2 1.4 4.1 3.6 5.3L6.3 20l3.6-2.4c.7.1 1.4.2 2.1.2 4.7 0 8.5-2.9 8.5-6.3S16.7 5 12 5z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/** 구매자 헤더가 있는 화면에만 푸터를 붙여요. (로그인·회원가입·디자인 확인용 모음 화면 제외) */
const FOOTER_PATHS = new Set([
  '/',
  '/product/:productId',
  '/cart',
  '/checkout',
  '/orders',
  '/orders/:orderId',
  '/wallet',
  '/wallet/topup-result',
  '/mypage',
  '/seller/apply',
])

export default function BuyerFooterSlot() {
  const { pathname } = useLocation()
  const { ready } = useAuth()
  // 고정 경로(/orders/errors 등)를 :id 경로보다 먼저 맞춰 봐요
  const route =
    screens.find((s) => !s.path.includes(':') && matchPath(s.path, pathname)) ??
    screens.find((s) => matchPath(s.path, pathname))
  if (!route || !FOOTER_PATHS.has(route.path)) return null
  // 로그인이 필요한 화면은 로그인 상태를 확인하는 동안 본문이 비어 있어서 푸터도 잠깐 숨겨요
  if (route.auth && !ready) return null
  return <BuyerFooter />
}
