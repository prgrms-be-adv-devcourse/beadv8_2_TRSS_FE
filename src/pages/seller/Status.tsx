import { useSearchParams } from 'react-router-dom'
import AppFrame from '../../components/ui/AppFrame'
import BottomBar from '../../components/ui/BottomBar'
import Button from '../../components/ui/Button'
import Icon, { type IconName } from '../../components/ui/Icon'
import PageHeader from '../../components/ui/PageHeader'
import { Badge, Empty, ErrorView, Loading, type Tone } from '../../components/ui/Misc'
import { ApiError } from '../../lib/api'
import { getMySeller, type MySeller, type SellerStatus } from '../../lib/api/member'
import { useApi } from '../../lib/useApi'
import { SELLER_STATUS, fmtYMD } from './shared'
import s from './seller.module.css'

type View = {
  icon: IconName
  title: string
  desc: string
  dateLabel: string
  date: (x: MySeller) => string | null
  reasonLabel?: string
  primary?: [string, string]
}

/** S8 상태별 안내 (심사 중 · 판매 중 · 반려 · 철회 심사 중 · 철회됨 · 이용 제한) */
const VIEW: Record<SellerStatus, View> = {
  PENDING: {
    icon: 'receipt',
    title: '신청 내용을 확인하고 있어요',
    desc: '관리자가 사업자 정보를 확인한 뒤 판매를 시작할 수 있어요.',
    dateLabel: '신청일',
    date: (x) => x.appliedAt,
  },
  APPROVED: {
    icon: 'check',
    title: '판매자로 승인됐어요',
    desc: '상품을 등록하고 주문과 정산을 관리할 수 있어요.',
    dateLabel: '승인일',
    date: (x) => x.approvedAt,
    primary: ['판매자 센터로 가기', '/seller/products'],
  },
  REJECTED: {
    icon: 'close',
    title: '신청이 반려됐어요',
    desc: '반려 사유를 확인하고 고친 뒤 다시 신청할 수 있어요.',
    dateLabel: '신청일',
    date: (x) => x.appliedAt,
    reasonLabel: '반려 사유',
    primary: ['다시 신청하기', '/seller/apply'],
  },
  WITHDRAW_REQUESTED: {
    icon: 'receipt',
    title: '판매 철회를 요청했어요',
    desc: '관리자가 확인하는 동안 판매 기능은 잠겨요. 구매는 그대로 할 수 있어요.',
    dateLabel: '승인일',
    date: (x) => x.approvedAt,
    reasonLabel: '철회 사유',
  },
  WITHDRAWN: {
    icon: 'check',
    title: '판매를 그만뒀어요',
    desc: '구매는 그대로 할 수 있어요. 다시 판매하려면 새로 신청해 주세요.',
    dateLabel: '신청일',
    date: (x) => x.appliedAt,
    primary: ['다시 신청하기', '/seller/apply'],
  },
  SANCTIONED: {
    icon: 'close',
    title: '판매 활동이 제한됐어요',
    desc: '다시 신청할 수 없어요.',
    dateLabel: '신청일',
    date: (x) => x.appliedAt,
    reasonLabel: '제한 사유',
  },
}

const TONE_CLASS: Record<Tone, string> = {
  neutral: s.toneNeutral,
  green: s.toneGreen,
  red: s.toneRed,
  blue: s.toneBlue,
  amber: s.toneAmber,
  dark: s.toneNeutral,
}

/**
 * S8-1 판매자 신청 상태 (로그인 회원)
 * 디자인 확인용으로 ?state=PENDING|APPROVED|REJECTED|WITHDRAW_REQUESTED|WITHDRAWN|SANCTIONED 를 주면 그 상태로 보여요.
 */
export default function SellerStatusPage() {
  const [params] = useSearchParams()
  const preview = params.get('state') as SellerStatus | null
  const { data, loading, error, reload } = useApi(() =>
    getMySeller().catch((e) => {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }),
  )

  const seller = data && preview && preview in VIEW ? { ...data, status: preview } : data
  const v = seller ? VIEW[seller.status] : null
  const [chip, tone] = seller ? SELLER_STATUS[seller.status] : ['', 'neutral' as Tone]

  return (
    <AppFrame
      bottom={
        v && (
          <BottomBar>
            {v.primary ? (
              <Button size="lg" to={v.primary[1]}>
                {v.primary[0]}
              </Button>
            ) : (
              <Button size="lg" variant="outline" to="/mypage">
                내 정보로 돌아가기
              </Button>
            )}
          </BottomBar>
        )
      }
    >
      <PageHeader title="판매자 신청" back="/mypage" />
      {loading && !data && <Loading />}
      {error && <ErrorView message={error} onRetry={reload} />}
      {!loading && !error && !seller && (
        <Empty
          title="아직 판매자 신청을 하지 않았어요"
          action={
            <Button size="sm" to="/seller/apply">
              판매자 신청하기
            </Button>
          }
        >
          사업자 정보와 정산 계좌를 입력하면 관리자가 확인해요.
        </Empty>
      )}
      {seller && v && (
        <div className={s.statusWrap}>
          <section className={s.statusHero}>
            <span className={`${s.statusIcon} ${TONE_CLASS[tone]}`} aria-hidden="true">
              <Icon name={v.icon} size={28} />
            </span>
            <Badge tone={tone}>{chip}</Badge>
            <h2 className={s.statusTitle}>{v.title}</h2>
            <p className={s.statusDesc}>{v.desc}</p>
          </section>
          {v.reasonLabel && seller.reason && (
            <div className={s.reasonBox}>
              <p className={s.reasonLabel}>{v.reasonLabel}</p>
              <p>{seller.reason}</p>
            </div>
          )}
          <dl className={s.dl}>
            <div>
              <dt>상호명</dt>
              <dd>{seller.businessName || '-'}</dd>
            </div>
            <div>
              <dt>사업자등록번호</dt>
              <dd>{seller.businessNumber || '-'}</dd>
            </div>
            <div>
              <dt>{v.dateLabel}</dt>
              <dd>{fmtYMD(v.date(seller))}</dd>
            </div>
          </dl>
        </div>
      )}
    </AppFrame>
  )
}
