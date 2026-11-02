import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, FileText, User, Plus, LogOut, Brain } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsApi } from '../../api/conversations'
import { useAuthStore } from '../../store/authStore'
import { Skeleton } from '../ui/Skeleton'

interface Props {
  /** Called after any navigation action so the parent can close the mobile drawer. */
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: Props) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: convs, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
  })

  const createConv = useMutation({
    mutationFn: () => conversationsApi.create('New Chat'),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      navigate(`/chat/${c.id}`)
      onNavigate?.()
    },
  })

  const doLogout = () => { logout(qc); navigate('/login') }

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      isActive ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text-primary hover:bg-white/5'
    }`

  return (
    <aside className="w-64 h-screen bg-surface border-r border-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-semibold text-text-primary">
            StudyMate <span className="text-gradient">AI</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="p-3 border-b border-border flex flex-col gap-1">
        <NavLink to="/chat" end className={navClass} onClick={onNavigate}>
          <MessageSquare size={16} /> Chat
        </NavLink>
        <NavLink to="/documents" className={navClass} onClick={onNavigate}>
          <FileText size={16} /> Documents
        </NavLink>
        <NavLink to="/profile" className={navClass} onClick={onNavigate}>
          <User size={16} /> Profile
        </NavLink>
      </nav>

      {/* Conversations */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Conversations
          </span>
          <button
            onClick={() => createConv.mutate()}
            disabled={createConv.isPending}
            aria-label="New conversation"
            className="w-6 h-6 rounded-md bg-accent/20 hover:bg-accent/40 text-accent flex items-center justify-center transition-colors"
          >
            <Plus size={13} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
          {isLoading && Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-9 mx-1" />)}
          {convs?.map((c) => (
            <NavLink
              key={c.id}
              to={`/chat/${c.id}`}
              className={navClass}
              onClick={onNavigate}
            >
              <MessageSquare size={13} className="shrink-0" />
              <span className="truncate">{c.title}</span>
            </NavLink>
          ))}
          {!isLoading && !convs?.length && (
            <p className="text-xs text-text-muted text-center py-4">No conversations yet</p>
          )}
        </div>
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-semibold shrink-0">
          {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-primary truncate">{user?.full_name || 'User'}</p>
          <p className="text-xs text-text-muted truncate">{user?.email}</p>
        </div>
        <button onClick={doLogout} className="text-text-muted hover:text-red-400 transition-colors" title="Sign out">
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  )
}
