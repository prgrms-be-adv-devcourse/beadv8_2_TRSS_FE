import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import PageHeader from '../../components/ui/PageHeader'
import { Loading } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { ApiError, errorMessage } from '../../lib/api'
import { BANKS, applySeller, canApply, getMySeller, type MySeller, type SellerApplyRequest } from '../../lib/api/member'
import { phone } from '../../lib/ui'
import { Notice } from './shared'
import s from './seller.module.css'

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
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    getMySeller()
      .then((x) => alive && setSeller(x))
      .catch((e) => {
        if (!alive) return
        if (e instanceof ApiError && e.status === 404) setSeller(null)
        else setError(errorMessage(e))
      })
    return () => {
      alive = false
    }
  }, [])
  return { seller, error }
}

/**
 * 반려·철회 뒤 다시 신청할 때 쓸 첫 폼 값.
 * 사업자번호는 비어 있고 계좌번호는 끝 4자리만 내려와서 다시 입력받아요.
 */
const formFrom = (x: MySeller): SellerApplyRequest => ({
  ...EMPTY,
  businessName: x.businessName,
  representativeName: x.representativeName,
  phoneNumber: phone(x.phoneNumber),
  bankName: x.bankName,
  accountHolder: x.accountHolder,
})

/** S7 판매자 신청 (구매자 모바일 틀) */
export default function SellerApplyPage() {
  const navigate = useNavigate()
  const { seller, error: loadError } = useMySeller()
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (seller) setForm(formFrom(seller))
  }, [seller])

  const bind = (key: keyof SellerApplyRequest) => ({
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((x) => ({ ...x, [key]: e.target.value })),
  })
  const filled = Object.values(form).every((v) => v.trim() !== '')

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await applySeller({ ...form, businessName: form.businessName.trim() })
      navigate('/seller/status', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  // 심사 중·판매 중·이용 제한이면 신청할 수 없어요. 상태 안내 화면으로 보내요.
  if (seller && !canApply(seller.status)) return <Navigate to="/seller/status" replace />

  // 이전에 저장한 은행이 선택지에 없으면 맨 앞에 넣어 그대로 보이게 해요.
  const banks = seller && seller.bankName && !BANKS.includes(seller.bankName) ? [seller.bankName, ...BANKS] : BANKS
  const rejectReason = seller?.status === 'REJECTED' ? seller.reason : null

  return (
    <AppFrame
      bottom={
        <BottomBar>
          <Button type="submit" form="seller-apply" size="lg" disabled={submitting || seller === undefined || !filled}>
            {submitting ? '신청하는 중이에요' : '신청하기'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="판매자 신청" back="/mypage" />
      {seller === undefined && !loadError ? (
        <Loading />
      ) : (
        <form id="seller-apply" onSubmit={submit} noValidate>
          <div className={s.applyIntro}>
            <p className={s.applyIntroTitle}>신청한 뒤에는</p>
            <ol>
              <li>관리자가 신청 내용을 확인해요.</li>
              <li>승인되면 판매자 센터가 열려요. 반려되면 사유를 확인하고 다시 신청할 수 있어요.</li>
              <li>판매를 그만두고 싶으면 판매자 정보에서 철회를 요청해요.</li>
            </ol>
          </div>
          {(rejectReason || loadError) && (
            <div className={s.mobileBlock}>
              {rejectReason && <Notice tone="error">반려 사유: {rejectReason}</Notice>}
              {loadError && <Notice tone="error">{loadError}</Notice>}
            </div>
          )}
          <section className={f.section} aria-labelledby="bz">
            <h2 id="bz" className={f.sectionTitle}>
              사업자 정보
            </h2>
            <div className={f.field}>
              <label htmlFor="sn" className={f.label}>
                상호명
              </label>
              <input id="sn" className={f.input} {...bind('businessName')} />
            </div>
            <div className={f.field}>
              <label htmlFor="bn" className={f.label}>
                사업자등록번호
              </label>
              <input id="bn" className={f.input} inputMode="numeric" placeholder="000-00-00000" {...bind('businessNumber')} />
            </div>
            <div className={s.twoCol}>
              <div className={f.field}>
                <label htmlFor="rp" className={f.label}>
                  대표자
                </label>
                <input id="rp" className={f.input} placeholder="사업자등록증의 대표자 이름" {...bind('representativeName')} />
              </div>
              <div className={f.field}>
                <label htmlFor="sp" className={f.label}>
                  연락처
                </label>
                <input
                  id="sp"
                  className={f.input}
                  type="tel"
                  inputMode="numeric"
                  placeholder="010-0000-0000"
                  {...bind('phoneNumber')}
                />
              </div>
            </div>
          </section>
          <section className={f.section} aria-labelledby="ac">
            <h2 id="ac" className={f.sectionTitle}>
              정산 계좌
            </h2>
            <div className={f.field}>
              <label htmlFor="bk" className={f.label}>
                은행
              </label>
              <select id="bk" className={f.select} {...bind('bankName')}>
                <option value="" disabled>
                  은행 고르기
                </option>
                {banks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className={f.field}>
              <label htmlFor="acn" className={f.label}>
                계좌번호
              </label>
              <input id="acn" className={f.input} inputMode="numeric" placeholder="- 없이 숫자만" {...bind('accountNumber')} />
            </div>
            <div className={f.field}>
              <label htmlFor="ho" className={f.label}>
                예금주
              </label>
              <input id="ho" className={f.input} {...bind('accountHolder')} />
            </div>
            <p className={f.help}>판매 대금은 매달 10일, 지난달 구매 확정분에서 수수료 10%를 뺀 금액이 예치금으로 들어와요.</p>
            <p className={f.help}>한 사람과 한 사업자번호로 심사 중인 신청은 하나만 둘 수 있어요.</p>
          </section>
          {error && (
            <div className={s.mobileBlock}>
              <Notice tone="error">{error}</Notice>
            </div>
          )}
        </form>
      )}
    </AppFrame>
  )
}
