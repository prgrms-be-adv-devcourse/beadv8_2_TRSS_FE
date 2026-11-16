/**
 * 뷰티 설문 문항. 보기 값은 ai-service 코드(lib/api/ai.ts)예요.
 */
import {
  AVOIDED_INGREDIENTS,
  BEAUTY_CATEGORIES,
  BEAUTY_CATEGORY_LABEL,
  INGREDIENT_LABEL,
  MAX_CONCERNS,
  PREFERRED_INGREDIENTS,
  SKIN_CONCERNS,
  SKIN_CONCERN_LABEL,
  SKIN_TYPES,
  SKIN_TYPE_LABEL,
  type BeautyProfile,
  type SurveySaveRequest,
} from '../../lib/api/ai'

export type SurveyKey = 'type' | 'concern' | 'like' | 'avoid' | 'cat'
export type SurveyAnswers = Record<SurveyKey, string[]>

/** "없어요" 보기 (피하는 성분). 저장할 때는 빈 배열로 보내요 */
export const NONE = 'NONE'

export type SurveyQuestion = {
  key: SurveyKey
  label: string
  title: string
  help: string
  /** 1이면 하나만, 0이면 제한 없음 */
  max: number
  /** 꼭 골라야 넘어갈 수 있는지 */
  required?: boolean
  opts: Array<{ value: string; label: string }>
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'type',
    label: '피부 타입',
    title: '피부 타입이\n어떻게 되세요?',
    help: '세안 후 아무것도 바르지 않았을 때를 떠올려 보세요.',
    max: 1,
    required: true,
    opts: SKIN_TYPES.map((v) => ({ value: v, label: SKIN_TYPE_LABEL[v] })),
  },
  {
    key: 'concern',
    label: '피부 고민',
    title: '요즘 가장 신경 쓰이는\n피부 고민은요?',
    help: `최대 ${MAX_CONCERNS}개까지 고를 수 있어요.`,
    max: MAX_CONCERNS,
    opts: SKIN_CONCERNS.map((v) => ({ value: v, label: SKIN_CONCERN_LABEL[v] })),
  },
  {
    key: 'like',
    label: '선호 성분',
    title: '좋아하거나 찾고 있는\n성분이 있나요?',
    help: '여러 개 골라도 돼요. 잘 모르면 넘어가도 괜찮아요.',
    max: 0,
    opts: PREFERRED_INGREDIENTS.map((v) => ({ value: v, label: INGREDIENT_LABEL[v] })),
  },
  {
    key: 'avoid',
    label: '피하고 싶은 성분',
    title: '피하고 싶은 성분이\n있나요?',
    help: '여러 개 골라도 돼요.',
    max: 0,
    opts: [
      ...AVOIDED_INGREDIENTS.map((v) => ({ value: v, label: INGREDIENT_LABEL[v] })),
      { value: NONE, label: '없어요' },
    ],
  },
  {
    key: 'cat',
    label: '관심 카테고리',
    title: '어떤 상품을 주로\n찾으세요?',
    help: '추천 순서에 반영돼요.',
    max: 0,
    opts: BEAUTY_CATEGORIES.map((v) => ({ value: v, label: BEAUTY_CATEGORY_LABEL[v] })),
  },
]

export const EMPTY_ANSWERS: SurveyAnswers = { type: [], concern: [], like: [], avoid: [], cat: [] }

/** 저장된 프로필 → 설문 답 (수정할 때 채워 넣기) */
export function answersOf(p: BeautyProfile): SurveyAnswers {
  return {
    type: [p.skinType],
    concern: [...p.concerns],
    like: [...p.preferredIngredients],
    avoid: p.avoidedIngredients.length ? [...p.avoidedIngredients] : [NONE],
    cat: [...p.interestCategories],
  }
}

/** 설문 답 → 저장 요청 */
export function requestOf(a: SurveyAnswers): SurveySaveRequest {
  return {
    skinType: a.type[0] as SurveySaveRequest['skinType'],
    concerns: a.concern as SurveySaveRequest['concerns'],
    preferredIngredients: a.like as SurveySaveRequest['preferredIngredients'],
    avoidedIngredients: a.avoid.filter((v) => v !== NONE) as SurveySaveRequest['avoidedIngredients'],
    interestCategories: a.cat as SurveySaveRequest['interestCategories'],
  }
}
