import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// In development, Vite proxies /auth, /conversations, /documents to the backend
// on port 8000 — so we use a relative base URL (same origin, no CORS).
// In production, set VITE_API_URL to the backend's absolute URL.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const onAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (!onAuthPage) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)
