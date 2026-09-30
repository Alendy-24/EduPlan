import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api/institutions': 'http://127.0.0.1:3001',
      '/api/programs': 'http://127.0.0.1:3001',
      '/api/program-links': 'http://127.0.0.1:8080',
      '/api/auth': 'http://127.0.0.1:8080',
      '/api/me': 'http://127.0.0.1:8080',
    },
  },
})
