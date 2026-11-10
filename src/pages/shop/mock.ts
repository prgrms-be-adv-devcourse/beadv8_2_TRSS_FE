/**
 * 백엔드(ai-service·알림)에 아직 없는 API 자리를 채우는 목업 데이터예요.
 * 화면은 이 값으로만 그려지고, 저장 버튼 등은 화면 안 상태만 바꿔요.
 */

// TODO(API 미구현): GET /ai/survey/me — 내 뷰티 프로필(설문 답변) 조회. 지금은 아래 고정값
export type BeautyProfile = {
  type: string[]
  concern: string[]
  like: string[]
  avoid: string[]
  cat: string[]
  updatedAt: string
}
export const MOCK_PROFILE: BeautyProfile = {
  type: ['지성'],
  concern: ['트러블', '모공'],
  like: ['나이아신아마이드', '시카(병풀)'],
  avoid: ['인공 향료', '알코올(에탄올)'],
  cat: ['스킨케어', '선케어'],
  updatedAt: '11.10',
}

export type SurveyKey = 'type' | 'concern' | 'like' | 'avoid' | 'cat'
export type SurveyQuestion = {
  key: SurveyKey
  label: string
  title: string
  help: string
  /** 1이면 하나만, 0이면 제한 없음 */
  max: number
  opts: string[]
}
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'type',
    label: '피부 타입',
    title: '피부 타입이\n어떻게 되세요?',
    help: '세안 후 아무것도 바르지 않았을 때를 떠올려 보세요.',
    max: 1,
    opts: ['건성', '중성', '지성', '복합성', '잘 모르겠어요'],
  },
  {
    key: 'concern',
    label: '피부 고민',
    title: '요즘 가장 신경 쓰이는\n피부 고민은요?',
    help: '최대 3개까지 고를 수 있어요.',
    max: 3,
    opts: ['트러블', '모공', '각질', '건조함', '민감 · 홍조', '칙칙함', '주름 · 탄력', '색소침착', '유분'],
  },
  {
    key: 'like',
    label: '선호 성분',
    title: '좋아하거나 찾고 있는\n성분이 있나요?',
    help: '여러 개 골라도 돼요. 잘 모르면 넘어가도 괜찮아요.',
    max: 0,
    opts: ['나이아신아마이드', '시카(병풀)', '비타민C', '히알루론산', '세라마이드', '레티놀', '판테놀', '티트리', '펩타이드', 'AHA · BHA'],
  },
  {
    key: 'avoid',
    label: '피하고 싶은 성분',
    title: '피하고 싶은 성분이\n있나요?',
    help: '여러 개 골라도 돼요.',
    max: 0,
    opts: ['인공 향료', '알코올(에탄올)', '파라벤', '에센셜 오일', '실리콘', '미네랄 오일', '없어요'],
  },
  {
    key: 'cat',
    label: '관심 카테고리',
    title: '어떤 상품을 주로\n찾으세요?',
    help: '홈 추천 순서에 반영돼요.',
    max: 0,
    opts: ['스킨케어', '선케어', '메이크업', '클렌징', '마스크팩'],
  },
]

// TODO(API 미구현): AI 크리에이터 추천 — 피부가 비슷한 크리에이터 목록
export const MOCK_CREATORS = [
  { initial: 'A', name: '[크리에이터 A]', short: '지성 · 트러블', match: '지성 · 트러블 · 모공 일치', picks: 12, bg: '#e9e6e1' },
  { initial: 'B', name: '[크리에이터 B]', short: '지성 · 모공', match: '지성 · 나이아신아마이드 선호', picks: 8, bg: '#e4e8e3' },
  { initial: 'C', name: '[크리에이터 C]', short: '트러블', match: '복합성 · 트러블 일치', picks: 5, bg: '#e6e4ec' },
  { initial: 'D', name: '[크리에이터 D]', short: '무향료', match: '향료 없는 제품 위주', picks: 4, bg: '#ece6e1' },
]

/** 추천 이유 문구 (목업). 상품 순서대로 돌려 써요. */
export const MOCK_WHY = [
  '시카 포함 · 트러블 피부 추천',
  '무향료 · 지성 피부 산뜻한 마무리',
  '나이아신아마이드 포함 · 모공 고민',
  '[크리에이터 A]의 pick · 지성 피부',
]
/** 추천 성분 필터 (목업) */
export const MOCK_REC_FILTERS = ['전체', '나이아신아마이드', '시카', '무향료', '선케어']

// TODO(API 미구현): GET /notifications, PATCH /notifications/{id}/read — 알림 목록·읽음 처리
export type NotiKind = 'pay' | 'ship' | 'done'
export type Noti = {
  id: number
  kind: NotiKind
  group: string
  time: string
  title: string
  body: string
  img: string
  unread: boolean
  to: string
}
export const MOCK_NOTIFICATIONS: Noti[] = [
  { id: 1, kind: 'ship', group: '오늘', time: '09:12', title: '주문하신 상품의 배송이 시작됐어요', body: '라이트 윈드브레이커 외 2개 · [택배사]', img: '/images/windbreaker.jpg', unread: true, to: '/orders' },
  { id: 2, kind: 'done', group: '오늘', time: '08:40', title: '상품이 도착했어요. 구매를 확정해 주세요', body: '저자극 데일리 선크림', img: '/images/sunscreen.jpg', unread: true, to: '/orders' },
  { id: 3, kind: 'pay', group: '11.07', time: '14:22', title: '112,800원 결제를 완료했어요', body: '라이트 윈드브레이커 외 2개 · 예치금 결제', img: '/images/windbreaker.jpg', unread: false, to: '/orders' },
  { id: 4, kind: 'done', group: '11.05', time: '17:03', title: '상품이 도착했어요. 구매를 확정해 주세요', body: '글로우 커버 쿠션', img: '/images/cushion.jpg', unread: false, to: '/orders' },
  { id: 5, kind: 'ship', group: '11.04', time: '10:15', title: '주문하신 상품의 배송이 시작됐어요', body: '글로우 커버 쿠션 · [택배사]', img: '/images/cushion.jpg', unread: false, to: '/orders' },
  { id: 6, kind: 'pay', group: '11.03', time: '21:47', title: '24,000원 결제를 완료했어요', body: '글로우 커버 쿠션 · 예치금 결제', img: '/images/cushion.jpg', unread: false, to: '/orders' },
]
