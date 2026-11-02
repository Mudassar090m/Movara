import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy all /auth, /conversations, /documents, /health calls to the backend.
      // This means the browser sends to localhost:5173 (same origin) and Vite
      // forwards to localhost:8000 — CORS is completely bypassed.
      '/auth': 'http://127.0.0.1:8000',
      '/conversations': 'http://127.0.0.1:8000',
      '/documents': 'http://127.0.0.1:8000',
      '/health': 'http://127.0.0.1:8000',
    },
  },
})
