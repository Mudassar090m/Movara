import { apiClient } from './client'

export interface Conversation {
  id: number; user_id: number; title: string
  created_at: string; updated_at: string
}
export interface Message {
  id: number; conversation_id: number; role: 'user' | 'assistant' | 'system'
  content: string; created_at: string
}
export interface ChatResponse { user_message: Message; assistant_message: Message }

export const conversationsApi = {
  list: () => apiClient.get<Conversation[]>('/conversations').then((r) => r.data),
  create: (title?: string) => apiClient.post<Conversation>('/conversations', { title: title || 'New Chat' }).then((r) => r.data),
  update: (id: number, title: string) => apiClient.patch<Conversation>(`/conversations/${id}`, { title }).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/conversations/${id}`),
  messages: (id: number) => apiClient.get<Message[]>(`/conversations/${id}/messages`).then((r) => r.data),
  send: (id: number, content: string) => apiClient.post<ChatResponse>(`/conversations/${id}/messages`, { content }, { timeout: 320000 }).then((r) => r.data),
}
