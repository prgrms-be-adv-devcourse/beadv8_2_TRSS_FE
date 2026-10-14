/** 상품 이름에 들어 있는 키워드로 상품 이미지를 찾아요. */
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

export type ProductKind = 'b' | 'j' | 's'
export const kindOf = (k: ProductKind | string) => ({ bottle: k === 'b', jar: k === 'j', shirt: k === 's' })
