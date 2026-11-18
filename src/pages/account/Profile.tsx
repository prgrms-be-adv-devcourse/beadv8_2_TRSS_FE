import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import Button from '../../components/ui/Button'
import ProfileAvatar from '../../components/ui/ProfileAvatar'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, won } from '../../components/ui/Misc'
import { Modal } from '../../components/ui/Overlay'
import { errorMessage } from '../../lib/api'
import { getWithdrawalCheck, unlinkKakao } from '../../lib/api/member'
import { loadMe, memberTypeLabel, useAuth } from '../../lib/auth'
import { kakaoEnabled, startKakao } from '../../lib/kakao'
import { useApi } from '../../lib/useApi'
import { INFLUENCER_META, useInfluencerStatus } from '../influencer/influencerStatus'
import type { KakaoLinkState } from './KakaoCallback'
import { KakaoSymbol } from './Login'
import { useMySeller } from './MyPage'
import { fmtDate, SELLER_META, type SellerView } from './util'
import s from './account.module.css'

type Result = { ok: boolean; message: string } | undefined

/**
 * 카카오 계정 연결·해제.
 * 연결은 카카오 인가 화면을 거쳐 콜백 화면이 처리하고, 결과를 location.state.kakao로 넘겨 준다.
 */
function useKakaoLink() {
  const location = useLocation()
  const navigate = useNavigate()
  const [result, setResult] = useState<Result>((location.state as KakaoLinkState | null)?.kakao)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 새로고침하면 결과 안내가 다시 뜨지 않게 넘겨받은 표시를 지운다
  useEffect(() => {
    if ((location.state as KakaoLinkState | null)?.kakao)
      navigate(location.pathname + location.search, { replace: true })
  }, [location, navigate])

  function link() {
    setResult(undefined)
    if (!startKakao('link'))
      setResult({ ok: false, message: '지금은 카카오 연결을 쓸 수 없어요. 잠시 후 다시 시도해 주세요.' })
  }

  async function unlink() {
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await unlinkKakao()
      await loadMe().catch(() => null)
      setOpen(false)
      setResult({ ok: true, message: '카카오 연결을 해제했어요. 다음부터는 이메일로 로그인해 주세요.' })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return {
    result,
    link,
    open,
    openConfirm: () => (setResult(undefined), setOpen(true)),
    close: () => (setOpen(false), setError('')),
    unlink,
    submitting,
    error,
  }
}

/** ⑨-1 내 정보 (화면 확인용: ?sellerStatus=…, ?influencerStatus=…) */
export default function ProfilePage(props: { sellerStatus?: SellerView; influencerStatus?: string }) {
  const { me } = useAuth()
  const seller = useMySeller(!props.sellerStatus)
  const sellerView: SellerView = props.sellerStatus ?? seller?.status ?? '신청 전'
  const sm = SELLER_META[sellerView] ?? SELLER_META['신청 전']
  const sellerText =
    sellerView === 'REJECTED' && !props.sellerStatus && seller?.reason ? `반려 사유: ${seller.reason}` : sm.text
  const inf = useInfluencerStatus(props.influencerStatus)
  const im = INFLUENCER_META[inf.view ?? '신청 전']
  // 한쪽이 승인되면 반대쪽 신청 카드는 숨겨요. 심사 중·반려는 그대로 보여 주고,
  // 백엔드가 중복 신청을 막지 않아 둘 다 승인된 경우에는 두 카드를 모두 보여 줘요.
  const sellerApproved = sellerView === 'APPROVED'
  const influencerApproved = inf.view === 'APPROVED'
  const showSeller = !influencerApproved || sellerApproved
  const showInfluencer = !sellerApproved || influencerApproved
  const check = useApi(getWithdrawalCheck, [])
  const k = useKakaoLink()
  const c = check.data
  const typeLabel = me ? memberTypeLabel(me.role, seller?.status) : '…'

  return (
    <AppFrame>
      <PageHeader title="내 정보" back="/mypage" />

      <section aria-labelledby="pf-basic" className={s.card}>
        <div className={s.cardHead}>
          <ProfileAvatar me={me} className={s.avatar} />
          <h2 id="pf-basic">{me?.name ?? '…'}</h2>
          <Badge>{typeLabel}</Badge>
        </div>
        <dl className={s.dl}>
          <div>
            <dt>이름</dt>
            <dd>{me?.name ?? '…'}</dd>
          </div>
          <div>
            <dt>이메일</dt>
            <dd>{me?.email ?? '…'}</dd>
          </div>
          <div>
            <dt>회원 유형</dt>
            <dd>{typeLabel}</dd>
          </div>
          <div>
            <dt>가입일</dt>
            <dd>{fmtDate(me?.createdAt)}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="pf-kakao" className={s.card}>
        {k.result && (
          <p role={k.result.ok ? 'status' : 'alert'} className={`${k.result.ok ? s.success : s.alert} ${s.cardMsg}`}>
            {k.result.message}
          </p>
        )}
        <div className={s.cardHead}>
          <h2 id="pf-kakao">
            <KakaoSymbol />
            카카오 로그인
          </h2>
          {me && <Badge tone={me.kakaoLinked ? 'green' : 'neutral'}>{me.kakaoLinked ? '연결됨' : '연결 안 됨'}</Badge>}
        </div>
        <p className={s.cardText}>
          {me?.kakaoLinked
            ? '카카오로 간편하게 로그인할 수 있어요.'
            : '카카오 계정을 연결하면 로그인 화면에서 카카오로 로그인할 수 있어요.'}
        </p>
        {me && (
          <div className={s.rightActions}>
            {me.kakaoLinked ? (
              <Button variant="outline" size="sm" onClick={k.openConfirm}>
                연결 해제
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={k.link} disabled={!kakaoEnabled}>
                카카오 연결
              </Button>
            )}
          </div>
        )}
      </section>

      {showSeller && (
        <section aria-labelledby="pf-seller" className={s.card}>
          <div className={s.cardHead}>
            <h2 id="pf-seller">판매자로 활동하기</h2>
            <Badge tone={sm.tone}>{sm.tag}</Badge>
          </div>
          <p className={s.cardText}>{sellerText}</p>
          <div className={s.rightActions}>
            <Button to={sm.to} size="sm" variant="outline">
              {sm.act ?? '신청 상태 보기'}
            </Button>
          </div>
        </section>
      )}

      {showInfluencer && (
        <section aria-labelledby="pf-inf" className={s.card}>
          <div className={s.cardHead}>
            <h2 id="pf-inf">인플루언서로 활동하기</h2>
            <Badge tone={im.tone}>{im.tag}</Badge>
          </div>
          <p className={s.cardText}>{im.text}</p>
          <div className={s.rightActions}>
            <Button to={im.to} size="sm" variant="outline">
              {im.act ?? '신청 상태 보기'}
            </Button>
          </div>
        </section>
      )}

      <section aria-labelledby="pf-leave" className={`${s.card} ${s.lastCard}`}>
        <div className={s.cardHead}>
          <h2 id="pf-leave">회원 탈퇴</h2>
        </div>
        <p className={s.cardText}>모든 항목이 비어야 탈퇴할 수 있어요.</p>
        <dl className={s.dl}>
          <div>
            <dt>남은 예치금</dt>
            <dd>{c ? won(c.balance) : '…'}</dd>
          </div>
          <div>
            <dt>진행 중인 주문</dt>
            <dd>{c ? (c.hasActiveOrders ? '있어요' : '없어요') : '…'}</dd>
          </div>
          <div>
            <dt>정산받지 않은 금액</dt>
            <dd>{c ? won(c.unsettledAmount) : '…'}</dd>
          </div>
          <div>
            <dt>판매자 활동</dt>
            <dd>{c ? (c.reasons.includes('SELLER_ACTIVE') ? `${sm.tag}이에요` : '없어요') : '…'}</dd>
          </div>
        </dl>
        <p className={s.cardText}>
          예치금은 자동으로 돌려드리지 않으니 쓰거나, <Link to="/wallet/topups">쓰지 않은 충전 건을 취소</Link>해
          주세요. 탈퇴하면 개인정보는 복구할 수 없게 지워져요.
        </p>
        <div className={s.centerActions}>
          <Button to="/mypage/withdraw" variant="outline" size="sm">
            탈퇴 조건 확인하고 진행하기
          </Button>
        </div>
      </section>

      {k.open && (
        <Modal
          title="카카오 연결을 해제할까요?"
          onClose={k.close}
          actions={
            <>
              <Button variant="outline" onClick={k.close}>
                닫기
              </Button>
              <Button disabled={k.submitting} onClick={k.unlink}>
                연결 해제
              </Button>
            </>
          }
        >
          해제하면 카카오로 로그인할 수 없어요. 이메일과 비밀번호로는 계속 로그인할 수 있고, 언제든 다시 연결할 수
          있어요.
          {k.error && (
            <p role="alert" className={`${s.alert} ${s.cardMsg}`}>
              {k.error}
            </p>
          )}
        </Modal>
      )}
    </AppFrame>
  )
}
