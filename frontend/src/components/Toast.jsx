import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck, CircleX, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { EASE } from '../motion'

const ToastContext = createContext(() => {})
const DURATION_MS = 4500

const TONES = {
  success: { Icon: CircleCheck, ink: 'text-emerald-600' },
  error: { Icon: CircleX, ink: 'text-red-600' },
  info: { Icon: Info, ink: 'text-brand-600' },
}

// Brief confirmations of actions. Errors that need reading stay inline next to the form; a
// toast only echoes them. The region is a polite live region so screen readers hear it.
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const nextId = useRef(1)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const toast = useCallback(
    ({ type = 'success', title, description }) => {
      const id = nextId.current++
      setToasts((list) => [...list.slice(-2), { id, type, title, description }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const { Icon, ink } = TONES[t.type]
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                transition={{ duration: 0.3, ease: EASE }}
                className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-overlay backdrop-blur"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ink}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{t.description}</p>}
                </div>
                <button onClick={() => dismiss(t.id)} className="-m-1 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Dismiss notification">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
