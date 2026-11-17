import { useState } from 'react'
import type { Me } from '../../lib/auth'
import a from './ProfileAvatar.module.css'

/**
 * 동그란 프로필 칸. 카카오 프로필 이미지가 있으면 이미지를, 없거나 불러오지 못하면 이름 첫 글자를 보여 준다.
 * 크기·색은 className(각 화면의 .avatar)이 정한다.
 */
export default function ProfileAvatar({ me, className }: { me: Me | null; className?: string }) {
  const src = me?.profileImageUrl || null
  // 실패한 주소를 기억해 두면, 주소가 바뀌었을 때(재연결 등) 자동으로 다시 시도한다
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && src !== failedSrc
  return (
    <span aria-hidden="true" className={[className, a.wrap].filter(Boolean).join(' ')}>
      {showImage ? (
        <img src={src} alt="" className={a.img} referrerPolicy="no-referrer" onError={() => setFailedSrc(src)} />
      ) : (
        (me?.name?.slice(0, 1) ?? 'P')
      )}
    </span>
  )
}
