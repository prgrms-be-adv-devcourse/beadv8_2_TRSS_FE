import { defineConfig, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_SERVER = 'http://3.37.14.205'
// localhost는 Node에서 IPv6(::1)로 먼저 풀려 Spring(IPv4)과 연결이 안 될 수 있어요.
const LOCAL_HOST = 'http://127.0.0.1'

/**
 * 로컬 백엔드는 서비스마다 포트가 달라 경로별로 나눠 보낸다.
 * 개발 서버 nginx(infra/nginx/default.conf)와 같은 규칙·순서를 따른다 (위에서부터 먼저 맞는 규칙).
 * Vite는 쿼리스트링까지 포함한 주소로 검사하므로 경로 끝 뒤에 ?도 허용한다.
 */
const LOCAL_ROUTES: Array<[RegExp, number]> = [
  // 아래 member의 users 규칙보다 먼저 둔다
  [/^\/api\/v1\/users\/me\/coupon-usages([/?]|$)/, 8082],
  [/^\/api\/v1\/(auth|users|sellers|seller\/me|admin\/users|admin\/sellers)([/?]|$)/, 8081],
  [
    /^\/api\/v1\/(products|categories|cart|orders|wishlist|reviews|coupons|influencer|seller\/products|seller\/order-items|seller\/partnerships|seller\/coupons|admin\/products|admin\/categories|admin\/product-stop-requests|admin\/coupons|admin\/partnerships)([/?]|$)/,
    8082,
  ],
  [/^\/api\/v1\/(wallet|topups|admin\/payments|admin\/topups)([/?]|$)/, 8083],
  [/^\/api\/v1\/(admin\/settlements|admin\/settlement-candidates|seller\/settlements)([/?]|$)/, 8084],
  [/^\/api\/v1\/logistics([/?]|$)/, 8085],
  [/^\/api\/v1\/notifications([/?]|$)/, 8086],
]

const localProxy: Record<string, ProxyOptions> = Object.fromEntries(
  LOCAL_ROUTES.map(([pattern, port]) => [pattern.source, { target: `${LOCAL_HOST}:${port}`, changeOrigin: true }]),
)

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    // 개발 중 /api 요청을 백엔드로 전달해요. 같은 출처가 되어 쿠키·CORS 걱정이 없어요.
    proxy: mode === 'local-api' ? localProxy : { '/api': { target: DEV_SERVER, changeOrigin: true } },
  },
}))
