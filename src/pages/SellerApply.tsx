import { useEffect, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ApiError, errorMessage } from '../lib/api'
import { BANKS, applySeller, canApply, getMySeller, type MySeller, type SellerApplyRequest } from '../lib/api/member'
import { makeCx, phone } from '../lib/ui'
import styles from './SellerApply.module.css'
import BuyerHeader from '../components/BuyerHeader'

const cx = makeCx(styles)

/** 로그인 화면과 같은 안내 박스 */
const NOTICE: CSSProperties = {
  margin: '0',
  padding: '12px 14px',
  borderRadius: '8px',
  background: '#FFF1E8',
  color: '#9A3209',
  fontSize: '14px',
}

const EMPTY: SellerApplyRequest = {
  businessName: '',
  businessNumber: '',
  representativeName: '',
  phoneNumber: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
}

/** 내 신청 내역. 아직 불러오는 중이면 undefined, 신청한 적이 없으면(404) null */
function useMySeller() {
  const [seller, setSeller] = useState<MySeller | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    getMySeller()
      .then((s) => alive && setSeller(s))
      .catch((e) => alive && setSeller(e instanceof ApiError && e.status === 404 ? null : undefined))
    return () => {
      alive = false
    }
  }, [])
  return seller
}

/**
 * 반려·철회 뒤 다시 신청할 때 쓸 첫 폼 값.
 * 사업자번호는 비어 있고 계좌번호는 끝 4자리만 내려와서 다시 입력받는다.
 */
const formFrom = (s: MySeller): SellerApplyRequest => ({
  ...EMPTY,
  businessName: s.businessName,
  representativeName: s.representativeName,
  phoneNumber: phone(s.phoneNumber),
  bankName: s.bankName,
  accountHolder: s.accountHolder,
})

/** 신청 폼 값과 제출. 성공하면 마이페이지로 이동해 심사 상태를 보여준다. */
function useApplyForm() {
  const navigate = useNavigate()
  const seller = useMySeller()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (seller) setForm(formFrom(seller))
  }, [seller])

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

  // 이전에 저장한 은행이 선택지에 없으면 맨 앞에 넣어 그대로 보이게 한다.
  const banks = seller && seller.bankName && !BANKS.includes(seller.bankName) ? [seller.bankName, ...BANKS] : BANKS

  return { seller, bind, submit, submitting, error, banks }
}

/** 판매자 신청 */
export default function SellerApplyPage() {
  const { seller, bind, submit, submitting, error, banks } = useApplyForm()
  // 심사 중·판매 중·이용 제한이면 신청 불가. 상태 안내는 마이페이지에 있다.
  if (seller && !canApply(seller.status)) return <Navigate to="/mypage" replace />
  const rejectReason = seller?.status === 'REJECTED' ? seller.reason : null
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
          {rejectReason && <p style={NOTICE}>반려 사유: {rejectReason}</p>}
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
                      {banks.map((b) => (
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
              {error && (
                <p role="alert" style={NOTICE}>
                  {error}
                </p>
              )}
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
