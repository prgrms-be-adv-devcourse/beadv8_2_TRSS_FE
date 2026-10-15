import { useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { errorMessage } from '../lib/api'
import { BANKS, applySeller, type SellerApplyRequest } from '../lib/seller'
import { makeCx } from '../lib/ui'
import styles from './SellerApply.module.css'
import BuyerHeader from '../components/BuyerHeader'

const cx = makeCx(styles)

const EMPTY: SellerApplyRequest = {
  businessName: '',
  businessNumber: '',
  representativeName: '',
  phoneNumber: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
}

/** 신청 폼 값과 제출. 성공하면 마이페이지로 이동해 심사 상태를 보여준다. */
function useApplyForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const bind = (key: keyof SellerApplyRequest) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  })

  async function submit() {
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await applySeller({ ...form, businessName: form.businessName.trim() })
      navigate('/mypage', { replace: true })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return { bind, submit, submitting, error }
}

/** 판매자 신청 */
export default function SellerApplyPage() {
  const { bind, submit, submitting } = useApplyForm()
  return (
    <div className={styles.page}>
      <div>
        <BuyerHeader active="mypage" />
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
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>판매자 신청</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>
            <section
              className={cx('panel')}
              style={{
                flex: '999 1 560px',
                minWidth: '0',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>사업자 정보</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="bn" style={{ fontSize: '14px', fontWeight: '500' }}>
                    사업자등록번호
                  </label>
                  <input
                    id="bn"
                    {...bind('businessNumber')}
                    className={cx('in')}
                    type="text"
                    placeholder="000-00-00000"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="sn" style={{ fontSize: '14px', fontWeight: '500' }}>
                    상호명
                  </label>
                  <input
                    id="sn"
                    {...bind('businessName')}
                    className={cx('in')}
                    type="text"
                    placeholder=""
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="rp" style={{ fontSize: '14px', fontWeight: '500' }}>
                    대표자명
                  </label>
                  <input
                    id="rp"
                    {...bind('representativeName')}
                    className={cx('in')}
                    type="text"
                    placeholder="사업자등록증의 대표자 이름"
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label htmlFor="sp" style={{ fontSize: '14px', fontWeight: '500' }}>
                    휴대폰 번호
                  </label>
                  <input
                    id="sp"
                    {...bind('phoneNumber')}
                    className={cx('in')}
                    type="text"
                    placeholder="010-0000-0000"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div
                style={{
                  borderTop: '1px solid #E8E8ED',
                  paddingTop: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>정산 계좌</h2>
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="bk" style={{ fontSize: '14px', fontWeight: '500' }}>
                      은행
                    </label>
                    <select id="bk" {...bind('bankName')} className={cx('in')}>
                      <option value="" disabled>
                        은행 선택
                      </option>
                      {BANKS.map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="ac" style={{ fontSize: '14px', fontWeight: '500' }}>
                      계좌번호
                    </label>
                    <input
                      id="ac"
                      {...bind('accountNumber')}
                      className={cx('in')}
                      type="text"
                      placeholder=""
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label htmlFor="ho" style={{ fontSize: '14px', fontWeight: '500' }}>
                      예금주
                    </label>
                    <input
                      id="ho"
                      {...bind('accountHolder')}
                      className={cx('in')}
                      type="text"
                      placeholder=""
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <span className={cx('sub')}>
                  판매 대금은 매달 10일, 지난달 구매 확정분에서 수수료 10%를 뺀 금액이 예치금으로 들어와요.
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <Link className={cx('btn')} to="/mypage">
                  취소
                </Link>
                <button className={cx('btn btn-p')} disabled={submitting} onClick={submit}>
                  신청하기
                </button>
              </div>
            </section>
            <aside
              className={cx('panel')}
              style={{ flex: '1 1 300px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>신청한 뒤에는</h2>
              <ol
                style={{
                  margin: '0',
                  paddingLeft: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '14px',
                  color: '#45454F',
                }}
              >
                <li>관리자가 신청 내용을 확인해요.</li>
                <li>승인되면 판매자 센터가 열려요. 반려되면 사유를 확인하고 다시 신청할 수 있어요.</li>
                <li>판매를 그만두고 싶으면 판매자 정보에서 철회를 요청해요.</li>
              </ol>
              <p className={cx('sub')} style={{ margin: '0' }}>
                한 사람과 한 사업자번호로 심사 중인 신청은 하나만 둘 수 있어요.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
