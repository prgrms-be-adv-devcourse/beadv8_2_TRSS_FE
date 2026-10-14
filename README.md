# 팔레트 웹 (React + Vite)

팔레트 디자인 캔버스의 28개 화면을 React 19 + TypeScript + CSS Modules + React Router로 옮긴 프로젝트예요.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 검사 후 dist/ 에 빌드
```

`/screens` 로 가면 모든 화면 바로가기가 있어요.

## 폴더 구조

```
src/
  main.tsx              앱 진입점 (BrowserRouter)
  App.tsx               라우트 등록
  routes.tsx            화면 ↔ URL 목록
  styles/global.css     폰트, 색 토큰(:root), 공통 태그 스타일
  lib/ui.ts             makeCx(CSS Module 클래스 매핑), css(문자열 → style 객체), won(금액 표기)
  lib/products.ts       상품 이미지 매핑
  components/
    BuyerHeader.tsx     구매자 헤더 (compact = 상품 목록용 간단 헤더)
    ConsoleLayout.tsx   관리자·판매자 공통 레이아웃 (헤더 + 사이드바)
    AdminLayout.tsx     관리자 메뉴
    SellerLayout.tsx    판매자 센터 메뉴
  pages/
    *.tsx               화면 하나 = 파일 하나
    *.module.css        화면별 스타일
public/
  images/               로고, 상품 이미지
  fonts/                Pretendard Bold (제목용)
tools/                  디자인 → React 변환 스크립트 (아래 참고)
```

## 화면과 URL

| 구분 | 화면 | URL |
| --- | --- | --- |
| 구매자 | 상품 목록 | `/` |
| | 상품 상세 | `/product` |
| | 장바구니 | `/cart` |
| | 주문서 | `/checkout` |
| | 결제 팝업 모음 | `/checkout/popups` |
| | 주문 내역 / 상세 | `/orders`, `/orders/detail` |
| | 주문·결제 안내 모달 모음 | `/orders/errors` |
| | 예치금 / 충전 결과 | `/wallet`, `/wallet/topup-result` |
| | 로그인 / 회원가입 / 마이페이지 | `/login`, `/signup`, `/mypage` |
| 판매자 | 판매자 신청 | `/seller/apply` |
| | 상품 관리 / 등록 / 재고 | `/seller/products`, `/seller/products/new`, `/seller/stock` |
| | 주문 항목 / 정산 / 판매자 정보 | `/seller/orders`, `/seller/settlements`, `/seller/info` |
| 관리자 | 판매자 심사 / 회원 / 상품과 카테고리 | `/admin/sellers`, `/admin/members`, `/admin/products` |
| | 반품 심사 / 결제 조회 / 실패 거래 | `/admin/returns`, `/admin/payments`, `/admin/failed` |
| | 월 정산 / 재실행 모달 | `/admin/settlements`, `/admin/settlements/retry-modal` |

## 화면 상태 바꿔 보기

디자인 캔버스의 속성 패널에서 바꾸던 상태는 컴포넌트 props가 됐고, URL 쿼리로도 바꿀 수 있어요.

- `/checkout?balance=충분` · `/checkout?popup=결제 완료`
- `/orders/detail?status=구매 확정`
- `/mypage?sellerStatus=APPROVED`
- `/wallet/topup-result?result=실패`
- `/admin/settlements?retryModal=보임`

## 동작하는 부분

- 상품 목록: 카테고리 필터, 품절 숨기기, 정렬
- 장바구니: 선택, 전체 선택, 수량 조절, 합계와 예치금 부족 안내
- 주문서: 결제 요청 → 진행 중 → 완료 팝업 (진행 중은 1.8초 뒤 완료로 바뀌는 데모예요)
- 상품 상세 수량, 주문 내역 필터, 예치금 충전 금액·탭, 재고 조정 수량
- 판매 중지 요청 패널, 반품 요청 패널, 정산 다시 실행 모달 (사유를 입력해야 버튼이 켜져요)

데이터는 모두 화면 안의 예시 데이터예요. API를 붙일 때는 각 페이지의 `use…View` 훅 안의 상수를 API 응답으로 바꾸면 돼요.

## 디자인을 다시 가져올 때

디자인 캔버스에서 화면을 수정했다면, 캔버스의 `project/*.dc.html` 파일을 한 폴더에 받아서 다시 변환할 수 있어요.

```bash
tools/regen.sh <dc.html 폴더 경로>
```

- 화면 마크업과 스타일은 `src/pages/` 에 새로 만들어져요. 이 파일을 직접 고쳤다면 다시 변환할 때 덮어써지니 주의해요.
- 화면 상태 로직은 `tools/logic/<화면>.tsx` 에 있고, 변환할 때 페이지 안의 `use…View` 훅으로 들어가요.
- Python 3 이 필요해요.

디자인 변환이 끝나고 코드로만 관리할 계획이면 `tools/` 폴더는 지워도 돼요.
