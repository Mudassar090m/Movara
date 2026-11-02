import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentsApi } from '../api/documents'
import { ArrowLeft, FileText, Layers, Send, Sparkles, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useToast } from '../components/ui/Toast'
import { Skeleton } from '../components/ui/Skeleton'
import { Button } from '../components/ui/Button'
import Markdown from 'react-markdown'

interface QA { question: string; answer: string; id: number }

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const docId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [qas, setQas] = useState<QA[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: doc, isLoading, isError } = useQuery({
    queryKey: ['document', docId],
    queryFn: () => documentsApi.get(docId),
  })

  const deleteMut = useMutation({
    mutationFn: () => documentsApi.delete(docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); navigate('/documents') },
    onError: () => toast.error('Failed to delete document'),
  })

  // Scroll to the newest answer whenever qas or loading state changes.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [qas, loading])

  const fmt = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  const ask = async () => {
    const q = question.trim()
    if (!q || loading) return   // guard against overlapping requests
    setQuestion('')
    setLoading(true)
    try {
      const res = await documentsApi.ask(docId, q)
      setQas((p) => [...p, { question: q, answer: res.answer, id: Date.now() }])
    } catch (e: any) {
      const detail = e?.response?.data?.detail || 'Failed to get answer'
      // Restore the question so the user can edit and retry without re-typing.
      setQuestion(q)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">Document not found or you don't have access.</p>
          <Button onClick={() => navigate('/documents')} size="sm">Back to Documents</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface/50 shrink-0">
        <button onClick={() => navigate('/documents')} className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </button>
        {isLoading ? <Skeleton className="h-5 w-48" /> : (
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-text-primary truncate">{doc?.title || doc?.filename}</h2>
            <p className="text-xs text-text-muted">{doc && fmt(doc.file_size)} · {doc?.num_chunks} chunks</p>
          </div>
        )}

        {/* Delete with confirmation */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Delete?</span>
            <button onClick={() => deleteMut.mutate()} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-text-muted hover:text-text-primary">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Doc info panel */}
        <div className="w-full md:w-72 border-r border-border bg-surface/30 p-5 shrink-0 overflow-y-auto">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center mb-4">
            <FileText size={24} className="text-accent" />
          </div>
          {isLoading ? (
            <div className="flex flex-col gap-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
          ) : (
            <>
              <h3 className="font-semibold text-text-primary mb-1">{doc?.title || doc?.filename}</h3>
              <p className="text-xs text-text-muted mb-4">{doc?.filename}</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">File size</span>
                  <span className="text-text-primary">{doc && fmt(doc.file_size)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted flex items-center gap-1"><Layers size={11} /> Chunks</span>
                  <span className={`font-medium ${doc?.num_chunks === 0 ? 'text-yellow-400' : 'text-accent'}`}>{doc?.num_chunks}</span>
                </div>
                {doc?.num_chunks === 0 && (
                  <p className="text-xs text-yellow-400 bg-yellow-400/10 rounded-lg p-2">
                    ⚠️ No text was extracted from this PDF. RAG questions will not return results.
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* RAG Q&A panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {qas.length === 0 && !loading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-accent/15 flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={28} className="text-accent" />
                  </div>
                  <h3 className="font-medium text-text-primary mb-1">Ask anything about this document</h3>
                  <p className="text-text-muted text-sm">StudyMate AI will search through the content and answer.</p>
                </div>
              </div>
            )}

            {qas.map((qa) => (
              <div key={qa.id} className="flex flex-col gap-3 animate-slide-up">
                <div className="flex justify-end">
                  <div className="bg-accent text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm max-w-[80%] whitespace-pre-wrap">{qa.question}</div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                    <Sparkles size={13} className="text-accent" />
                  </div>
                  <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-primary max-w-[80%] leading-relaxed">
                    <div className="prose prose-sm prose-invert max-w-none">
                      <Markdown>{qa.answer}</Markdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                  <Sparkles size={13} className="text-accent" />
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-text-muted">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-ping" />
                    Thinking through the document…
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Question input */}
          <div className="px-6 py-4 border-t border-border bg-surface/30 shrink-0">
            <div className="flex gap-3">
              <label htmlFor="rag-question" className="sr-only">Ask a question about this document</label>
              <input
                id="rag-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask() } }}
                placeholder="Ask a question about this document…"
                className="flex-1 bg-surface border border-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all"
              />
              <Button onClick={ask} disabled={!question.trim() || loading} loading={loading} size="sm">
                <Send size={14} /> Ask
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
