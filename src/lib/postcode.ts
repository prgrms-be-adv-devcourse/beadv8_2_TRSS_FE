/**
 * 다음(카카오) 우편번호 서비스
 * - API 키 없이 쓰는 무료 서비스예요. 스크립트를 처음 쓸 때 한 번만 불러와요.
 * - 문서: https://postcode.map.daum.net/guide
 */

const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

/** 검색 결과 중 화면에서 쓰는 값만 */
export type PostcodeResult = {
  /** 새 우편번호 5자리 */
  zonecode: string
  /** 도로명 주소 */
  roadAddress: string
  /** 지번 주소 */
  jibunAddress: string
  /** 사용자가 고른 주소 종류: R 도로명, J 지번 */
  userSelectedType: 'R' | 'J'
  /** 법정동·법정리 이름 */
  bname: string
  /** 건물명 */
  buildingName: string
  /** 공동주택 여부 Y/N */
  apartment: 'Y' | 'N'
}

type PostcodeInstance = { embed: (el: HTMLElement, options?: { autoClose?: boolean }) => void }
type PostcodeCtor = new (options: {
  oncomplete: (data: PostcodeResult) => void
  width?: string | number
  height?: string | number
  animation?: boolean
}) => PostcodeInstance

declare global {
  interface Window {
    daum?: { Postcode?: PostcodeCtor }
  }
}

let loading: Promise<PostcodeCtor> | null = null

/** 우편번호 스크립트를 불러와요. 실패하면 다음 호출 때 다시 시도해요. */
export function loadPostcode(): Promise<PostcodeCtor> {
  if (window.daum?.Postcode) return Promise.resolve(window.daum.Postcode)
  loading ??= new Promise<PostcodeCtor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.daum?.Postcode ? resolve(window.daum.Postcode) : reject(new Error('postcode')))
    script.onerror = () => {
      script.remove()
      reject(new Error('postcode'))
    }
    document.head.appendChild(script)
  }).catch((e) => {
    loading = null
    throw e
  })
  return loading
}

/**
 * 고른 결과를 배송지 기본 주소 한 줄로 만들어요.
 * 도로명 주소를 골랐으면 (법정동, 건물명)을 뒤에 붙여요. 예: 서울 강남구 테헤란로 123 (역삼동, 팔레트빌딩)
 */
export function formatPostcodeAddress(d: PostcodeResult) {
  if (d.userSelectedType === 'J') return d.jibunAddress || d.roadAddress
  const extra = [/[동로가]$/.test(d.bname) ? d.bname : '', d.apartment === 'Y' ? d.buildingName : '']
    .filter(Boolean)
    .join(', ')
  return extra ? `${d.roadAddress} (${extra})` : d.roadAddress
}
