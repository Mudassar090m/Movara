import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi, type Document } from '../api/documents'
import { apiClient } from '../api/client'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload, Trash2, Layers, Plus } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useToast } from '../components/ui/Toast'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'

function DocumentCard({ doc, onDelete }: { doc: Document; onDelete: () => void }) {
  const navigate = useNavigate()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`
  const date = new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(doc.created_at))

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 hover:border-accent/40 transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0 group-hover:bg-accent/25 transition-colors cursor-pointer"
          onClick={() => navigate(`/documents/${doc.id}`)}
        >
          <FileText size={18} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/documents/${doc.id}`)}>
          <p className="font-medium text-text-primary truncate">{doc.title || doc.filename}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{doc.filename}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-text-muted">{fmt(doc.file_size)}</span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-xs text-text-muted">{date}</span>
            <span className="ml-auto flex items-center gap-1 text-xs bg-accent/15 text-accent px-2 py-0.5 rounded-full">
              <Layers size={10} /> {doc.num_chunks} chunks
            </span>
          </div>
        </div>

        {/* Always-visible delete with inline confirmation */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-xs shrink-0">
            <span className="text-text-muted">Delete?</span>
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false) }} className="text-text-muted hover:text-text-primary">No</button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
            className="text-text-muted hover:text-red-400 transition-all p-1 rounded-lg hover:bg-red-400/10 shrink-0"
            aria-label={`Delete ${doc.title || doc.filename}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const qc = useQueryClient()
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)

  const { data: docs, isLoading } = useQuery({ queryKey: ['documents'], queryFn: documentsApi.list })

  const deleteMut = useMutation({
    mutationFn: documentsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document deleted') },
    onError: () => toast.error('Failed to delete document'),
  })

  const doUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) { toast.error('Only PDF files are allowed'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File is too large (max 10 MB)'); return }
    setUploading(true)
    // Reset the file input so the same file can be chosen again
    if (fileRef.current) fileRef.current.value = ''
    try {
      const res = await apiClient.post<Document>('/documents',
        (() => { const form = new FormData(); form.append('file', file); form.append('title', file.name.replace(/\.pdf$/i, '')); return form })(),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      qc.invalidateQueries({ queryKey: ['documents'] })
      const warn = res.headers['x-embed-warning']
      if (warn) {
        toast.error(`PDF saved but AI indexing failed: ${warn}`)
      } else {
        toast.success('PDF uploaded and processed!')
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Upload failed')
    } finally { setUploading(false) }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) doUpload(file)
  }, [])

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Documents</h1>
            <p className="text-text-muted text-sm mt-1">Upload PDFs and ask questions about them</p>
          </div>
          <Button onClick={() => fileRef.current?.click()} loading={uploading} size="sm">
            <Plus size={14} /> Upload PDF
          </Button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-8 ${
            dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 hover:bg-accent/5'
          }`}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${dragging ? 'bg-accent/20' : 'bg-surface'}`}>
            <Upload size={20} className={dragging ? 'text-accent' : 'text-text-muted'} />
          </div>
          <p className="text-sm font-medium text-text-primary">
            {uploading ? 'Processing PDF...' : 'Drop a PDF here or click to upload'}
          </p>
          <p className="text-xs text-text-muted mt-1">PDF files only · max 10 MB</p>
          {uploading && <div className="mt-3 h-1 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-pulse w-3/4" />
          </div>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) doUpload(f) }} />

        {/* List */}
        {isLoading && <div className="flex flex-col gap-3">{Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>}
        {!isLoading && !docs?.length && (
          <div className="text-center py-12">
            <FileText size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">No documents yet. Upload your first PDF.</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {docs?.map((doc) => <DocumentCard key={doc.id} doc={doc} onDelete={() => deleteMut.mutate(doc.id)} />)}
        </div>
      </div>
    </div>
  )
}
