import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Menu, X } from 'lucide-react'

export function AppLayout() {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-muted hover:text-text-primary"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay for mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar: always visible on md+, slide-in drawer on mobile */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-40
          transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <Sidebar onNavigate={() => setOpen(false)} />
      </div>

      <main className="flex-1 overflow-hidden md:ml-0">
        <Outlet />
      </main>
    </div>
  )
}
