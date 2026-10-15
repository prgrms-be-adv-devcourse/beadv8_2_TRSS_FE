/**
 * 예치금·충전 API (충전 백엔드 담당: 시연)
 *
 * GET    /api/v1/wallet                    예치금 잔액
 * POST   /api/v1/topups                    충전 요청 (토스 결제창 열기 전)
 * POST   /api/v1/topups/confirm            충전 승인 (토스 successUrl에서)
 * POST   /api/v1/topups/{topupId}/fail     충전 실패 처리 (토스 failUrl에서)
 * GET    /api/v1/topups                    충전 내역 (PageResponse)
 * GET    /api/v1/topups/{topupId}          충전 상세
 */

export {}
