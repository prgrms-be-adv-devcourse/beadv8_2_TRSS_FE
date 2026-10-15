/**
 * 회원·판매자 API (백엔드 담당: 시연)
 *
 * 로그인·로그아웃·토큰 재발급은 lib/auth.ts에 있어요.
 * POST   /api/v1/auth/email/check | email/code | email/verify | signup
 * GET    /api/v1/users/me
 * POST   /api/v1/sellers           판매자 신청
 * GET    /api/v1/sellers/me        내 판매자 신청 상태
 * PATCH  /api/v1/seller/me         판매자 정보 수정 (SELLER)
 * POST   /api/v1/seller/me/withdrawal  판매자 철회 요청 (SELLER)
 * GET    /api/v1/admin/sellers (PageResponse) | /{sellerId}
 * POST   /api/v1/admin/sellers/{sellerId}/approve | reject | withdrawal/approve | withdrawal/reject | sanction
 * GET    /api/v1/admin/users (PageResponse) | /{userId}
 */

export {}
