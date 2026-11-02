import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsApi, type Message } from '../api/conversations'
import { useRef, useState, useEffect, KeyboardEvent } from 'react'
import { Send, Trash2, Bot, User, ArrowLeft, Pencil, Check, X } from 'lucide-react'
import { useToast } from '../components/ui/Toast'
import { Skeleton } from '../components/ui/Skeleton'
import Markdown from 'react-markdown'

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
        <Bot size={14} className="text-accent" />
      </div>
      <div className="bg-surface border border-border rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-accent' : 'bg-accent/20'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-accent" />}
      </div>
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? 'bg-accent text-white rounded-tr-sm' : 'bg-surface border border-border text-text-primary rounded-tl-sm'
      }`}>
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <Markdown>{message.content}</Markdown>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const convId = Number(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameVal, setRenameVal] = useState('')

  const { data: messages, isLoading, isError } = useQuery({
    queryKey: ['messages', convId],
    queryFn: () => conversationsApi.messages(convId),
  })

  const { data: conv } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
    select: (data) => data.find((c) => c.id === convId),
  })

  const sendMsg = useMutation({
    mutationFn: (content: string) => conversationsApi.send(convId, content),
    onMutate: () => { setTyping(true) },
    onSuccess: (data) => {
      setTyping(false)
      qc.setQueryData(['messages', convId], (old: Message[] = []) => [
        ...old, data.user_message, data.assistant_message,
      ])
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
    onError: (e: any) => {
      setTyping(false)
      // Restore the unsent text so the user can edit and retry without losing it.
      const detail = e?.response?.data?.detail || 'Failed to send message'
      toast.error(detail)
    },
  })

  const deleteConv = useMutation({
    mutationFn: () => conversationsApi.delete(convId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversations'] }); navigate('/chat') },
    onError: () => toast.error('Failed to delete conversation'),
  })

  const renameConv = useMutation({
    mutationFn: (title: string) => conversationsApi.update(convId, title),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conversations'] }); setRenaming(false) },
    onError: () => toast.error('Failed to rename conversation'),
  })

  // Auto-scroll to bottom when messages arrive or AI is typing.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  const send = () => {
    const content = input.trim()
    if (!content || sendMsg.isPending) return
    // Clear the input *after* we capture the content — prevents losing text on error.
    setInput('')
    sendMsg.mutate(content)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const startRename = () => {
    setRenameVal(conv?.title || '')
    setRenaming(true)
  }

  const commitRename = () => {
    const t = renameVal.trim()
    if (t && t !== conv?.title) renameConv.mutate(t)
    else setRenaming(false)
  }

  if (isError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted mb-4">Conversation not found or you don't have access.</p>
          <button onClick={() => navigate('/chat')} className="text-accent hover:text-accent-hover text-sm">
            Back to chats
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-surface/50 shrink-0">
        <button onClick={() => navigate('/chat')} className="text-text-muted hover:text-text-primary transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(false) }}
                maxLength={255}
                className="flex-1 bg-transparent border-b border-accent text-text-primary text-sm outline-none"
              />
              <button onClick={commitRename} className="text-green-400 hover:text-green-300"><Check size={14} /></button>
              <button onClick={() => setRenaming(false)} className="text-text-muted hover:text-text-primary"><X size={14} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="font-semibold text-text-primary truncate">{conv?.title || 'Conversation'}</h2>
              <button onClick={startRename} className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent transition-all">
                <Pencil size={13} />
              </button>
            </div>
          )}
          <p className="text-xs text-text-muted">{messages?.length || 0} messages</p>
        </div>

        {/* Delete with confirmation */}
        {confirmDelete ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted">Delete?</span>
            <button onClick={() => deleteConv.mutate()} className="text-red-400 hover:text-red-300 font-medium">Yes</button>
            <button onClick={() => setConfirmDelete(false)} className="text-text-muted hover:text-text-primary">No</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="text-text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {isLoading && Array(3).fill(0).map((_, i) => (
          <Skeleton key={i} className={`h-12 ${i % 2 === 0 ? 'w-2/3' : 'w-1/2 self-end'}`} />
        ))}
        {!isLoading && messages?.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-text-muted text-sm">Say hello to get started!</p>
          </div>
        )}
        {messages?.map((m) => <MessageBubble key={m.id} message={m} />)}
        {typing && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-surface/30 shrink-0">
        <div className="flex gap-3 items-end">
          <textarea
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-surface border border-border text-text-primary placeholder-text-muted rounded-xl px-4 py-3 text-sm resize-none outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all max-h-32"
            style={{ overflowY: input.includes('\n') ? 'auto' : 'hidden' }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || sendMsg.isPending}
            aria-label="Send message"
            className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors glow shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
