import { Link } from 'react-router-dom'
import { makeCx, css } from '../lib/ui'
import styles from './OrderList.module.css'
import BuyerHeader from '../components/BuyerHeader'

import { useState } from 'react'

const FILTERS = ['전체', '결제 대기', '결제 완료', '반품', '구매 확정', '취소']
const ON =
  'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #26262C;background:#26262C;color:#fff;font:inherit;font-size:14px;font-weight:500;cursor:pointer'
const OFF =
  'min-height:36px;padding:0 14px;border-radius:999px;border:1px solid #D5D5DD;background:#fff;color:#45454F;font:inherit;font-size:14px;cursor:pointer'

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useOrderListView() {
  const [filter, setFilter] = useState(0)
  const view = {
    filters: FILTERS.map((label, i) => ({
      label,
      on: filter === i,
      style: filter === i ? ON : OFF,
      pick: () => setFilter(i),
    })),
  }
  return view
}

/** 주문 내역 */
export default function OrderListPage() {
  const view = useOrderListView()
  const { filters } = view
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="orders" />
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '28px 24px 56px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>주문 내역</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {filters.map((f, fIndex) => (
              <button onClick={f.pick} aria-pressed={f.on} style={css(f.style)} key={fIndex}>
                {f.label}
              </button>
            ))}
            <select className={cx('in')} aria-label="기간" style={{ marginLeft: 'auto' }}>
              <option>최근 1개월</option>
              <option>최근 3개월</option>
              <option>최근 6개월</option>
            </select>
          </div>
          <section className={cx('panel')}>
            <article
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 20px',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '6px',
                  background: '#F5E1E6',
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <img
                  src="/images/toner.jpg"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={cx('sub num')}>
                  10.09 주문{' '}
                  <Link to="/orders/detail" style={{ color: '#5F5F6A' }}>
                    ORD-20261009-0142
                  </Link>
                </span>
                <Link to="/orders/detail" style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                  약산성 수분 진정 토너 300ml 외 1개
                </Link>
                <strong className={cx('num')} style={{ fontWeight: '700' }}>
                  72,900원
                </strong>
              </div>
              <div
                style={{
                  flex: '0 1 220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <span className={cx('chip c-low')}>결제 대기</span>
                <span className={cx('num')} style={{ color: '#A33A1F', fontWeight: '700' }}>
                  14:32 남음
                </span>
              </div>
              <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  className={cx('btn btn-p')}
                  to="/checkout"
                  style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                >
                  결제하기
                </Link>
              </div>
            </article>
            <article
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 20px',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '6px',
                  background: '#E4DAF0',
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <img
                  src="/images/ceramide-cream.jpg"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={cx('sub num')}>
                  10.05 주문{' '}
                  <Link to="/orders/detail" style={{ color: '#5F5F6A' }}>
                    ORD-20261005-0031
                  </Link>
                </span>
                <Link to="/orders/detail" style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                  세라마이드 장벽 크림 80ml 외 1개
                </Link>
                <strong className={cx('num')} style={{ fontWeight: '700' }}>
                  52,000원
                </strong>
              </div>
              <div
                style={{
                  flex: '0 1 220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <span className={cx('chip c-ok')}>결제 완료</span>
                <span className={cx('sub')}>10.12 자동 확정</span>
              </div>
              <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}>
                <Link
                  className={cx('btn')}
                  to="/orders/detail"
                  style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                >
                  구매 확정하기
                </Link>
              </div>
            </article>
            <article
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 20px',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '6px',
                  background: '#EEE3F2',
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <img
                  src="/images/tshirt.jpg"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={cx('sub num')}>
                  09.28 주문{' '}
                  <Link to="/orders/detail" style={{ color: '#5F5F6A' }}>
                    ORD-20260928-0377
                  </Link>
                </span>
                <Link to="/orders/detail" style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                  오버핏 코튼 반팔 티셔츠
                </Link>
                <strong className={cx('num')} style={{ fontWeight: '700' }}>
                  24,000원
                </strong>
              </div>
              <div
                style={{
                  flex: '0 1 220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <span className={cx('chip c-blue')}>반품 요청</span>
                <span className={cx('sub')}>관리자 확인 중</span>
              </div>
              <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}></div>
            </article>
            <article
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 20px',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '6px',
                  background: '#E4EAF2',
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <img
                  src="/images/mask-pack.jpg"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={cx('sub num')}>
                  09.21 주문{' '}
                  <Link to="/orders/detail" style={{ color: '#5F5F6A' }}>
                    ORD-20260921-0410
                  </Link>
                </span>
                <Link to="/orders/detail" style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                  진정 마스크팩 10매
                </Link>
                <strong className={cx('num')} style={{ fontWeight: '700' }}>
                  15,900원
                </strong>
              </div>
              <div
                style={{
                  flex: '0 1 220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <span className={cx('chip c-mute')}>구매 확정</span>
              </div>
              <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}></div>
            </article>
            <article
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px 20px',
                alignItems: 'center',
                padding: '20px 24px',
                borderTop: '1px solid #E8E8ED',
              }}
            >
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '6px',
                  background: '#E8E0F2',
                  overflow: 'hidden',
                  flex: 'none',
                }}
              >
                <img
                  src="/images/cleansing-foam.jpg"
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <div style={{ flex: '1 1 260px', minWidth: '0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={cx('sub num')}>
                  09.14 주문{' '}
                  <Link to="/orders/detail" style={{ color: '#5F5F6A' }}>
                    ORD-20260914-0098
                  </Link>
                </span>
                <Link to="/orders/detail" style={{ color: '#26262C', fontSize: '16px', fontWeight: '500' }}>
                  순한 아미노 클렌징폼 150ml
                </Link>
                <strong className={cx('num')} style={{ fontWeight: '700' }}>
                  12,500원
                </strong>
              </div>
              <div
                style={{
                  flex: '0 1 220px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <span className={cx('chip c-mute')}>취소</span>
                <span className={cx('sub')}>결제 시간이 지나 취소됐어요</span>
              </div>
              <div style={{ flex: '0 0 140px', display: 'flex', justifyContent: 'flex-end' }}></div>
            </article>
          </section>
        </div>
      </div>
    </div>
  )
}
