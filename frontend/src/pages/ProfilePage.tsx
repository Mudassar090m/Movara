import { useAuthStore } from '../store/authStore'
import { LogOut, User, Mail, Calendar } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

export default function ProfilePage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const date = user ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(new Date(user.created_at)) : ''

  const doLogout = () => { logout(qc); navigate('/login') }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-12">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 rounded-3xl bg-accent/20 border-2 border-accent/30 flex items-center justify-center text-3xl font-bold text-accent mb-4">
            {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-2xl font-bold text-text-primary">{user?.full_name || 'User'}</h1>
          <p className="text-text-muted text-sm mt-1">{user?.email}</p>
        </div>

        {/* Info card */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          {[
            { icon: User, label: 'Full name', value: user?.full_name || '—' },
            { icon: Mail, label: 'Email address', value: user?.email || '' },
            { icon: Calendar, label: 'Member since', value: date },
          ].map(({ icon: Icon, label, value }, i, arr) => (
            <div key={label} className={`flex items-center gap-4 px-5 py-4 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
              <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Icon size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-medium text-text-primary mt-0.5">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <Button variant="danger" onClick={doLogout} className="w-full">
          <LogOut size={15} /> Sign out
        </Button>
      </div>
    </div>
  )
}
