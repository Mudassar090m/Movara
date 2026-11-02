import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { QueryClient } from '@tanstack/react-query'

export interface User {
  id: number
  email: string
  full_name: string | null
  created_at: string
}

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: (queryClient?: QueryClient) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: (queryClient?: QueryClient) => {
        // Clear React Query cache so the next user never sees a prior user's data.
        queryClient?.clear()
        set({ token: null, user: null })
      },
    }),
    { name: 'studymate-auth', partialize: (s) => ({ token: s.token }) },
  ),
)
