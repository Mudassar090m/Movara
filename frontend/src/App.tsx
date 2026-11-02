import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { authApi } from './api/auth'
import { useAuthStore } from './store/authStore'
import { useQueryClient } from '@tanstack/react-query'
import { ToastProvider } from './components/ui/Toast'
import { AuthGuard } from './components/auth/AuthGuard'
import { AppLayout } from './components/layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import ConversationPage from './pages/ConversationPage'
import DocumentsPage from './pages/DocumentsPage'
import DocumentDetailPage from './pages/DocumentDetailPage'
import ProfilePage from './pages/ProfilePage'

// Validates the stored token on app load and hydrates the user object.
// Only runs when there IS a token — skipped on login/register pages.
function TokenBootstrap() {
  const { token, setUser, logout } = useAuthStore()
  const qc = useQueryClient()
  useEffect(() => {
    if (!token) return
    authApi.me().then(setUser).catch((err) => {
      // Only clear the token when the server explicitly rejects it (401).
      // A network error (backend down) should not log the user out.
      if (err?.response?.status === 401) {
        logout(qc)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <TokenBootstrap />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — AuthGuard redirects to /login if no token */}
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/chat/:id" element={<ConversationPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Root and any unknown path → login (not /chat, which would loop) */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
