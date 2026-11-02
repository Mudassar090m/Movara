import { apiClient } from './client'

export interface Document {
  id: number; user_id: number; filename: string; title: string | null
  file_size: number; num_chunks: number; created_at: string
}
export interface DocumentChunk {
  id: number; document_id: number; chunk_index: number
  content: string; created_at: string
}
export interface RAGResponse { document_id: number; question: string; answer: string }

export const documentsApi = {
  list: () => apiClient.get<Document[]>('/documents').then((r) => r.data),
  get: (id: number) => apiClient.get<Document>(`/documents/${id}`).then((r) => r.data),
  upload: (file: File, title?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (title) form.append('title', title)
    return apiClient.post<Document>('/documents', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
  chunks: (id: number) => apiClient.get<DocumentChunk[]>(`/documents/${id}/chunks`).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/documents/${id}`),
  ask: (id: number, question: string) =>
    apiClient.post<RAGResponse>(`/documents/${id}/ask`, { question }, { timeout: 320000 }).then((r) => r.data),
}
