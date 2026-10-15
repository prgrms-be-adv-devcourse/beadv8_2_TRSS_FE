import { SMALL_BTN_ON } from '../lib/admin'

type Props = {
  /** 현재 페이지 (1부터) */
  page: number
  totalPages: number
  onChange: (page: number) => void
  /** 화면 CSS Module의 버튼 클래스 (예: cx('btn')) */
  buttonClassName: string
}

/** 현재 페이지 주변 최대 5개 페이지 번호 (1부터) */
function pageNumbers(current: number, total: number) {
  const start = Math.max(1, Math.min(current - 2, total - 4))
  return Array.from({ length: Math.min(5, total) }, (_, i) => start + i)
}

/** ‹ 1 2 3 › 페이지 이동 (상품 목록과 같은 모양). 2페이지 이상일 때만 보인다 */
export default function Pager({ page, totalPages, onChange, buttonClassName }: Props) {
  if (totalPages <= 1) return null
  return (
    <nav aria-label="페이지" style={{ display: 'flex', justifyContent: 'center', gap: '4px', paddingTop: '16px' }}>
      <button
        className={buttonClassName}
        aria-label="이전 페이지"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {pageNumbers(page, totalPages).map((n) => (
        <button
          key={n}
          className={buttonClassName}
          style={n === page ? SMALL_BTN_ON : undefined}
          aria-current={n === page ? 'page' : undefined}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
      <button
        className={buttonClassName}
        aria-label="다음 페이지"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  )
}
