import { MessageSquare, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { conversationsApi } from '../api/conversations'
import { Button } from '../components/ui/Button'

export default function ChatPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const create = useMutation({
    mutationFn: () => conversationsApi.create('New Chat'),
    onSuccess: (c) => { qc.invalidateQueries({ queryKey: ['conversations'] }); navigate(`/chat/${c.id}`) },
  })

  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-accent/15 border border-accent/20 flex items-center justify-center mx-auto mb-6">
          <MessageSquare size={36} className="text-accent" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Start a conversation</h2>
        <p className="text-text-muted text-sm mb-8 max-w-xs">Ask questions, explore ideas, or discuss your study topics with AI.</p>
        <Button onClick={() => create.mutate()} loading={create.isPending}>
          <Plus size={16} /> New Chat
        </Button>
      </div>
    </div>
  )
}
