import { Link } from 'react-router-dom'
import { makeCx } from '../lib/ui'
import styles from './SellerProductForm.module.css'
import SellerLayout from '../components/SellerLayout'

const cx = makeCx(styles)

/** 상품 등록 */
export default function SellerProductFormPage() {
  return (
    <div className={styles.page}>
      <SellerLayout active="상품 등록" minHeight={1060}>
        <div>
          <Link to="/seller/products" className={cx('sub')} style={{ fontWeight: '500' }}>
            ‹ 상품 관리
          </Link>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>상품 등록</h1>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start', maxWidth: '1040px' }}>
          <div style={{ flex: '999 1 520px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                  className={cx('in')}
                  type="text"
                  placeholder="예: 약산성 수분 진정 토너 300ml"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="c1" style={{ fontSize: '14px', fontWeight: '500' }}>
                    대분류
                  </label>
                  <select id="c1" className={cx('in')}>
                    <option>뷰티</option>
                    <option>의류</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="c2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    소분류
                  </label>
                  <select id="c2" className={cx('in')}>
                    <option>스킨케어</option>
                    <option>메이크업</option>
                    <option>선케어</option>
                    <option>클렌징</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="pp" style={{ fontSize: '14px', fontWeight: '500' }}>
                    가격 (원)
                  </label>
                  <input id="pp" className={cx('in')} type="text" placeholder="0" style={{ width: '100%' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="ps" style={{ fontSize: '14px', fontWeight: '500' }}>
                    처음 재고
                  </label>
                  <input id="ps" className={cx('in')} type="text" placeholder="0" style={{ width: '100%' }} />
                  <span className={cx('sub')}>등록한 뒤에는 재고 화면에서만 바꿀 수 있어요</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="pd" style={{ fontSize: '14px', fontWeight: '500' }}>
                  상품 설명
                </label>
                <textarea id="pd" className={cx('in')} style={{ minHeight: '160px', padding: '12px 14px' }}></textarea>
              </div>
            </section>
            <section
              className={cx('panel')}
              style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>이미지</h2>
              <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                선택 항목이에요. 상품을 등록한 뒤 이어서 올라가요.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                <div
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#F5E1E6',
                    flex: 'none',
                  }}
                >
                  <img
                    src="/images/toner.jpg"
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <button
                  className={cx('btn')}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderStyle: 'dashed',
                    flexDirection: 'column',
                    color: '#45454F',
                  }}
                >
                  이미지 추가
                </button>
              </div>
            </section>
          </div>
          <aside
            className={cx('panel')}
            style={{ flex: '1 1 260px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>등록하면</h2>
            <p style={{ margin: '0', fontSize: '14px', color: '#45454F' }}>
              바로 판매중으로 보여요. 재고가 0이 되면 품절로, 다시 채우면 판매중으로 자동으로 바뀌어요.
            </p>
            <Link className={cx('btn btn-p')} to="/seller/products" style={{ minHeight: '52px' }}>
              등록하기
            </Link>
            <Link className={cx('btn btn-q')} to="/seller/products">
              취소
            </Link>
          </aside>
        </div>
      </SellerLayout>
    </div>
  )
}
