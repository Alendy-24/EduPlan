import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 3005,
    strictPort: true,
    // Internal targets use IPv4 loopback; the public browser URL stays localhost.
    proxy: {
      '/api/institutions': process.env.EDUPLAN_CATALOG_URL || 'http://127.0.0.1:3001',
      '/api/programs': process.env.EDUPLAN_CATALOG_URL || 'http://127.0.0.1:3001',
      '/api/recommendations': process.env.EDUPLAN_CATALOG_URL || 'http://127.0.0.1:3001',
      '/api/program-links': process.env.EDUPLAN_BACKEND_URL || 'http://127.0.0.1:8080',
      '/api/auth': process.env.EDUPLAN_BACKEND_URL || 'http://127.0.0.1:8080',
      '/api/me': process.env.EDUPLAN_BACKEND_URL || 'http://127.0.0.1:8080',
    },
  },
})
