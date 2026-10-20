import { createContext, useContext } from 'react'
import type { MySeller } from './api/member'

/**
 * 판매자 센터에서 함께 쓰는 내 판매자 정보.
 * RequireActiveSeller가 진입 때 조회한 값을 내려 주고, 헤더·사이드바(SellerLayout)가 상호를 읽는다.
 * 판매자 정보를 수정하면 setSeller로 바꿔 화면 전체에 바로 반영한다.
 */
export type ActiveSeller = {
  seller: MySeller | null
  setSeller: (seller: MySeller) => void
}

export const ActiveSellerContext = createContext<ActiveSeller>({ seller: null, setSeller: () => {} })

export const useActiveSeller = () => useContext(ActiveSellerContext)
