import { Link } from 'react-router-dom'
import Icon from './Icon'
import styles from './Footer.module.css'

/**
 * 푸터 (메인 홈 맨 아래에만 보여요 — AppFrame footer)
 * 사업자 정보는 아직 정해지지 않아 예시 값이에요. 실제 값이 정해지면 COMPANY만 바꿔요.
 * 링크할 페이지가 아직 없는 메뉴는 '#'으로 두었어요.
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
  { label: '이용약관', to: '#' },
  { label: '개인정보처리방침', to: '#', strong: true },
  { label: '공지사항', to: '#' },
  { label: '자주 묻는 질문', to: '#' },
  { label: '판매자 입점 안내', to: '/seller/apply' },
]

export default function Footer() {
  const c = COMPANY
  return (
    <footer className={styles.footer}>
      <img src="/images/logo.png" alt="Palette" className={styles.logo} />

      <nav aria-label="사이트 정보" className={styles.links}>
        {LINKS.map((l) =>
          l.to === '#' ? (
            <a key={l.label} href="#" className={l.strong ? styles.strong : undefined}>
              {l.label}
            </a>
          ) : (
            <Link key={l.label} to={l.to} className={l.strong ? styles.strong : undefined}>
              {l.label}
            </Link>
          ),
        )}
      </nav>

      <div className={styles.cs}>
        <span className={styles.csLabel}>고객센터</span>
        <a href={`tel:${c.phone}`} className={styles.phone}>
          {c.phone}
        </a>
        <span className={styles.hours}>평일 10:00 – 18:00 · 주말·공휴일 휴무</span>
      </div>

      <details className={styles.biz}>
        <summary>
          사업자 정보
          <Icon name="chevronDown" size={14} strokeWidth={2} />
        </summary>
        <dl>
          <div>
            <dt>상호</dt>
            <dd>{c.name}</dd>
          </div>
          <div>
            <dt>대표</dt>
            <dd>{c.ceo}</dd>
          </div>
          <div>
            <dt>사업자등록번호</dt>
            <dd>{c.businessNumber}</dd>
          </div>
          <div>
            <dt>통신판매업 신고</dt>
            <dd>{c.mailOrderNumber}</dd>
          </div>
          <div>
            <dt>주소</dt>
            <dd>{c.address}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{c.email}</dd>
          </div>
          <div>
            <dt>호스팅 제공자</dt>
            <dd>{c.hosting}</dd>
          </div>
        </dl>
      </details>

      <p className={styles.notice}>
        팔레트는 통신판매중개자로서 거래 당사자가 아니며, 입점 판매자가 등록한 상품 정보와 거래에 대한 책임은 각
        판매자에게 있어요.
      </p>
      <small className={styles.copy}>© 2026 Palette. All rights reserved.</small>
    </footer>
  )
}
