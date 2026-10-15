/**
 * 상품·카테고리 이미지
 *
 * productImage: 아직 API를 붙이지 않은 화면(장바구니·주문서)의 예시 데이터용이에요. 상품 이름 키워드로 예시 사진을 찾아요.
 * categoryIcon: 카테고리 아이콘이자, API 상품의 thumbnailUrl이 없을 때(이미지 기능 전) 쓰는 대체 이미지예요.
 */

/** 상품 이름 키워드 → 이미지. 앞에서부터 찾으니 더 구체적인 키워드를 위에 둬요. */
const IMAGES: Record<string, string> = {
  토너: '/images/toner.jpg',
  시카: '/images/cica-cream.jpg',
  클렌징폼: '/images/cleansing-foam.jpg',
  세럼: '/images/serum.jpg',
  선크림: '/images/sunscreen.jpg',
  세라마이드: '/images/ceramide-cream.jpg',
  마스크팩: '/images/mask-pack.jpg',
  쿠션: '/images/cushion.jpg',
  티셔츠: '/images/tshirt.jpg',
  윈드브레이커: '/images/windbreaker.jpg',
}

export function productImage(name: string): string {
  for (const key in IMAGES) {
    if (name.includes(key)) return IMAGES[key]
  }
  return ''
}

/**
 * 카테고리 이름 → 대표 아이콘 (public/images/category/*.svg).
 * 카테고리에는 이미지 필드가 없어서 프론트에서 정해요. 카테고리 선택 영역과,
 * 상품 사진이 없을 때 상품 카드의 대체 이미지로 같이 써요.
 */
const CATEGORY_ICONS: Record<string, string> = {
  // 대분류
  뷰티: 'beauty',
  의류: 'clothing',
  // 뷰티 소분류
  메이크업: 'makeup',
  바디케어: 'bodycare',
  선케어: 'suncare',
  마스크팩: 'maskpack',
  클렌징: 'cleansing',
  스킨케어: 'skincare',
  헤어케어: 'haircare',
  건강식품: 'health',
  // 의류 소분류
  상의: 'top',
  아우터: 'outer',
  바지: 'pants',
  '원피스/스커트': 'dress',
  신발: 'shoes',
  가방: 'bag',
  모자: 'cap',
  소품: 'goods',
}

/**
 * 카테고리 대표 아이콘 경로.
 * 목록에 없는 소분류(관리자가 새로 추가한 것 등)는 대분류 아이콘을 쓰고, 그것도 없으면 뷰티 아이콘이에요.
 */
export function categoryIcon(name: string, parentName?: string): string {
  const key = CATEGORY_ICONS[name] ?? (parentName && CATEGORY_ICONS[parentName]) ?? 'beauty'
  return `/images/category/${key}.svg`
}

export type ProductKind = 'b' | 'j' | 's'
export const kindOf = (k: ProductKind | string) => ({ bottle: k === 'b', jar: k === 'j', shirt: k === 's' })
