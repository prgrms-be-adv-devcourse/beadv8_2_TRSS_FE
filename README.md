# 팔레트 웹 (React + Vite)

팔레트 디자인 캔버스의 28개 화면을 React 19 + TypeScript + CSS Modules + React Router로 옮긴 프로젝트예요.

## 시작하기

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 타입 검사 후 dist/ 에 빌드
```

`/screens` 로 가면 모든 화면 바로가기가 있어요.

### 백엔드와 같이 띄우기

- 백엔드(`beadv8_2_TRSS_BE`)를 `localhost:8080`에 먼저 띄워요. 개발 서버가 `/api` 요청을 그쪽으로 넘겨줘서 CORS·쿠키 설정은 따로 필요 없어요.
- 배포할 때는 `.env.example`을 참고해 `.env`에 `VITE_API_URL`을 넣어요.
- 로그인이 필요한 화면은 로그인하지 않으면 `/login`으로, 권한이 없으면 `/`로 이동해요. 아래 [화면과 URL](#화면과-url)의 권한 열을 참고해요.
- 판매자 승인 직후에는 토큰의 역할이 아직 `USER`예요. 다시 로그인해야 판매자 화면에 들어가요.
- 파일을 옮기거나 이름을 바꾼 뒤 화면이 하얗게 나오면 개발 서버를 껐다 켜요.

## 폴더 구조

```
src/
  main.tsx              앱 진입점 (BrowserRouter)
  App.tsx               라우트 등록
  routes.tsx            화면 ↔ URL 목록
  styles/global.css     폰트, 색 토큰(:root), 공통 태그 스타일
  lib/
    api/
      client.ts         백엔드 호출 공통 함수 api(), ApiError, errorMessage(), 토큰 재발급
      types.ts          공통 응답 타입 (PageResponse 등)
      <도메인>.ts        도메인별 API 함수와 응답 타입 (product, cart, order, payment, wallet, settlement, member)
      index.ts          client·types 다시 내보내기
    auth.ts             로그인 상태 (useAuth, login, logout)
    useApi.ts           화면 진입 시 API 호출 + 로딩·에러 상태 훅
    ui.ts               makeCx(CSS Module 클래스 매핑), css(문자열 → style 객체), won(금액 표기)
    products.ts         상품 이미지 매핑
  components/
    RequireRole.tsx     로그인·역할 가드 (routes.tsx의 auth 값으로 동작)
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

| 구분 | 화면 | URL | 권한 |
| --- | --- | --- | --- |
| 구매자 | 상품 목록 | `/` | 누구나 |
| | 상품 상세 | `/product/:productId` | 누구나 |
| | 장바구니 | `/cart` | 로그인 |
| | 주문서 | `/checkout` | 로그인 |
| | 결제 팝업 모음 | `/checkout/popups` | 로그인 |
| | 주문 내역 / 상세 | `/orders`, `/orders/:orderId` | 로그인 |
| | 주문·결제 안내 모달 모음 | `/orders/errors` | 로그인 |
| | 예치금 / 충전 결과 | `/wallet`, `/wallet/topup-result` | 로그인 |
| | 로그인 / 회원가입 | `/login`, `/signup` | 누구나 |
| | 마이페이지 | `/mypage` | 로그인 |
| 판매자 | 판매자 신청 | `/seller/apply` | 로그인 |
| | 상품 관리 / 등록 / 재고 | `/seller/products`, `/seller/products/new`, `/seller/stock` | SELLER |
| | 주문 항목 / 정산 / 판매자 정보 | `/seller/orders`, `/seller/settlements`, `/seller/info` | SELLER |
| 관리자 | 판매자 심사 / 회원 / 상품과 카테고리 | `/admin/sellers`, `/admin/members`, `/admin/products` | ADMIN |
| | 반품 심사 / 결제 조회 / 실패 거래 | `/admin/returns`, `/admin/payments`, `/admin/failed` | ADMIN |
| | 월 정산 / 재실행 모달 | `/admin/settlements`, `/admin/settlements/retry-modal` | ADMIN |

새 화면을 추가하거나 권한을 바꿀 때는 `src/routes.tsx`의 `auth` 값(`'login'` · `'SELLER'` · `'ADMIN'`, 없으면 누구나)만 고치면 돼요. 경로에 `:id`가 있으면 `/screens` 바로가기용 `demo` 주소도 같이 적어요.

## 화면 상태 바꿔 보기

디자인 캔버스의 속성 패널에서 바꾸던 상태는 컴포넌트 props가 됐고, URL 쿼리로도 바꿀 수 있어요.

- `/checkout?balance=충분` · `/checkout?popup=결제 완료`
- `/orders/1?status=구매 확정`
- `/mypage?sellerStatus=APPROVED`
- `/seller/info?withdrawPanel=보임`
- `/wallet/topup-result?result=실패`
- `/admin/settlements?retryModal=보임`

## 동작하는 부분

- 상품 목록: 카테고리 필터, 품절 숨기기, 정렬
- 장바구니: 선택, 전체 선택, 수량 조절, 합계와 예치금 부족 안내
- 주문서: 결제 요청 → 진행 중 → 완료 팝업 (진행 중은 1.8초 뒤 완료로 바뀌는 데모예요)
- 상품 상세 수량, 주문 내역 필터, 예치금 충전 금액·탭, 재고 조정 수량
- 판매 중지 요청 패널, 반품 요청 패널, 정산 다시 실행 모달 (사유를 입력해야 버튼이 켜져요)

## API 붙이는 방법

아직 API가 붙지 않은 화면은 화면 안의 예시 데이터를 보여줘요. 각 페이지의 `use…View` 훅 안의 상수를 API 응답으로 바꾸면 돼요. 마크업과 CSS는 되도록 건드리지 않아요.

1. `src/lib/api/<도메인>.ts`에 응답 타입과 호출 함수를 만들어요. 파일 맨 위 주석에 백엔드 엔드포인트 목록이 있어요.

   ```ts
   import { api, type PageQuery, type PageResponse } from '.'

   export type OrderSummary = { orderId: number; status: string; totalPrice: number }
   export const getOrders = (query: PageQuery = {}) =>
     api<PageResponse<OrderSummary>>('/api/v1/orders', { query })
   ```

2. 화면에 들어올 때 불러오는 API는 `useApi` 훅을 써요. 로딩·에러 상태와 다시 불러오기(`reload`)가 같이 와요.

   ```ts
   const { data, loading, error, reload } = useApi(() => getOrders({ page: toPageParam(page) }), [page])
   ```

3. 저장·삭제처럼 버튼으로 부르는 API는 직접 호출하고, 실패하면 `errorMessage(e)`로 백엔드가 준 문구를 보여준 뒤 필요하면 `reload()`를 불러요.
4. 상세 화면은 `useParams()`로 ID를 받아요. 예: `const { productId } = useParams()`

### 백엔드 응답 규칙

- 모든 응답은 `{ resultCode, msg, data }` 형태예요. `api()`가 `data`만 꺼내 주고, 실패하면 `ApiError`를 던져요.
- 목록 응답(`PageResponse`)은 `{ items, page, size, totalElements, totalPages }`예요. `content`가 아니라 `items`예요.
- 목록 요청의 `page`는 0부터 시작해요(화면의 1페이지 = `page=0`, `toPageParam()`으로 바꿔요). `size`는 기본 20, 최대 100이에요.
- 판매자 상품 목록은 `{ products: PageResponse, counts }`로 한 번 더 감싸져 있어요.

## 디자인을 다시 가져올 때

> ⚠️ API 연동을 시작한 뒤에는 `tools/regen.sh`를 쓰지 마세요. `src/pages/`를 새로 만들면서 덮어쓰기 때문에 각자 붙인 API 코드가 사라져요. 디자인이 바뀌면 해당 화면만 직접 고쳐요.

디자인 캔버스에서 화면을 수정했다면, 캔버스의 `project/*.dc.html` 파일을 한 폴더에 받아서 다시 변환할 수 있어요.

```bash
tools/regen.sh <dc.html 폴더 경로>
```

- 화면 마크업과 스타일은 `src/pages/` 에 새로 만들어져요. 이 파일을 직접 고쳤다면 다시 변환할 때 덮어써지니 주의해요.
- 화면 상태 로직은 `tools/logic/<화면>.tsx` 에 있고, 변환할 때 페이지 안의 `use…View` 훅으로 들어가요.
- Python 3 이 필요해요.

디자인 변환이 끝나고 코드로만 관리할 계획이면 `tools/` 폴더는 지워도 돼요.
