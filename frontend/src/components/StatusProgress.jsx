import { motion } from 'motion/react'
import { Check, Minus } from 'lucide-react'
import { STATUS_LABELS } from '../constants'
import { EASE } from '../motion'

const LABELS = { ...STATUS_LABELS, OPEN: 'Raised', SUGGESTION_PROVIDED: 'AI suggestion' }
const TECH_PATH = ['OPEN', 'SUGGESTION_PROVIDED', 'ESCALATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL', 'CLOSED']
const AI_PATH = ['OPEN', 'SUGGESTION_PROVIDED', 'RESOLVED']

// The ticket's journey. A stage counts as done only if the history shows the ticket reached it,
// so a stage that was skipped (e.g. an admin closed the ticket early) is shown as skipped.
export default function StatusProgress({ ticket }) {
  const reached = new Set(ticket.history.map((h) => h.new_status))
  reached.add('OPEN')
  const path = ticket.status === 'RESOLVED' ? AI_PATH : TECH_PATH
  const current = Math.max(path.indexOf(ticket.status), 0)
  const finished = ticket.status === 'CLOSED' || ticket.status === 'RESOLVED'

  const steps = path.map((status, i) => ({
    status,
    label: LABELS[status],
    state: i === current ? (finished ? 'done' : 'current') : i < current ? (reached.has(status) ? 'done' : 'skipped') : 'upcoming',
  }))
  const progress = path.length > 1 ? current / (path.length - 1) : 1

  return (
    <div>
      {/* Phones: a compact summary bar. */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-slate-700">{LABELS[ticket.status]}</span>
          <span className="text-slate-500">
            Stage {current + 1} of {path.length}
          </span>
        </div>
        <div className="mt-2 flex gap-1" aria-hidden="true">
          {steps.map((s, i) => (
            <motion.span
              key={s.status}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
              className={`h-1.5 flex-1 origin-left rounded-full ${s.state === 'done' ? 'bg-brand-500' : s.state === 'current' ? 'bg-brand-300' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {/* Larger screens: the full stepper. */}
      <ol className="relative hidden sm:flex" aria-label="Ticket progress">
        <span className="absolute top-3.5 right-[calc(50%/var(--n))] left-[calc(50%/var(--n))] h-0.5 rounded-full bg-slate-200" style={{ '--n': path.length }} aria-hidden="true">
          <motion.span
            className="block h-full origin-left rounded-full bg-brand-500"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progress }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          />
        </span>
        {steps.map((s, i) => (
          <li key={s.status} className="relative flex flex-1 flex-col items-center text-center" aria-current={s.state === 'current' ? 'step' : undefined}>
            <motion.span
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: EASE, delay: 0.1 + i * 0.07 }}
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-4 ring-white ${
                s.state === 'done'
                  ? 'bg-brand-600 text-white'
                  : s.state === 'current'
                    ? 'border-2 border-brand-600 bg-white text-brand-700'
                    : s.state === 'skipped'
                      ? 'border border-dashed border-slate-300 bg-white text-slate-400'
                      : 'border border-slate-200 bg-white text-slate-400'
              }`}
            >
              {s.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" /> : s.state === 'skipped' ? <Minus className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}
              {s.state === 'current' && <span className="absolute inset-0 animate-ping rounded-full bg-brand-400/30 [animation-duration:2.2s]" aria-hidden="true" />}
            </motion.span>
            <span className={`mt-2 px-1 text-[11px] leading-tight font-medium ${s.state === 'upcoming' || s.state === 'skipped' ? 'text-slate-400' : 'text-slate-700'}`}>
              {s.label}
            </span>
            <span className="sr-only">{s.state === 'done' ? '(done)' : s.state === 'current' ? '(current)' : s.state === 'skipped' ? '(skipped)' : '(upcoming)'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
