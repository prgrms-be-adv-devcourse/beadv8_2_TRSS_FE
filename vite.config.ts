import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // 개발 중 /api 요청을 로컬 백엔드(Spring Boot)로 전달해요. 같은 출처가 되어 쿠키·CORS 걱정이 없어요.
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
