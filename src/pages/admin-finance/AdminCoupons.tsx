import { useEffect, useMemo, useState } from 'react'
import Button from '../../components/ui/Button'
import ConsoleShell from '../../components/ui/ConsoleShell'
import Icon from '../../components/ui/Icon'
import { Badge, Empty, ErrorView, Loading, Segment, Tabs, won, type Tone } from '../../components/ui/Misc'
import c from '../../components/ui/console.module.css'
import { toPageParam } from '../../lib/api'
import {
  COUPON_DISPLAY_STATUS_LABEL,
  COUPON_STOPPED_BY_LABEL,
  COUPON_USAGE_STATUS_LABEL,
  DISCOUNT_TYPE_LABEL,
  getAdminCoupon,
  getAdminCoupons,
  stopAdminCoupon,
  type AdminCouponSummary,
  type CouponDisplayStatus,
} from '../../lib/api/coupon'
import {
  PARTNERSHIP_ENDED_BY_LABEL,
  PARTNERSHIP_STATUS_LABEL,
  getAdminPartnerships,
  type Partnership,
  type PartnershipStatus,
} from '../../lib/api/partnership'
import { useApi } from '../../lib/useApi'
import { useIsDesktop } from '../../lib/useMedia'
import CartCouponForm from './CartCouponForm'
import { lastDay, mmdd, ymdhm } from './format'
import { Drawer, Notice, Pager, ReasonModal, Row } from './parts'
import s from './AdminFinance.module.css'

const PAGE_SIZE = 20
const COUPON_COLS = '1.3fr .6fr 1.4fr 1fr .8fr .7fr .8fr'
const PARTNER_COLS = '1.2fr 1.2fr .7fr .8fr .8fr .8fr'

export const COUPON_TONE: Record<CouponDisplayStatus, Tone> = {
  SCHEDULED: 'blue',
  ACTIVE: 'green',
  ENDED: 'neutral',
  STOPPED: 'red',
}
const PARTNER_TONE: Record<PartnershipStatus, Tone> = {
  REQUESTED: 'amber',
  ACTIVE: 'green',
  REJECTED: 'neutral',
  ENDED: 'neutral',
}
/** 화면에서는 ACTIVE를 '진행 중'으로 보여요 (시안) */
const couponStatusLabel = (st: CouponDisplayStatus) => (st === 'ACTIVE' ? '진행 중' : COUPON_DISPLAY_STATUS_LABEL[st])
const canStop = (st: CouponDisplayStatus) => st === 'ACTIVE' || st === 'SCHEDULED'

type View = 'coupons' | 'partners'
type PartnerTab = 'ALL' | PartnershipStatus
const PARTNER_TABS: { value: PartnerTab; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'REQUESTED', label: '요청 중' },
  { value: 'ACTIVE', label: '진행 중' },
  { value: 'ENDED', label: '종료' },
  { value: 'REJECTED', label: '거절' },
]

const pName = (p: Partnership) => p.businessName ?? `판매자 #${p.sellerId}`
const iName = (p: Partnership) => p.activityName ?? `인플루언서 #${p.influencerId}`

/** 관리자 · 쿠폰 · 협약 (A10) */
export default function AdminCoupons() {
  const desktop = useIsDesktop()
  const [view, setView] = useState<View>('coupons')
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [partnerTab, setPartnerTab] = useState<PartnerTab>('ALL')
  const [partnerPage, setPartnerPage] = useState(1)
  const [notice, setNotice] = useState('')
  const [stopTarget, setStopTarget] = useState<AdminCouponSummary | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)

  const coupons = useApi(() => getAdminCoupons({ page: toPageParam(page), size: PAGE_SIZE }), [page])
  const partnerStatus = partnerTab === 'ALL' ? undefined : partnerTab
  const partners = useApi(
    () => getAdminPartnerships({ status: partnerStatus, page: toPageParam(partnerPage), size: PAGE_SIZE }),
    [partnerStatus, partnerPage],
  )
  // 상품 쿠폰 '발행' 칸에 상호명·활동명을 보이려고 최근 협약 100건을 같이 불러요 (쿠폰 응답에는 ID만 있어요)
  const partnerIndex = useApi(() => getAdminPartnerships({ size: 100 }), [])
  const partnerMap = useMemo(() => {
    const m = new Map<number, Partnership>()
    for (const p of partnerIndex.data?.items ?? []) m.set(p.partnershipId, p)
    return m
  }, [partnerIndex.data])

  useEffect(() => setPartnerPage(1), [partnerTab])

  const issuer = (cp: AdminCouponSummary) => {
    if (cp.issuerType === 'ADMIN') return '관리자'
    const p = cp.productCoupon ? partnerMap.get(cp.productCoupon.partnershipId) : undefined
    if (p) return `${pName(p)} · ${iName(p)}`
    return `판매자 #${cp.issuerId}${cp.productCoupon ? ` · 인플루언서 #${cp.productCoupon.influencerId}` : ''}`
  }
  const usage = (cp: AdminCouponSummary) =>
    `${cp.usedCount.toLocaleString('ko-KR')} / ${cp.quantityLimited ? (cp.totalQuantity ?? 0).toLocaleString('ko-KR') : '제한 없음'}`
  const period = (cp: { validFrom: string; validUntil: string }) => `${mmdd(cp.validFrom)} ~ ${lastDay(cp.validUntil)}`

  // TODO(API 미구현): 관리자 쿠폰 목록에 쿠폰명 검색 파라미터가 없어요 — 지금은 불러온 페이지 안에서만 걸러요
  const couponRows = useMemo(() => {
    const items = coupons.error ? [] : (coupons.data?.items ?? [])
    const q = keyword.trim()
    return q ? items.filter((cp) => cp.name.includes(q)) : items
  }, [coupons.data, coupons.error, keyword])

  const viewTabs = [
    { value: 'coupons' as View, label: `쿠폰${coupons.data ? ` ${coupons.data.totalElements}` : ''}` },
    { value: 'partners' as View, label: `협약${partnerIndex.data ? ` ${partnerIndex.data.totalElements}` : ''}` },
  ]

  async function confirmStop(reason: string) {
    if (!stopTarget) return
    await stopAdminCoupon(stopTarget.couponId, reason)
    setNotice(`'${stopTarget.name}' 쿠폰을 중지했어요. 이미 주문에 예약된 쿠폰은 그대로 결제·취소를 따라가요.`)
    coupons.reload()
  }

  const stopButton = (cp: AdminCouponSummary) =>
    canStop(cp.status) && (
      <Button
        variant="dangerOutline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation()
          setStopTarget(cp)
        }}
      >
        강제 중지
      </Button>
    )

  const couponState =
    coupons.loading && !coupons.data ? (
      <Loading />
    ) : coupons.error ? (
      <ErrorView message={coupons.error} onRetry={coupons.reload} />
    ) : couponRows.length === 0 ? (
      <Empty title={keyword.trim() ? '검색 결과가 없어요.' : '등록된 쿠폰이 없어요.'} />
    ) : null

  const partnerRows = partners.error ? [] : (partners.data?.items ?? [])
  const partnerState =
    partners.loading && !partners.data ? (
      <Loading />
    ) : partners.error ? (
      <ErrorView message={partners.error} onRetry={partners.reload} />
    ) : partnerRows.length === 0 ? (
      <Empty title="협약이 없어요." />
    ) : null

  const form = (
    <CartCouponForm
      onCreated={(name) => {
        setNotice(`'${name}' 장바구니 쿠폰을 등록했어요.`)
        setPage(1)
        coupons.reload()
      }}
    />
  )

  const partnerFilter = desktop ? (
    <Segment label="협약 상태" items={PARTNER_TABS} value={partnerTab} onChange={setPartnerTab} />
  ) : (
    <div className={s.selectPad}>
      <select
        className={c.select}
        aria-label="협약 상태"
        value={partnerTab}
        onChange={(e) => setPartnerTab(e.target.value as PartnerTab)}
      >
        {PARTNER_TABS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <ConsoleShell variant="admin" active="coupons" title="쿠폰 · 협약">
      <div className={s.page}>
        <Notice>{notice}</Notice>
        {desktop ? (
          <div className={`${c.split} ${s.split380}`}>
            <div>
              <div className={c.toolbar}>
                <Segment label="보기" items={viewTabs} value={view} onChange={setView} />
                {view === 'coupons' ? (
                  <label className={c.search}>
                    <Icon name="search" size={16} />
                    <input
                      aria-label="쿠폰명"
                      placeholder="쿠폰명"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </label>
                ) : (
                  partnerFilter
                )}
              </div>
              {view === 'coupons' ? (
                <>
                  <div className={c.table} role="table" aria-label="쿠폰 목록">
                    <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: COUPON_COLS }}>
                      <span>쿠폰명</span>
                      <span>유형</span>
                      <span>발행</span>
                      <span>기간</span>
                      <span>사용</span>
                      <span>상태</span>
                      <span></span>
                    </div>
                    {couponState}
                    {couponRows.map((cp) => (
                      <div
                        key={cp.couponId}
                        role="row"
                        className={`${c.tr} ${c.clickable} ${c.num}`}
                        style={{ gridTemplateColumns: COUPON_COLS }}
                        onClick={() => setDetailId(cp.couponId)}
                      >
                        <span className={`${c.ellipsis} ${c.strong}`}>{cp.name}</span>
                        <span>
                          <Badge tone={cp.couponType === 'CART' ? 'dark' : 'neutral'}>
                            {cp.couponType === 'CART' ? '장바구니' : '상품'}
                          </Badge>
                        </span>
                        <span className={c.ellipsis}>{issuer(cp)}</span>
                        <span>{period(cp)}</span>
                        <span>{usage(cp)}</span>
                        <span>
                          <Badge tone={COUPON_TONE[cp.status]}>{couponStatusLabel(cp.status)}</Badge>
                        </span>
                        <span>{stopButton(cp)}</span>
                      </div>
                    ))}
                    {coupons.data && coupons.data.totalPages > 1 && (
                      <div className={c.tableFoot}>
                        <span>총 {coupons.data.totalElements}개</span>
                        <Pager page={page} totalPages={coupons.data.totalPages} onChange={setPage} />
                      </div>
                    )}
                  </div>
                  <p className={s.foot}>강제 중지할 때는 사유를 입력해야 해요. 행을 누르면 사용 내역을 볼 수 있어요.</p>
                </>
              ) : (
                <div className={c.table} role="table" aria-label="협약 목록">
                  <div role="row" className={`${c.tr} ${c.thead}`} style={{ gridTemplateColumns: PARTNER_COLS }}>
                    <span>판매자</span>
                    <span>인플루언서</span>
                    <span>상태</span>
                    <span>요청일</span>
                    <span>수락일</span>
                    <span>종료</span>
                  </div>
                  {partnerState}
                  {partnerRows.map((p) => (
                    <div
                      key={p.partnershipId}
                      role="row"
                      className={`${c.tr} ${c.num}`}
                      style={{ gridTemplateColumns: PARTNER_COLS }}
                    >
                      <span className={`${c.ellipsis} ${c.strong}`}>{pName(p)}</span>
                      <span className={c.ellipsis}>{iName(p)}</span>
                      <span>
                        <Badge tone={PARTNER_TONE[p.status]}>{PARTNERSHIP_STATUS_LABEL[p.status]}</Badge>
                      </span>
                      <span>{mmdd(p.requestedAt)}</span>
                      <span>{p.acceptedAt ? mmdd(p.acceptedAt) : '—'}</span>
                      <span>
                        {p.endedAt ? (
                          <>
                            {mmdd(p.endedAt)}
                            {p.endedBy && <span className={c.sub}>{PARTNERSHIP_ENDED_BY_LABEL[p.endedBy]}</span>}
                          </>
                        ) : p.rejectedAt ? (
                          `${mmdd(p.rejectedAt)} 거절`
                        ) : (
                          '—'
                        )}
                      </span>
                    </div>
                  ))}
                  {partners.data && partners.data.totalPages > 1 && (
                    <div className={c.tableFoot}>
                      <span>총 {partners.data.totalElements}건</span>
                      <Pager page={partnerPage} totalPages={partners.data.totalPages} onChange={setPartnerPage} />
                    </div>
                  )}
                </div>
              )}
            </div>
            <section className={c.card}>{form}</section>
          </div>
        ) : (
          <>
            <Tabs label="보기" items={viewTabs} value={view} onChange={setView} />
            {view === 'coupons' ? (
              <>
                <section className={s.mobileSection}>{form}</section>
                <section className={s.mobileSection}>
                  <h2 className={s.blockTitle}>전체 쿠폰</h2>
                  {couponState}
                  <ul className={s.plainList}>
                    {couponRows.map((cp) => (
                      <li key={cp.couponId} className={s.clickRow} onClick={() => setDetailId(cp.couponId)}>
                        <span className={s.grow}>
                          <b className={c.ellipsis}>{cp.name}</b>
                          <span className={s.meta}>
                            {cp.couponType === 'CART' ? '장바구니' : `상품 · ${issuer(cp)}`} · {period(cp)} · 사용{' '}
                            {usage(cp)}
                          </span>
                        </span>
                        <Badge tone={COUPON_TONE[cp.status]}>{couponStatusLabel(cp.status)}</Badge>
                        {stopButton(cp)}
                      </li>
                    ))}
                  </ul>
                  {coupons.data && <Pager page={page} totalPages={coupons.data.totalPages} onChange={setPage} />}
                </section>
              </>
            ) : (
              <section className={s.mobileSection}>
                {partnerFilter}
                {partnerState}
                <ul className={s.plainList}>
                  {partnerRows.map((p) => (
                    <li key={p.partnershipId}>
                      <span className={s.grow}>
                        <b className={c.ellipsis}>
                          {pName(p)} · {iName(p)}
                        </b>
                        <span className={s.meta}>
                          {mmdd(p.requestedAt)} 요청
                          {p.acceptedAt && ` · ${mmdd(p.acceptedAt)} 수락`}
                          {p.endedAt && ` · ${mmdd(p.endedAt)} 종료`}
                        </span>
                      </span>
                      <Badge tone={PARTNER_TONE[p.status]}>{PARTNERSHIP_STATUS_LABEL[p.status]}</Badge>
                    </li>
                  ))}
                </ul>
                {partners.data && (
                  <Pager page={partnerPage} totalPages={partners.data.totalPages} onChange={setPartnerPage} />
                )}
              </section>
            )}
          </>
        )}
      </div>

      {stopTarget && (
        <ReasonModal
          title={`'${stopTarget.name}' 쿠폰을 중지할까요?`}
          label="중지 사유"
          placeholder="예: 부정 사용이 확인되어 중지해요."
          help="중지하면 다시 켤 수 없어요. 이미 주문에 예약된 쿠폰은 그대로 결제·취소를 따라가요."
          confirmLabel="강제 중지"
          danger
          onConfirm={confirmStop}
          onClose={() => setStopTarget(null)}
        />
      )}

      {detailId !== null && <CouponDrawer couponId={detailId} issuer={issuer} onClose={() => setDetailId(null)} />}
    </ConsoleShell>
  )
}

/** 쿠폰 상세: 할인 내용 · 중지 정보 · 사용 내역 */
function CouponDrawer({
  couponId,
  issuer,
  onClose,
}: {
  couponId: number
  issuer: (cp: AdminCouponSummary) => string
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const detail = useApi(() => getAdminCoupon(couponId, { page: toPageParam(page), size: 10 }), [couponId, page])
  const d = detail.data
  return (
    <Drawer title={d?.name ?? '쿠폰 상세'} onClose={onClose}>
      {detail.loading && !d ? (
        <Loading />
      ) : detail.error ? (
        <ErrorView message={detail.error} onRetry={detail.reload} />
      ) : d ? (
        <>
          <section className={s.dSection}>
            <div className={s.cardHead}>
              <b>{d.couponType === 'CART' ? '장바구니 쿠폰' : '상품 쿠폰'}</b>
              <Badge tone={COUPON_TONE[d.status]}>{couponStatusLabel(d.status)}</Badge>
            </div>
            <dl className={s.dl}>
              <Row label="발행">{issuer(d)}</Row>
              <Row label="기간">
                {ymdhm(d.validFrom)} ~ {lastDay(d.validUntil)}
              </Row>
              <Row label="사용">
                {d.usedCount.toLocaleString('ko-KR')}
                {d.quantityLimited ? ` / ${(d.totalQuantity ?? 0).toLocaleString('ko-KR')}` : ' (수량 제한 없음)'}
              </Row>
              {d.quantityLimited && <Row label="남은 수량">{(d.remainingQuantity ?? 0).toLocaleString('ko-KR')}</Row>}
              <Row label="할인한 금액">{won(d.usedDiscountAmount)}</Row>
              {d.productCoupon && (
                <>
                  <Row label="쿠폰 코드">{d.productCoupon.code}</Row>
                  <Row label="할인">
                    {DISCOUNT_TYPE_LABEL[d.productCoupon.discountType]}{' '}
                    {d.productCoupon.discountType === 'RATE'
                      ? `${d.productCoupon.discountValue}% (최대 ${won(d.productCoupon.maxDiscountAmount)})`
                      : won(d.productCoupon.discountValue)}
                  </Row>
                  <Row label="상품">#{d.productCoupon.productId}</Row>
                </>
              )}
              {d.stoppedAt && (
                <>
                  <Row label="중지">
                    {ymdhm(d.stoppedAt)} · {d.stoppedBy ? COUPON_STOPPED_BY_LABEL[d.stoppedBy] : ''}
                  </Row>
                  {d.stopReason && <Row label="중지 사유">{d.stopReason}</Row>}
                </>
              )}
            </dl>
          </section>
          {d.tiers.length > 0 && (
            <section className={s.dSection}>
              <h3 className={s.dTitle}>할인 구간</h3>
              <ul className={s.plainList}>
                {d.tiers.map((t) => (
                  <li key={t.minOrderAmount}>
                    <span>{won(t.minOrderAmount)} 이상</span>
                    <b>{won(t.discountAmount)} 할인</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className={s.dSection}>
            <h3 className={s.dTitle}>사용 내역 {d.usages.totalElements}</h3>
            {d.usages.items.length === 0 ? (
              <p className={s.meta}>아직 사용 내역이 없어요.</p>
            ) : (
              <ul className={s.plainList}>
                {d.usages.items.map((u) => (
                  <li key={u.usageId}>
                    <span>
                      주문 #{u.orderId} · 회원 #{u.memberId}
                      <span className={s.meta}>
                        {COUPON_USAGE_STATUS_LABEL[u.status]} · {ymdhm(u.usedAt ?? u.releasedAt ?? u.reservedAt)}
                      </span>
                    </span>
                    <b>−{won(u.discountAmount)}</b>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={page} totalPages={d.usages.totalPages} onChange={setPage} />
          </section>
        </>
      ) : null}
    </Drawer>
  )
}
