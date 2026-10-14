import { makeCx } from '../lib/ui'
import styles from './AdminSettlements.module.css'
import AdminLayout from '../components/AdminLayout'

import { useState, type ChangeEvent } from 'react'

const cx = makeCx(styles)

/** 화면 상태와 화면에 그릴 값을 만들어요. */
function useAdminSettlementsView({ retryModal = '숨김' }: { retryModal?: '숨김' | '보임' }) {
  const [open, setOpen] = useState(retryModal === '보임')
  const [reason, setReasonText] = useState('')
  const view = {
    retryOpen: open,
    noReason: !reason.trim(),
    openRetry: () => {
      setReasonText('')
      setOpen(true)
    },
    closeRetry: () => setOpen(false),
    setReason: (e: ChangeEvent<HTMLTextAreaElement>) => setReasonText(e.target.value),
  }
  return view
}

/** 관리자 · 월 정산 */
export default function AdminSettlementsPage(props: { retryModal?: '숨김' | '보임' }) {
  const view = useAdminSettlementsView(props)
  const { closeRetry, noReason, openRetry, retryOpen, setReason } = view
  return (
    <div className={styles.page}>
      <AdminLayout active="월 정산" minHeight={1240}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>월 정산</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className={cx('in')} aria-label="정산월">
              <option>2026년 9월</option>
              <option>2026년 8월</option>
            </select>
            <button className={cx('btn btn-p')}>정산 실행하기</button>
          </div>
        </div>
        <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
          매달 10일 0시에 지난달 구매 확정분을 자동으로 정산해요. 실행 중일 때는 다시 실행할 수 없고, 실패한 건은
          자동으로 두 번 더 시도하고, 3회 실패하면 수동 처리로 넘어가요.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: '16px' }}>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              마지막 실행
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              10월 10일
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              성공과 실패
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              12건 / 1건
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              지급한 금액
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              3,820,000원
            </div>
          </section>
          <section className={cx('panel')} style={{ padding: '20px' }}>
            <span className={cx('sub')} style={{ fontSize: '14px' }}>
              수수료
            </span>
            <div className={cx('num')} style={{ fontSize: '24px', fontWeight: '700' }}>
              424,400원
            </div>
          </section>
        </div>
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>미리 보기 2026년 10월</h2>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'right' }}>대상 주문</th>
                  <th style={{ textAlign: 'right' }}>판매 금액</th>
                  <th style={{ textAlign: 'right' }}>수수료 10%</th>
                  <th style={{ textAlign: 'right' }}>받을 금액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>온결</td>
                  <td style={{ textAlign: 'right' }}>14</td>
                  <td style={{ textAlign: 'right' }}>642,000원</td>
                  <td style={{ textAlign: 'right' }}>64,200원</td>
                  <td style={{ textAlign: 'right' }}>577,800원</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>무드랩</td>
                  <td style={{ textAlign: 'right' }}>9</td>
                  <td style={{ textAlign: 'right' }}>415,000원</td>
                  <td style={{ textAlign: 'right' }}>41,500원</td>
                  <td style={{ textAlign: 'right' }}>373,500원</td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>하루담</td>
                  <td style={{ textAlign: 'right' }}>5</td>
                  <td style={{ textAlign: 'right' }}>188,000원</td>
                  <td style={{ textAlign: 'right' }}>18,800원</td>
                  <td style={{ textAlign: 'right' }}>169,200원</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className={cx('panel')} style={{ padding: '20px 24px 12px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>정산서</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                className={cx('btn')}
                style={{
                  minHeight: '36px',
                  fontSize: '13px',
                  padding: '0 12px',
                  borderColor: '#26262C',
                  background: '#26262C',
                  color: '#fff',
                }}
              >
                전체
              </button>
              <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                실패와 수동 필요
              </button>
              <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                보류
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className={cx('num')}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>정산월</th>
                  <th style={{ textAlign: 'left' }}>판매자</th>
                  <th style={{ textAlign: 'right' }}>받을 금액</th>
                  <th style={{ textAlign: 'left' }}>상태</th>
                  <th style={{ textAlign: 'left' }}>실패 횟수</th>
                  <th style={{ textAlign: 'left' }}>원인</th>
                  <th style={{ textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 9월</td>
                  <td style={{ textAlign: 'left' }}>온결</td>
                  <td style={{ textAlign: 'right' }}>1,116,000원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-ok')}>지급 완료</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>0회</td>
                  <td style={{ textAlign: 'left' }}></td>
                  <td style={{ textAlign: 'right' }}></td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 9월</td>
                  <td style={{ textAlign: 'left' }}>무드랩</td>
                  <td style={{ textAlign: 'right' }}>373,500원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-low')}>수동 필요</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <strong style={{ color: '#A33A1F' }}>3회</strong>
                  </td>
                  <td style={{ textAlign: 'left' }}>계좌 정보 오류</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={cx('btn btn-p')}
                      onClick={openRetry}
                      style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}
                    >
                      다시 실행하기
                    </button>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 9월</td>
                  <td style={{ textAlign: 'left' }}>하루담</td>
                  <td style={{ textAlign: 'right' }}>169,200원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-blue')}>재시도 중</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>1회</td>
                  <td style={{ textAlign: 'left' }}>일시적 오류</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={cx('sub')}>10분 뒤 다시 시도</span>
                  </td>
                </tr>
                <tr>
                  <td style={{ textAlign: 'left' }}>2026년 9월</td>
                  <td style={{ textAlign: 'left' }}>데일리핏</td>
                  <td style={{ textAlign: 'right' }}>88,200원</td>
                  <td style={{ textAlign: 'left' }}>
                    <span className={cx('chip c-mute')}>보류</span>
                  </td>
                  <td style={{ textAlign: 'left' }}></td>
                  <td style={{ textAlign: 'left' }}>판매자 제재</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className={cx('btn')} style={{ minHeight: '36px', fontSize: '13px', padding: '0 12px' }}>
                      보류 풀기
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </AdminLayout>
      {retryOpen && (
        <>
          <div className={cx('ov')}>
            <section className={cx('dlg')} role="dialog" aria-modal="true" aria-labelledby="rt-t">
              <h2 id="rt-t">무드랩 9월 정산을 다시 실행할까요?</h2>
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
                <label htmlFor="rt-r" style={{ fontSize: '14px', fontWeight: '500' }}>
                  다시 실행하는 사유 (필수)
                </label>
                <textarea
                  id="rt-r"
                  className={cx('in')}
                  placeholder="예: 판매자가 정산 계좌를 수정해서 다시 지급해요."
                  onChange={setReason}
                ></textarea>
                <span className={cx('sub')}>
                  입력한 사유는 감사 로그에 남아요. 같은 정산서는 두 번 지급되지 않아요.
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className={cx('btn')} onClick={closeRetry}>
                  취소
                </button>
                <button className={cx('btn btn-p')} disabled={noReason} onClick={closeRetry}>
                  다시 실행하기
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
