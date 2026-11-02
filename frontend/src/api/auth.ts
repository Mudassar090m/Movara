import axios from 'axios'
import { apiClient } from './client'
import type { User } from '../store/authStore'

export const authApi = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    apiClient.post<User>('/auth/register', data).then((r) => r.data),

  login: async (email: string, password: string): Promise<{ access_token: string }> => {
    // Must be sent as application/x-www-form-urlencoded (OAuth2PasswordRequestForm).
    // Use a separate axios call (not apiClient) with URLSearchParams so the
    // Content-Type is always correct and never overridden.
    const body = new URLSearchParams({ username: email, password })
    const baseURL = import.meta.env.VITE_API_URL ?? ''
    const r = await axios.post<{ access_token: string; token_type: string }>(
      `${baseURL}/auth/login`,
      body,
    )
    return r.data
  },

  me: (token?: string) =>
    apiClient
      .get<User>('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.data),
}
