import { makeCx } from '../lib/ui'
import styles from './AdminRetryModal.module.css'

const cx = makeCx(styles)

/** 월 정산 · 다시 실행 사유 */
export default function AdminRetryModalPage() {
  return (
    <div className={styles.page}>
      <div
        style={{ background: 'rgba(38,38,44,.72)', minHeight: '760px', padding: '48px 32px', boxSizing: 'border-box' }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h1 style={{ margin: '0', color: '#fff', fontSize: '24px', fontWeight: '700' }}>
              월 정산에서 "다시 실행하기"를 누르면 뜨는 창
            </h1>
            <p style={{ margin: '6px 0 0', color: '#D5D5DD' }}>
              수동 필요 정산서를 다시 지급하기 전에 사유를 받아요. 사유를 적어야 실행 버튼이 켜져요.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(380px,1fr))',
              gap: '28px',
              alignItems: 'start',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E8E8ED', fontSize: '14px', fontWeight: '500' }}>사유를 입력하기 전</span>
              <section className={cx('dlg')} role="dialog" aria-labelledby="rt-t1">
                <h2 id="rt-t1">무드랩 9월 정산을 다시 실행할까요?</h2>
                <dl className={cx('sum')}>
                  <dt>받을 금액</dt>
                  <dd>
                    <strong>373,500원</strong>
                  </dd>
                  <dt>실패 횟수</dt>
                  <dd>3회</dd>
                  <dt>마지막 실패 원인</dt>
                  <dd>계좌 정보 오류</dd>
                </dl>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="rt-r1" style={{ fontSize: '14px', fontWeight: '500' }}>
                    다시 실행하는 사유 (필수)
                  </label>
                  <textarea
                    id="rt-r1"
                    className={cx('in')}
                    placeholder="예: 판매자가 정산 계좌를 수정해서 다시 지급해요."
                  ></textarea>
                  <span className={cx('sub')}>
                    입력한 사유는 감사 로그에 남아요. 같은 정산서는 두 번 지급되지 않아요.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className={cx('btn')}>취소</button>
                  <button className={cx('btn btn-p')} disabled>
                    다시 실행하기
                  </button>
                </div>
              </section>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ color: '#E8E8ED', fontSize: '14px', fontWeight: '500' }}>사유를 입력한 뒤</span>
              <section className={cx('dlg')} role="dialog" aria-labelledby="rt-t2">
                <h2 id="rt-t2">무드랩 9월 정산을 다시 실행할까요?</h2>
                <dl className={cx('sum')}>
                  <dt>받을 금액</dt>
                  <dd>
                    <strong>373,500원</strong>
                  </dd>
                  <dt>실패 횟수</dt>
                  <dd>3회</dd>
                  <dt>마지막 실패 원인</dt>
                  <dd>계좌 정보 오류</dd>
                </dl>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="rt-r2" style={{ fontSize: '14px', fontWeight: '500' }}>
                    다시 실행하는 사유 (필수)
                  </label>
                  <textarea
                    id="rt-r2"
                    className={cx('in')}
                    placeholder="예: 판매자가 정산 계좌를 수정해서 다시 지급해요."
                    defaultValue="판매자가 정산 계좌를 수정해서 다시 지급해요."
                  ></textarea>
                  <span className={cx('sub')}>
                    입력한 사유는 감사 로그에 남아요. 같은 정산서는 두 번 지급되지 않아요.
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button className={cx('btn')}>취소</button>
                  <button className={cx('btn btn-p')}>다시 실행하기</button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
