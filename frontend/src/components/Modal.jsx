import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { EASE } from '../motion'

const FOCUSABLE = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'

// Dialog with a backdrop. Escape and the backdrop close it, Tab stays inside, focus returns to
// the opener afterwards, and the page behind does not scroll. A bottom sheet on phones.
export default function Modal({ open, onClose, title, description, children, size = 'max-w-2xl' }) {
  const panel = useRef(null)
  const titleId = useId()
  // Parents usually pass an inline onClose; keep the latest in a ref so the effect below runs
  // once per opening (re-running it would move focus around while the user types).
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onClose = () => closeRef.current()
    const opener = document.activeElement
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const focusTimer = setTimeout(() => {
      const first = panel.current?.querySelector('[autofocus], textarea, input, select') || panel.current?.querySelector(FOCUSABLE)
      first?.focus()
    }, 30)

    function onKey(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab' && panel.current) {
        const items = [...panel.current.querySelectorAll(FOCUSABLE)]
        if (!items.length) return
        const [first, last] = [items[0], items[items.length - 1]]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      opener?.focus?.()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.16 } }}
            transition={{ duration: 0.3, ease: EASE }}
            className={`relative flex max-h-[92vh] w-full ${size} flex-col overflow-hidden rounded-t-2xl bg-white shadow-overlay sm:rounded-2xl`}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold text-slate-900">
                  {title}
                </h2>
                {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
              </div>
              <button onClick={onClose} className="btn btn-ghost btn-sm -mr-2 w-8 px-0" aria-label="Close dialog">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="scroll-thin overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
