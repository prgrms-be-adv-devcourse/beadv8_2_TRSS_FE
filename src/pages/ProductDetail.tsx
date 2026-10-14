import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './ProductDetail.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useState } from 'react'

const PRICE = 18900
const MAX_QTY = 3

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useProductDetailView() {
  const [qty, setQty] = useState(1)
  const view = {
    qty,
    total: (PRICE * qty).toLocaleString('ko-KR'),
    bg: '#F5E1E6',
    inc: () => setQty((q) => Math.min(MAX_QTY, q + 1)),
    dec: () => setQty((q) => Math.max(1, q - 1)),
  }
  return view
}

/** 상품 상세 */
export default function ProductDetailPage() {
  const view = useProductDetailView()
  const { bg, dec, inc, qty, total } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '20px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          <nav className={cx('sub')} aria-label="위치">
            <Link to="/" style={{ color: '#5F5F6A' }}>
              홈
            </Link>{' '}
            ›{' '}
            <Link to="/" style={{ color: '#5F5F6A' }}>
              뷰티
            </Link>{' '}
            ›{' '}
            <Link to="/" style={{ color: '#5F5F6A' }}>
              스킨케어
            </Link>
          </nav>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '48px', alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 440px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '0' }}>
              <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div
                  style={css(
                    `aspect-ratio:1/1;width:100%;background:${bg};display:flex;align-items:center;justify-content:center;color:rgba(38,38,44,.38)`,
                  )}
                >
                  <img
                    src="/images/toner.jpg"
                    alt="약산성 수분 진정 토너 300ml"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: '10px' }}>
                <div
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: '#F5E1E6',
                    outline: '2px solid #26262C',
                    outlineOffset: '-2px',
                  }}
                >
                  <img
                    src="/images/toner.jpg"
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      objectPosition: 'center',
                      display: 'block',
                    }}
                  />
                </div>
                <div style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', background: '#F5E1E6' }}>
                  <img
                    src="/images/toner.jpg"
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transformOrigin: '50% 22%',
                      display: 'block',
                      transform: 'scale(1.8)',
                    }}
                  />
                </div>
                <div style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', background: '#F5E1E6' }}>
                  <img
                    src="/images/toner.jpg"
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transformOrigin: '50% 62%',
                      display: 'block',
                      transform: 'scale(1.8)',
                    }}
                  />
                </div>
                <div style={{ aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', background: '#F5E1E6' }}>
                  <img
                    src="/images/toner.jpg"
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transformOrigin: '50% 40%',
                      display: 'block',
                      transform: 'scale(1.8)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div style={{ flex: '1 1 420px', display: 'flex', flexDirection: 'column', gap: '18px', minWidth: '0' }}>
              <Link to="/" style={{ fontWeight: '700', fontSize: '14px', color: '#45454F' }}>
                온결 ›
              </Link>
              <h1
                style={{
                  margin: '-8px 0 0',
                  fontSize: '28px',
                  lineHeight: '1.3',
                  fontWeight: '700',
                  letterSpacing: '-0.5px',
                }}
              >
                약산성 수분 진정 토너 300ml
              </h1>
              <strong className={cx('num')} style={{ fontSize: '30px', fontWeight: '700' }}>
                18,900원
              </strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span className={cx('chip c-ok')}>판매중</span>
                <span className={cx('chip c-low')}>3개 남았어요</span>
              </div>
              <div
                style={{
                  borderTop: '1px solid #E8E8ED',
                  borderBottom: '1px solid #E8E8ED',
                  padding: '18px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontWeight: '500' }}>옵션</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      minHeight: '44px',
                      padding: '0 18px',
                      border: '2px solid #26262C',
                      borderRadius: '999px',
                      background: '#fff',
                      fontWeight: '500',
                      boxSizing: 'border-box',
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    기본 <span className={cx('sub num')}>1개 · 선택됨</span>
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ fontWeight: '500' }}>수량</span>
                  <div className={cx('step')}>
                    <button onClick={dec} aria-label="수량 줄이기">
                      −
                    </button>
                    <span className={cx('num')} aria-live="polite">
                      {qty}
                    </span>
                    <button onClick={inc} aria-label="수량 늘리기">
                      +
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <span className={cx('sub')}>총 상품 금액</span>
                  <strong className={cx('num')} style={{ fontSize: '22px', fontWeight: '700' }}>
                    {total}원
                  </strong>
                </div>
              </div>
              <Link className={cx('btn btn-p')} to="/cart" style={{ minHeight: '56px', fontSize: '17px' }}>
                장바구니에 담기
              </Link>
              <p className={cx('sub')} style={{ margin: '0' }}>
                주문은 장바구니에서 해요. 같은 상품을 다시 담으면 수량이 합쳐져요.
              </p>
              <dl
                style={{
                  margin: '0',
                  display: 'grid',
                  gridTemplateColumns: '96px 1fr',
                  gap: '10px 16px',
                  fontSize: '14px',
                  background: '#fff',
                  borderRadius: '6px',
                  padding: '18px',
                }}
              >
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  판매자
                </dt>
                <dd style={{ margin: '0' }}>온결</dd>
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  카테고리
                </dt>
                <dd style={{ margin: '0' }}>뷰티 › 스킨케어</dd>
                <dt className={cx('sub')} style={{ fontSize: '14px' }}>
                  구매 확정
                </dt>
                <dd style={{ margin: '0' }}>결제 후 7일이 지나면 자동으로 확정돼요</dd>
              </dl>
            </div>
          </div>
          <section
            className={cx('panel')}
            style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
              maxWidth: '860px',
              alignSelf: 'center',
              boxSizing: 'border-box',
            }}
          >
            <h2 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>상품 설명</h2>
            <p style={{ margin: '0', maxWidth: '640px' }}>
              [판매자가 등록한 상품 설명이 들어가요. 성분, 용량, 사용 방법처럼 구매 전에 확인할 내용을 판매자가 직접
              작성해요.]
            </p>
            <div
              style={{
                aspectRatio: '16/9',
                borderRadius: '8px',
                background: '#F4F4F7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className={cx('sub')}
            >
              상세 이미지
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
