import { useEffect, useState, type ChangeEvent } from 'react'
import { errorMessage } from '../lib/api'
import {
  BANKS,
  getMySeller,
  requestSellerWithdrawal,
  updateSeller,
  type MySeller,
  type SellerStatus,
  type SellerUpdateRequest,
} from '../lib/api/member'
import { useApi } from '../lib/useApi'
import { NOTICE, makeCx, phone } from '../lib/ui'
import styles from './SellerInfo.module.css'
import SellerLayout from '../components/SellerLayout'

const cx = makeCx(styles)

// [칩 색, 표시 이름]
const STATUS: Record<SellerStatus, [string, string]> = {
  PENDING: ['c-blue', '심사 중'],
  APPROVED: ['c-ok', '판매 중'],
  REJECTED: ['c-low', '반려됨'],
  WITHDRAW_REQUESTED: ['c-low', '철회 심사 중'],
  WITHDRAWN: ['c-mute', '철회됨'],
  SANCTIONED: ['c-low', '이용 제한'],
}

/** 1234567890 → 123-45-67890 */
const fmtBusinessNumber = (n: string | null) =>
  n && /^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}` : (n ?? '-')

type Form = {
  businessName: string
  phoneNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
}

const toForm = (s: MySeller): Form => ({
  businessName: s.businessName,
  phoneNumber: phone(s.phoneNumber),
  bankName: s.bankName,
  accountNumber: '', // 끝 4자리만 내려온다. 새로 입력했을 때만 계좌를 바꾼다.
  accountHolder: s.accountHolder,
})

/** 바뀐 값만 담는다. 정산 계좌는 은행·계좌번호·예금주 중 하나라도 바뀌면 셋을 함께 보낸다. */
function diff(seller: MySeller, form: Form): SellerUpdateRequest {
  const body: SellerUpdateRequest = {}
  if (form.businessName.trim() !== seller.businessName) body.businessName = form.businessName.trim()
  // 백엔드는 숫자만 저장하므로 숫자끼리 비교한다
  if (form.phoneNumber.replace(/\D/g, '') !== seller.phoneNumber) body.phoneNumber = form.phoneNumber
  const accountChanged =
    form.accountNumber !== '' || form.bankName !== seller.bankName || form.accountHolder !== seller.accountHolder
  if (accountChanged) {
    body.bankName = form.bankName
    body.accountNumber = form.accountNumber
    body.accountHolder = form.accountHolder.trim()
  }
  return body
}

/** 내 판매자 정보 조회·수정 */
function useSellerInfo() {
  const { data: seller, setData: setSeller, error: loadError } = useApi(getMySeller)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (seller) setForm(toForm(seller))
  }, [seller])

  const bind = (key: keyof Form) => ({
    value: form?.[key] ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f)),
  })

  async function save() {
    if (!seller || !form || saving) return
    const body = diff(seller, form)
    if (Object.keys(body).length === 0) return
    setSaveError('')
    setSaving(true)
    try {
      setSeller(await updateSeller(body))
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // 저장된 은행이 선택지에 없으면 맨 앞에 넣어 그대로 보이게 한다.
  const banks = seller && !BANKS.includes(seller.bankName) ? [seller.bankName, ...BANKS] : BANKS

  return { seller, setSeller, bind, save, saving, error: saveError || loadError || '', banks }
}

/**
 * 철회 요청 패널. 사유는 필수.
 * 미정산 금액 API가 생기기 전까지 철회 버튼은 비활성이라 ?withdrawPanel=보임 으로 패널을 열어 확인한다.
 */
function useWithdrawal(initialOpen: boolean, onDone: (s: MySeller) => void) {
  const [open, setOpen] = useState(initialOpen)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function close() {
    setOpen(false)
    setReason('')
    setError('')
  }

  async function submit() {
    if (!reason.trim() || submitting) return
    setError('')
    setSubmitting(true)
    try {
      onDone(await requestSellerWithdrawal(reason.trim()))
      close()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return { open, setOpen, close, reason, setReason, submit, submitting, error }
}

/** 판매자 정보 */
export default function SellerInfoPage({ withdrawPanel = '숨김' }: { withdrawPanel?: '숨김' | '보임' }) {
  const { seller, setSeller, bind, save, saving, error, banks } = useSellerInfo()
  const w = useWithdrawal(withdrawPanel === '보임', setSeller)
  const [chip, label] = seller ? STATUS[seller.status] : STATUS.APPROVED
  const last4 = seller?.accountNumber.slice(-4)
  return (
    <div className={styles.page}>
      <SellerLayout active="판매자 정보" minHeight={1040}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>판매자 정보</h1>
          <span className={cx('chip', chip)}>{label}</span>
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
                {fmtBusinessNumber(seller?.businessNumber ?? null)}
              </dd>
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
                  {...bind('businessName')}
                  className={cx('in')}
                  type="text"
                  placeholder=""
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
                  placeholder=""
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="bk" style={{ fontSize: '14px', fontWeight: '500' }}>
                  은행
                </label>
                <select id="bk" {...bind('bankName')} className={cx('in')}>
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
                  placeholder={last4 ? `끝자리 ${last4}` : ''}
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
            <span className={cx('sub')}>정산 계좌는 끝 네 자리만 보여요. 바꾸려면 계좌번호를 새로 입력해 주세요.</span>
            {error && (
              <p role="alert" style={NOTICE}>
                {error}
              </p>
            )}
            <button
              className={cx('btn btn-p')}
              disabled={!seller || saving}
              onClick={save}
              style={{ alignSelf: 'flex-end' }}
            >
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
          {w.open && (
            <section
              className={cx('panel')}
              style={{
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                outline: '2px solid #8A6A2C',
              }}
            >
              <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '700' }}>판매를 그만둘까요?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label htmlFor="wr" style={{ fontSize: '14px', fontWeight: '500' }}>
                  사유 (필수)
                </label>
                <textarea
                  id="wr"
                  className={cx('in')}
                  style={{ minHeight: '96px', padding: '12px 14px' }}
                  maxLength={255}
                  value={w.reason}
                  onChange={(e) => w.setReason(e.target.value)}
                ></textarea>
              </div>
              <p className={cx('sub')} style={{ margin: '0', fontSize: '14px' }}>
                관리자가 승인하면 모든 상품의 판매가 멈추고 판매자 센터가 닫혀요. 구매는 계속할 수 있어요.
              </p>
              {w.error && (
                <p role="alert" style={NOTICE}>
                  {w.error}
                </p>
              )}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button className={cx('btn')} onClick={w.close}>
                  닫기
                </button>
                <button className={cx('btn btn-p')} disabled={!w.reason.trim() || w.submitting} onClick={w.submit}>
                  요청하기
                </button>
              </div>
            </section>
          )}
        </div>
      </SellerLayout>
    </div>
  )
}
