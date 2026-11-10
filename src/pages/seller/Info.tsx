import { useEffect, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import { Badge, ErrorView, Loading, won } from '../../components/ui/Misc'
import { Modal, Sheet } from '../../components/ui/Overlay'
import f from '../../components/ui/form.module.css'
import { errorMessage } from '../../lib/api'
import {
  BANKS,
  getMySeller,
  requestSellerWithdrawal,
  updateSeller,
  type MySeller,
  type SellerUpdateRequest,
} from '../../lib/api/member'
import { getSellerCoupons } from '../../lib/api/coupon'
import { getSellerPartnerships } from '../../lib/api/partnership'
import { useActiveSeller } from '../../lib/activeSeller'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import { phone } from '../../lib/ui'
import { Notice, SELLER_STATUS, fmtYMD } from './shared'
import s from './seller.module.css'

/** 1234567890 → 123-45-67890 */
const fmtBusinessNumber = (n: string | null) =>
  n && /^\d{10}$/.test(n) ? `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5)}` : (n ?? '-')
/** 01012345678 → 010-****-5678 */
const maskPhone = (n: string) => {
  const p = phone(n)
  const parts = p.split('-')
  return parts.length === 3 ? `${parts[0]}-****-${parts[2]}` : p
}

type Form = {
  businessName: string
  phoneNumber: string
  bankName: string
  accountNumber: string
  accountHolder: string
}
const toForm = (x: MySeller): Form => ({
  businessName: x.businessName,
  phoneNumber: phone(x.phoneNumber),
  bankName: x.bankName,
  accountNumber: '', // 끝 4자리만 내려와요. 새로 입력했을 때만 계좌를 바꿔요.
  accountHolder: x.accountHolder,
})

/** 바뀐 값만 담아요. 정산 계좌는 은행·계좌번호·예금주 중 하나라도 바뀌면 셋을 함께 보내요. */
function diff(seller: MySeller, form: Form): SellerUpdateRequest {
  const body: SellerUpdateRequest = {}
  if (form.businessName.trim() !== seller.businessName) body.businessName = form.businessName.trim()
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

/** 진행 중 협약·쿠폰 수 (판매 도구 메뉴 옆) */
function useToolCounts() {
  const partners = useApi(() => getSellerPartnerships({ status: 'ACTIVE', size: 1 }), [])
  const coupons = useApi(() => getSellerCoupons({ status: 'ACTIVE', size: 1 }), [])
  return { partners: partners.data?.totalElements, coupons: coupons.data?.totalElements }
}

/** S6 판매자 정보 (모바일에서는 협약·쿠폰 메뉴도 여기서 들어가요) */
export default function SellerInfoPage() {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const active = useActiveSeller()
  const { data: seller, setData: setSeller, loading, error: loadError, reload } = useApi(getMySeller)
  const counts = useToolCounts()

  // 정보 수정
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Form | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [done, setDone] = useState('')
  useEffect(() => {
    if (seller && editing) setForm(toForm(seller))
  }, [seller, editing])
  const bind = (key: keyof Form) => ({
    value: form?.[key] ?? '',
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((x) => (x ? { ...x, [key]: e.target.value } : x)),
  })
  const banks = seller && !BANKS.includes(seller.bankName) ? [seller.bankName, ...BANKS] : BANKS
  const closeEdit = () => {
    setEditing(false)
    setSaveError('')
  }
  async function save() {
    if (!seller || !form || saving) return
    const body = diff(seller, form)
    if (Object.keys(body).length === 0) return closeEdit()
    setSaveError('')
    setSaving(true)
    try {
      const next = await updateSeller(body)
      setSeller(next)
      // 헤더·사이드바의 상호도 함께 바꿔요
      active.setSeller(next)
      setDone('판매자 정보를 저장했어요.')
      closeEdit()
    } catch (e) {
      setSaveError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  // 철회 요청 (사유 필수, 미정산 0원일 때만)
  const [quitOpen, setQuitOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [quitting, setQuitting] = useState(false)
  const [quitError, setQuitError] = useState('')
  const unsettled = seller?.unsettledAmount
  const canWithdraw = seller?.status === 'APPROVED' && unsettled === 0
  async function withdraw() {
    if (!reason.trim() || quitting || !canWithdraw) return
    setQuitError('')
    setQuitting(true)
    try {
      const next = await requestSellerWithdrawal(reason.trim())
      active.setSeller(next)
      // 철회 심사 중에는 판매 기능이 잠겨요. 상태 화면으로 보내요.
      navigate('/seller/status', { replace: true })
    } catch (e) {
      setQuitError(errorMessage(e))
    } finally {
      setQuitting(false)
    }
  }

  if (loading && !seller)
    return (
      <ConsoleShell variant="seller" active="info" title="판매자 정보">
        <Loading />
      </ConsoleShell>
    )
  if (loadError || !seller)
    return (
      <ConsoleShell variant="seller" active="info" title="판매자 정보">
        <ErrorView message={loadError ?? '판매자 정보를 불러오지 못했어요.'} onRetry={reload} />
      </ConsoleShell>
    )

  const [statusLabel, statusTone] = SELLER_STATUS[seller.status]
  const last4 = seller.accountNumber.slice(-4)

  const profile = (
    <section className={s.panel} aria-labelledby="biz">
      <div className={s.profileHead}>
        <span className={s.avatar} aria-hidden="true">
          {seller.businessName.slice(0, 1)}
        </span>
        <div className={s.prodText}>
          <h2 id="biz" className={s.profileName}>
            {seller.businessName}
          </h2>
          <span>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </span>
        </div>
        <div className={s.profileActions}>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={seller.status !== 'APPROVED'}>
            정보 수정
          </Button>
          {/* 메인 도착 후 LogoutOnArrive가 로그아웃해요 */}
          <Button to="/" state={{ logout: true }} variant="outline" size="sm">
            로그아웃
          </Button>
        </div>
      </div>
      <dl className={s.dl}>
        <div>
          <dt>대표자</dt>
          <dd>{seller.representativeName}</dd>
        </div>
        <div>
          <dt>사업자등록번호</dt>
          <dd>{fmtBusinessNumber(seller.businessNumber)}</dd>
        </div>
        <div>
          <dt>연락처</dt>
          <dd>{maskPhone(seller.phoneNumber)}</dd>
        </div>
        <div>
          <dt>정산 계좌</dt>
          <dd>
            {seller.bankName} ···· {last4}
          </dd>
        </div>
        <div>
          <dt>승인일</dt>
          <dd>{fmtYMD(seller.approvedAt)}</dd>
        </div>
      </dl>
      <p className={s.faintLine}>
        판매 중일 때만 상호명·연락처·정산 계좌를 고칠 수 있어요. 정산 계좌는 끝 네 자리만 보여요.
      </p>
    </section>
  )

  const tools = (
    <section className={s.panel} aria-labelledby="tools">
      <h2 id="tools" className={s.h2}>
        판매 도구
      </h2>
      <Link to="/seller/partners" className={s.menuLink}>
        인플루언서 협약
        <span>
          {counts.partners !== undefined && `진행 중 ${counts.partners}`} <Icon name="chevron" size={16} />
        </span>
      </Link>
      <Link to="/seller/coupons" className={s.menuLink}>
        상품 쿠폰
        <span>
          {counts.coupons !== undefined && `진행 중 ${counts.coupons}`} <Icon name="chevron" size={16} />
        </span>
      </Link>
    </section>
  )

  const quitText = `철회를 요청하면 관리자가 확인하는 동안 판매 기능이 잠기고, 승인되면 판매 중인 상품이 모두 중지돼요. 구매는 그대로 할 수 있어요.`
  const quitBlocked =
    seller.status !== 'APPROVED'
      ? '판매 중일 때만 철회를 요청할 수 있어요.'
      : unsettled
        ? `정산받지 않은 금액(${won(unsettled)})이 있어서 지금은 요청할 수 없어요.`
        : ''
  const reasonField = (
    <div className={f.field}>
      <label htmlFor="quit-reason" className={f.label}>
        철회 사유<span className={f.req}>*</span>
      </label>
      <textarea
        id="quit-reason"
        className={f.textarea}
        rows={3}
        maxLength={255}
        value={reason}
        disabled={!canWithdraw}
        onChange={(e) => setReason(e.target.value)}
      />
    </div>
  )

  const editForm = form && (
    <>
      <div className={f.field}>
        <label htmlFor="sn" className={f.label}>
          상호명
        </label>
        <input id="sn" className={f.input} {...bind('businessName')} />
      </div>
      <div className={f.field}>
        <label htmlFor="sp" className={f.label}>
          연락처
        </label>
        <input id="sp" className={f.input} type="tel" inputMode="numeric" {...bind('phoneNumber')} />
      </div>
      <div className={f.field}>
        <label htmlFor="bk" className={f.label}>
          은행
        </label>
        <select id="bk" className={f.select} {...bind('bankName')}>
          {banks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      <div className={f.field}>
        <label htmlFor="ac" className={f.label}>
          계좌번호
        </label>
        <input
          id="ac"
          className={f.input}
          inputMode="numeric"
          placeholder={last4 ? `끝자리 ${last4} · 바꿀 때만 입력` : ''}
          {...bind('accountNumber')}
        />
      </div>
      <div className={f.field}>
        <label htmlFor="ho" className={f.label}>
          예금주
        </label>
        <input id="ho" className={f.input} {...bind('accountHolder')} />
      </div>
      <p className={f.help}>정산 계좌는 끝 네 자리만 보여요. 바꾸려면 계좌번호를 새로 입력해 주세요.</p>
      {saveError && <Notice tone="error">{saveError}</Notice>}
    </>
  )
  const editActions = (
    <>
      <Button variant="outline" onClick={closeEdit} disabled={saving}>
        닫기
      </Button>
      <Button onClick={save} disabled={saving}>
        {saving ? '저장하는 중' : '저장하기'}
      </Button>
    </>
  )

  return (
    <ConsoleShell variant="seller" active="info" title="판매자 정보">
      {done && (
        <div className={desktop ? s.gapBottom : s.mobileBlock}>
          <Notice onClose={() => setDone('')}>{done}</Notice>
        </div>
      )}
      {desktop ? (
        <div className={s.infoGrid}>
          {profile}
          <div className={s.stack}>
            {tools}
            <section className={s.panel} aria-labelledby="quit">
              <h2 id="quit" className={s.h2}>
                판매 그만두기
              </h2>
              <p className={s.para}>
                {quitText} 정산받지 않은 금액({won(unsettled)})이 있으면 요청할 수 없어요.
              </p>
              {reasonField}
              {quitBlocked && <p className={s.faintLine}>{quitBlocked}</p>}
              {quitError && <Notice tone="error">{quitError}</Notice>}
              <div className={s.right}>
                <Button variant="dangerOutline" onClick={withdraw} disabled={!canWithdraw || !reason.trim() || quitting}>
                  {quitting ? '요청하는 중' : '철회 요청'}
                </Button>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className={s.mobileStack}>
          {profile}
          <section className={s.panel} aria-labelledby="pend">
            <div className={s.sectionHead}>
              <h2 id="pend" className={s.h2}>
                아직 정산받지 않은 금액
              </h2>
              <b className={s.amount}>{won(unsettled)}</b>
            </div>
          </section>
          {tools}
          <section className={s.panel} aria-labelledby="quit">
            <h2 id="quit" className={s.h2}>
              판매 그만두기
            </h2>
            <p className={s.para}>{quitText}</p>
            {quitBlocked && <p className={s.faintLine}>{quitBlocked}</p>}
            <Button variant="dangerOutline" onClick={() => setQuitOpen(true)} disabled={!canWithdraw}>
              철회 요청
            </Button>
          </section>
        </div>
      )}

      {editing &&
        (desktop ? (
          <Modal title="판매자 정보 수정" onClose={closeEdit} actions={editActions}>
            <div className={s.modalForm}>{editForm}</div>
          </Modal>
        ) : (
          <Sheet title="판매자 정보 수정" onClose={closeEdit} footer={<div className={s.sheetActions}>{editActions}</div>}>
            {editForm}
          </Sheet>
        ))}
      {quitOpen && !desktop && (
        <Sheet
          title="판매를 그만둘까요?"
          onClose={() => setQuitOpen(false)}
          footer={
            <div className={s.sheetActions}>
              <Button variant="outline" onClick={() => setQuitOpen(false)} disabled={quitting}>
                닫기
              </Button>
              <Button variant="danger" onClick={withdraw} disabled={!reason.trim() || quitting}>
                {quitting ? '요청하는 중' : '요청하기'}
              </Button>
            </div>
          }
        >
          <p className={s.para}>{quitText}</p>
          {reasonField}
          {quitError && <Notice tone="error">{quitError}</Notice>}
        </Sheet>
      )}
    </ConsoleShell>
  )
}
