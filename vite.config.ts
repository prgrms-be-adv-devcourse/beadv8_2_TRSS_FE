import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DEV_SERVER = 'http://3.37.14.205'
// localhost는 Node에서 IPv6(::1)로 먼저 풀려 Spring(IPv4)과 연결이 안 될 수 있어요.
const LOCAL_SERVER = 'http://127.0.0.1:8080'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 /api 요청을 백엔드로 전달해요. 같은 출처가 되어 쿠키·CORS 걱정이 없어요.
      '/api': {
        target: mode === 'local-api' ? LOCAL_SERVER : DEV_SERVER,
        changeOrigin: true,
      },
    },
  },
}))
