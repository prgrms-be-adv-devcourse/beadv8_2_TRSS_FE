import { useEffect, useState } from 'react'
import ConsoleShell from '../../components/ui/ConsoleShell'
import { Badge, Empty, ErrorView, Loading, won } from '../../components/ui/Misc'
import { Sheet } from '../../components/ui/Overlay'
import Icon from '../../components/ui/Icon'
import c from '../../components/ui/console.module.css'
import { errorMessage, toPageParam } from '../../lib/api'
import {
  getAdminMember,
  getAdminMembers,
  MEMBER_TYPE_LABEL,
  type AdminMember,
  type AdminMemberDetail,
  type MemberStatus,
  type MemberType,
} from '../../lib/api/member'
import { useApi } from '../../lib/useApi'
import { useDebounced } from '../../lib/useDebounced'
import { useIsDesktop } from '../../lib/useMedia'
import { InfoRow, Notice, Pager, SELLER_STATUS, fmtDate } from './shared'
import s from './admin.module.css'

const PAGE_SIZE = 20
const COLS = { gridTemplateColumns: '1fr 1.6fr .9fr .9fr .9fr .7fr' }

const ORDER_STATUS_LABEL: Record<string, string> = {
  CREATED: '결제 대기',
  PAYMENT_FAILED: '결제 실패',
  PAID: '결제 완료',
  CONFIRMED: '구매 확정',
  CANCELED: '주문 취소',
  RETURN_REQUESTED: '반품 요청',
  RETURNED: '반품 완료',
}

const isDeleted = (m: { status: MemberStatus }) => m.status === 'DELETED'
const displayName = (m: AdminMember | AdminMemberDetail) => (isDeleted(m) ? '탈퇴한 회원' : m.name)

/** 검색·필터·페이지와 선택한 회원 상세 */
function useMembersView() {
  const [keyword, setKeyword] = useState('')
  const [memberType, setMemberType] = useState<MemberType | ''>('')
  const [status, setStatus] = useState<MemberStatus | ''>('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AdminMemberDetail | null>(null)
  const [detailError, setDetailError] = useState('')
  const email = useDebounced(keyword.trim())

  // 조건이 바뀌면 첫 페이지부터 다시 고른다
  useEffect(() => {
    setPage(1)
    setSelectedId(null)
  }, [email, memberType, status])

  const list = useApi(
    () =>
      getAdminMembers({
        email: email || undefined,
        memberType: memberType || undefined,
        status: status || undefined,
        page: toPageParam(page),
        size: PAGE_SIZE,
      }),
    [email, memberType, status, page],
  )

  useEffect(() => {
    setDetailError('')
    setDetail(null)
    if (selectedId === null) return
    let alive = true
    getAdminMember(selectedId)
      .then((d) => alive && setDetail(d))
      .catch((e) => alive && setDetailError(errorMessage(e)))
    return () => {
      alive = false
    }
  }, [selectedId])

  return {
    keyword,
    setKeyword,
    memberType,
    setMemberType,
    status,
    setStatus,
    page,
    changePage: (next: number) => {
      setPage(next)
      setSelectedId(null)
    },
    list,
    items: list.data?.items ?? [],
    total: list.data?.totalElements ?? 0,
    totalPages: list.data?.totalPages ?? 0,
    selectedId,
    setSelectedId,
    detail,
    detailError,
  }
}
type View = ReturnType<typeof useMembersView>

function TypeSelect({ v, className }: { v: View; className?: string }) {
  return (
    <select
      aria-label="회원 유형"
      className={className}
      value={v.memberType}
      onChange={(e) => v.setMemberType(e.target.value as MemberType | '')}
    >
      <option value="">모든 회원 유형</option>
      <option value="USER">일반 회원</option>
      <option value="SELLER">판매자</option>
      <option value="ADMIN">관리자</option>
    </select>
  )
}

function StatusSelect({ v, className }: { v: View; className?: string }) {
  return (
    <select
      aria-label="상태"
      className={className}
      value={v.status}
      onChange={(e) => v.setStatus(e.target.value as MemberStatus | '')}
    >
      <option value="">모든 상태</option>
      <option value="ACTIVE">활성</option>
      <option value="DELETED">탈퇴</option>
    </select>
  )
}

function StateBadge({ status }: { status: MemberStatus }) {
  return status === 'DELETED' ? <Badge>탈퇴</Badge> : <Badge tone="green">활성</Badge>
}

/** 회원 상세 (PC 오른쪽 패널 · 모바일 시트 공통 본문) */
function MemberDetail({ d }: { d: AdminMemberDetail }) {
  const deleted = isDeleted(d)
  return (
    <>
      <InfoRow label="이메일">{deleted ? '-' : d.email}</InfoRow>
      <InfoRow label="회원 유형">{MEMBER_TYPE_LABEL[d.memberType]}</InfoRow>
      <InfoRow label="판매자 상태">{d.sellerStatus ? SELLER_STATUS[d.sellerStatus][0] : '-'}</InfoRow>
      <InfoRow label="가입일">{fmtDate(d.createdAt)}</InfoRow>
      <InfoRow label="예치금">{won(d.wallet.balance)}</InfoRow>
      <InfoRow label="구매 확정 대기">{won(d.wallet.heldAmount)}</InfoRow>
      <div className={s.panelSection}>
        <p className={s.panelSub}>최근 주문</p>
        {d.recentOrders.length === 0 && <p className={s.panelNote}>최근 주문이 없어요.</p>}
        {d.recentOrders.map((o) => (
          <InfoRow key={o.orderId} label={`#${o.orderId}`}>
            {won(o.totalAmount)} · {ORDER_STATUS_LABEL[o.status] ?? o.status}
          </InfoRow>
        ))}
      </div>
      <p className={s.panelNote}>회원 정보는 조회만 할 수 있어요.</p>
    </>
  )
}

function DesktopMembers({ v }: { v: View }) {
  const d = v.detail
  const { list } = v
  return (
    <>
      <div className={c.toolbar}>
        <div className={c.toolGroup}>
          <label className={c.search}>
            <Icon name="search" size={16} />
            <input
              aria-label="이메일로 검색"
              placeholder="이메일로 검색"
              value={v.keyword}
              onChange={(e) => v.setKeyword(e.target.value)}
            />
          </label>
          <TypeSelect v={v} className={c.select} />
          <StatusSelect v={v} className={c.select} />
        </div>
        {list.data && <span className={s.total}>총 {v.total.toLocaleString('ko-KR')}명</span>}
      </div>
      <div className={v.selectedId !== null ? s.split : undefined}>
        <div>
          <div role="table" className={`${c.table} ${list.loading && list.data ? s.busy : ''}`}>
            <div role="row" className={`${c.tr} ${c.thead}`} style={COLS}>
              <span>이름</span>
              <span>이메일</span>
              <span>회원 유형</span>
              <span>판매자</span>
              <span>가입일</span>
              <span>상태</span>
            </div>
            {list.loading && !list.data && <Loading />}
            {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
            {list.data && v.items.length === 0 && <div className={s.tableEmpty}>조건에 맞는 회원이 없어요.</div>}
            {v.items.map((m) => (
              <div
                role="row"
                key={m.memberId}
                tabIndex={0}
                aria-selected={v.selectedId === m.memberId}
                className={`${c.tr} ${c.clickable} ${v.selectedId === m.memberId ? c.selected : ''}`}
                style={COLS}
                onClick={() => v.setSelectedId(m.memberId)}
                onKeyDown={(e) => e.key === 'Enter' && v.setSelectedId(m.memberId)}
              >
                <span className={`${c.ellipsis} ${c.strong}`}>{displayName(m)}</span>
                <span className={c.ellipsis}>{isDeleted(m) ? '-' : m.email}</span>
                <span>{MEMBER_TYPE_LABEL[m.memberType]}</span>
                <span>
                  {m.sellerStatus ? (
                    <Badge tone={SELLER_STATUS[m.sellerStatus][1]}>{SELLER_STATUS[m.sellerStatus][0]}</Badge>
                  ) : (
                    '—'
                  )}
                </span>
                <span className={c.num}>{fmtDate(m.createdAt)}</span>
                <span>
                  <StateBadge status={m.status} />
                </span>
              </div>
            ))}
          </div>
          <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
        </div>
        {v.selectedId !== null && (
          <section className={s.panel} aria-label="회원 상세">
            {v.detailError && <Notice tone="error">{v.detailError}</Notice>}
            {!d && !v.detailError && <Loading />}
            {d && (
              <>
                <h2 className={s.panelTitle}>{displayName(d)}</h2>
                <MemberDetail d={d} />
              </>
            )}
            <div className={`${s.btnRow} ${s.btnRowEnd}`}>
              <button type="button" className={s.linkBtn} onClick={() => v.setSelectedId(null)}>
                닫기
              </button>
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function MobileMembers({ v }: { v: View }) {
  const { list } = v
  const d = v.detail
  return (
    <div className={s.mBody}>
      <div className={s.mBar}>
        <label className={`${c.mobileSearch} ${s.flush}`}>
          <Icon name="search" size={18} />
          <input
            type="search"
            aria-label="이메일로 회원 검색"
            placeholder="이메일"
            value={v.keyword}
            onChange={(e) => v.setKeyword(e.target.value)}
          />
        </label>
        <div className={s.mSelects}>
          <TypeSelect v={v} />
          <StatusSelect v={v} />
        </div>
      </div>
      {list.loading && !list.data && <Loading />}
      {list.error && <ErrorView message={list.error} onRetry={list.reload} />}
      {list.data && v.items.length === 0 && <Empty title="조건에 맞는 회원이 없어요" />}
      <ul className={s.mList}>
        {v.items.map((m) => (
          <li key={m.memberId}>
            <button type="button" className={s.mItem} onClick={() => v.setSelectedId(m.memberId)}>
              <span aria-hidden="true" className={s.avatar}>
                {isDeleted(m) ? '-' : m.name.slice(0, 1)}
              </span>
              <span className={s.mItemBody}>
                <span className={s.mItemTitle}>
                  <span>{displayName(m)}</span>
                  {m.memberType !== 'USER' && (
                    <Badge tone={m.memberType === 'ADMIN' ? 'dark' : 'green'}>{MEMBER_TYPE_LABEL[m.memberType]}</Badge>
                  )}
                </span>
                <span className={s.mItemMeta}>
                  {isDeleted(m) ? '-' : m.email} · 가입 {fmtDate(m.createdAt)}
                </span>
              </span>
              <StateBadge status={m.status} />
            </button>
          </li>
        ))}
      </ul>
      <Pager page={v.page} totalPages={v.totalPages} onChange={v.changePage} />
      {v.selectedId !== null && (
        <Sheet title={d ? displayName(d) : '회원 정보'} onClose={() => v.setSelectedId(null)}>
          {v.detailError && <Notice tone="error">{v.detailError}</Notice>}
          {!d && !v.detailError && <Loading />}
          {d && <MemberDetail d={d} />}
        </Sheet>
      )}
    </div>
  )
}

/** 관리자 · 회원 (조회 전용) */
export default function AdminMembers() {
  const desktop = useIsDesktop()
  const v = useMembersView()
  return (
    <ConsoleShell variant="admin" active="members" title="회원">
      {desktop ? <DesktopMembers v={v} /> : <MobileMembers v={v} />}
    </ConsoleShell>
  )
}
