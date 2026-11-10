import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { ErrorView, Loading, won } from '../../components/ui/Misc'
import f from '../../components/ui/form.module.css'
import { ApiError, errorMessage } from '../../lib/api'
import { getWithdrawalCheck, withdrawMember } from '../../lib/api/member'
import { logout } from '../../lib/auth'
import { useApi } from '../../lib/useApi'
import { useMySeller } from './MyPage'
import { SELLER_META } from './util'
import s from './account.module.css'

function Check({ ok, label, value, help }: { ok: boolean; label: string; value: string; help?: ReactNode }) {
  return (
    <li>
      <div className={s.checkRow}>
        <span aria-label={ok ? '충족' : '미충족'} className={ok ? s.ok : s.ng}>
          <Icon name={ok ? 'check' : 'close'} size={20} />
        </span>
        <span>{label}</span>
        <b className={ok ? undefined : s.ngText}>{value}</b>
      </div>
      {!ok && help && <p className={s.checkHelp}>{help}</p>}
    </li>
  )
}

/**
 * ⑰ 회원 탈퇴: 조건 조회 → 비밀번호 확인 → 탈퇴.
 * 성공하면 홈으로 이동한 뒤 로그인 상태를 지운다 (먼저 지우면 이 화면이 로그인으로 보낸다)
 */
export default function WithdrawPage() {
  const navigate = useNavigate()
  const check = useApi(getWithdrawalCheck, [])
  const seller = useMySeller()
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const c = check.data

  async function submit() {
    if (!password || submitting || !c?.withdrawable) return
    setError('')
    setSubmitting(true)
    try {
      await withdrawMember(password)
      navigate('/', { replace: true })
      await logout().catch(() => {})
    } catch (e) {
      setError(errorMessage(e))
      // 조건이 바뀌었으면(409) 목록을 다시 불러와 남은 항목을 보여준다
      if (e instanceof ApiError && e.status === 409) check.reload()
      setSubmitting(false)
    }
  }

  const sellerActive = !!c?.reasons.includes('SELLER_ACTIVE')
  const sellerLabel = seller ? SELLER_META[seller.status].tag : '판매자 아님'
  const blockNote = !c
    ? ''
    : c.withdrawable
      ? '비밀번호를 입력하면 탈퇴할 수 있어요'
      : c.balance > 0
        ? '예치금 잔액이 남아 있어 아직 탈퇴할 수 없어요'
        : '채워지지 않은 조건이 있어 아직 탈퇴할 수 없어요'

  return (
    <AppFrame
      bottom={
        <BottomBar note={blockNote}>
          <Button
            size="lg"
            variant="danger"
            disabled={!c?.withdrawable || !password || submitting}
            onClick={submit}
          >
            {submitting ? '탈퇴하는 중…' : '탈퇴하기'}
          </Button>
        </BottomBar>
      }
    >
      <PageHeader title="회원 탈퇴" back="/mypage/profile" />
      <div className={s.stepBody}>
        <h2 className={s.bigTitle}>탈퇴하기 전에 확인해 주세요</h2>
        <p className={s.lead}>아래 조건을 모두 채워야 탈퇴할 수 있어요.</p>
        {check.loading && !c && <Loading />}
        {check.error && <ErrorView message={check.error} onRetry={check.reload} />}
        {c && (
          <ul className={s.checks}>
            <Check
              ok={!c.hasActiveOrders}
              label="진행 중인 주문"
              value={c.hasActiveOrders ? '있어요' : '없어요'}
              help={
                <>
                  구매 확정이나 반품이 끝난 뒤 탈퇴할 수 있어요. <Link to="/orders">주문 내역 보기</Link>
                </>
              }
            />
            {(seller || c.hasActiveSales) && (
              <Check
                ok={!c.hasActiveSales}
                label="진행 중인 판매"
                value={c.hasActiveSales ? '있어요' : '없어요'}
                help="판매한 주문의 구매 확정과 정산이 끝난 뒤 탈퇴할 수 있어요."
              />
            )}
            <Check
              ok={c.unsettledAmount <= 0}
              label="정산받지 않은 금액"
              value={won(c.unsettledAmount)}
              help="정산이 끝난 뒤 탈퇴할 수 있어요."
            />
            <Check
              ok={c.balance <= 0}
              label="예치금 잔액"
              value={won(c.balance)}
              help={
                <>
                  쓰지 않은 충전 건은 충전 취소로 환불받은 뒤 탈퇴할 수 있어요.{' '}
                  <Link to="/wallet/topups">충전 내역 보기</Link>
                </>
              }
            />
            <Check
              ok={!c.hasPendingTopups}
              label="결과 확인 중인 충전"
              value={c.hasPendingTopups ? '있어요' : '없어요'}
              help="충전 결과를 확인하는 중이에요. 잠시 후 다시 확인해 주세요."
            />
            <Check
              ok={!sellerActive}
              label="판매자 상태"
              value={sellerActive ? `${sellerLabel}이에요` : seller ? sellerLabel : '판매자 아님'}
              help={
                <>
                  판매자 철회가 끝난 뒤 탈퇴할 수 있어요. <Link to="/seller/status">판매자 상태 보기</Link>
                </>
              }
            />
          </ul>
        )}

        <div className={`${s.note} ${s.inBody}`}>
          <p>
            탈퇴하면
            <br />· 이메일·이름·배송지 같은 개인정보는 알아볼 수 없게 바뀌어요.
            <br />· 쓴 리뷰는 남고 작성자는 "탈퇴회원"으로 보여요.
            <br />· 찜 목록은 지워져요.
            <br />· 인플루언서라면 자격이 해제되고 협약은 모두 종료돼요.
            <br />· 같은 이메일로 다시 가입할 수 있어요.
          </p>
        </div>

        <div className={`${f.field} ${s.withdrawPw}`}>
          <label htmlFor="wd-pw" className={f.label}>
            비밀번호 확인
          </label>
          <input
            id="wd-pw"
            className={f.input}
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호를 다시 입력해 주세요"
            value={password}
            disabled={!c?.withdrawable}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <p className={f.help}>15분 안에 5번 틀리면 15분 동안 시도할 수 없어요.</p>
          {error && (
            <p role="alert" className={f.error}>
              {error}
            </p>
          )}
        </div>
      </div>
    </AppFrame>
  )
}
