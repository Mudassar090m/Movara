import { createContext, useCallback, useContext, useState, ReactNode } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

interface Toast { id: string; message: string; type: 'success' | 'error' }
interface ToastCtx { success: (msg: string) => void; error: (msg: string) => void }

const Ctx = createContext<ToastCtx>({ success: () => {}, error: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((message: string, type: Toast['type']) => {
    const id = crypto.randomUUID()
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <Ctx.Provider value={{ success: (m) => add(m, 'success'), error: (m) => add(m, 'error') }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-4 rounded-xl bg-surface border border-border shadow-lg animate-slide-up">
            {t.type === 'success'
              ? <CheckCircle size={18} className="text-green-400 shrink-0" />
              : <XCircle size={18} className="text-red-400 shrink-0" />}
            <span className="text-sm text-text-primary flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              aria-label="Dismiss notification"
              className="text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
