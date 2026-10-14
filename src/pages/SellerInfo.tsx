import { makeCx } from '../lib/ui'
import styles from './SellerInfo.module.css'
import SellerLayout from '../components/SellerLayout'

const cx = makeCx(styles)

/** 판매자 정보 */
export default function SellerInfoPage() {
  return (
    <div className={styles.page}>
      <SellerLayout active="판매자 정보" minHeight={1040}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>판매자 정보</h1>
          <span className={cx('chip c-ok')}>판매 중</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '820px' }}>
          <section className={cx('panel')} style={{ padding: '24px 28px' }}>
            <dl
              style={{
                margin: '0',
                display: 'grid',
                gridTemplateColumns: '140px 1fr',
                gap: '12px 16px',
                fontSize: '15px',
              }}
            >
              <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                사업자등록번호
              </dt>
              <dd style={{ margin: '0' }} className={cx('num')}>
                123-45-67890
              </dd>
              <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                판매 카테고리
              </dt>
              <dd style={{ margin: '0' }}>뷰티</dd>
              <dt className={cx('sub')} style={{ fontSize: '15px' }}>
                승인일
              </dt>
              <dd style={{ margin: '0' }} className={cx('num')}>
                2026년 9월 12일
              </dd>
            </dl>
          </section>
          <section
            className={cx('panel')}
            style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>정보 수정</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="sn" style={{ fontSize: '14px', fontWeight: '500' }}>
                  상호명
                </label>
                <input
                  id="sn"
                  className={cx('in')}
                  type="text"
                  placeholder=""
                  defaultValue="온결"
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="sp" style={{ fontSize: '14px', fontWeight: '500' }}>
                  휴대폰 번호
                </label>
                <input
                  id="sp"
                  className={cx('in')}
                  type="text"
                  placeholder=""
                  defaultValue="010-1234-5678"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="bk" style={{ fontSize: '14px', fontWeight: '500' }}>
                  은행
                </label>
                <select id="bk" className={cx('in')}>
                  <option>국민은행</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="ac" style={{ fontSize: '14px', fontWeight: '500' }}>
                  계좌번호
                </label>
                <input id="ac" className={cx('in')} type="text" placeholder="끝자리 4321" style={{ width: '100%' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="ho" style={{ fontSize: '14px', fontWeight: '500' }}>
                  예금주
                </label>
                <input
                  id="ho"
                  className={cx('in')}
                  type="text"
                  placeholder=""
                  defaultValue="김팔레"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <span className={cx('sub')}>정산 계좌는 끝 네 자리만 보여요. 바꾸려면 계좌번호를 새로 입력해 주세요.</span>
            <button className={cx('btn btn-p')} style={{ alignSelf: 'flex-end' }}>
              저장하기
            </button>
          </section>
          <section
            className={cx('panel')}
            style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매 그만두기</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <span>아직 정산받지 않은 금액</span>
              <strong className={cx('num')} style={{ color: '#A33A1F' }}>
                642,000원
              </strong>
            </div>
            <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
              정산이 모두 끝나야 철회를 요청할 수 있어요. 철회가 승인되면 모든 상품의 판매가 멈추고 판매자 센터가
              닫혀요. 구매는 계속할 수 있어요.
            </p>
            <button
              className={cx('btn')}
              disabled
              style={{ alignSelf: 'flex-start', color: '#83838F', cursor: 'not-allowed' }}
            >
              철회 요청하기
            </button>
          </section>
        </div>
      </SellerLayout>
    </div>
  )
}
