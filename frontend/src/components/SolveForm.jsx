import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Spinner } from './ui'
import { EASE } from '../motion'

// Limits match the backend's KBSubmission schema.
const LIMITS = { title: [5, 120], problem: [20, 2000], cause: [0, 1000], steps: [20, 4000] }
const valid = (value, [min, max]) => value.trim().length >= min && value.trim().length <= max

// "Mark solved": the resolution note for the employee, plus (ticked by default) the
// troubleshooting written up for the knowledge base. An admin reviews it after the employee
// confirms the fix, so similar tickets can later be answered by the AI.
export default function SolveForm({ ticket, onSubmit, onCancel, busy }) {
  const [note, setNote] = useState('')
  const [share, setShare] = useState(true)
  const [article, setArticle] = useState({
    title: ticket.title,
    problem: ticket.description.slice(0, LIMITS.problem[1]),
    cause: '',
    steps: '',
  })
  const set = (key) => (e) => setArticle((a) => ({ ...a, [key]: e.target.value }))

  const articleOk = Object.entries(LIMITS).every(([key, limits]) => valid(article[key], limits))
  const ready = note.trim().length >= 3 && (!share || articleOk)
  const id = (name) => `solve-${ticket.id}-${name}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        const kb = share
          ? {
              title: article.title.trim(),
              problem: article.problem.trim(),
              cause: article.cause.trim() || null,
              steps: article.steps.trim(),
            }
          : null
        onSubmit(note.trim(), kb)
      }}
      className="space-y-5"
    >
      <div>
        <label className="label" htmlFor={id('note')}>
          What did you do to fix it?
        </label>
        <p className="mt-0.5 text-xs text-slate-500">Shown to the employee, who confirms the fix before the ticket closes.</p>
        <textarea
          id={id('note')}
          required
          rows={3}
          maxLength={400}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="field mt-2"
          placeholder="e.g. Cleaned the fan and vents, and updated the BIOS"
        />
      </div>

      <div className={`rounded-xl border p-4 transition-colors ${share ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200'}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <BookOpen className="h-4 w-4 text-brand-600" aria-hidden="true" />
              Add this fix to the knowledge base
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              So the AI can solve similar problems next time. An admin reviews it after the employee confirms the fix. Untick it for one-off fixes.
            </span>
          </span>
        </label>

        <AnimatePresence initial={false}>
          {share && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="space-y-4 pt-4">
                <div>
                  <label className="label" htmlFor={id('title')}>
                    Article title
                  </label>
                  <input id={id('title')} maxLength={120} value={article.title} onChange={set('title')} className="field mt-1.5" />
                </div>
                <div>
                  <label className="label" htmlFor={id('problem')}>
                    Problem / symptoms
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">Describe it the way a user would. Leave out names and device IDs.</p>
                  <textarea id={id('problem')} rows={3} maxLength={2000} value={article.problem} onChange={set('problem')} className="field mt-1.5" />
                </div>
                <div>
                  <label className="label" htmlFor={id('cause')}>
                    Cause <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea id={id('cause')} rows={2} maxLength={1000} value={article.cause} onChange={set('cause')} className="field mt-1.5" />
                </div>
                <div>
                  <label className="label" htmlFor={id('steps')}>
                    Troubleshooting steps
                  </label>
                  <p className="mt-0.5 text-xs text-slate-500">One numbered step per line, most likely fix first. No passwords or personal details.</p>
                  <textarea
                    id={id('steps')}
                    rows={5}
                    maxLength={4000}
                    value={article.steps}
                    onChange={set('steps')}
                    className="field mt-1.5 font-mono text-[13px]"
                    placeholder={'1. …\n2. …\n3. If this does not help, escalate to …'}
                  />
                  {article.steps.trim().length > 0 && article.steps.trim().length < LIMITS.steps[0] && (
                    <p className="mt-1.5 text-xs font-medium text-amber-700">Add a little more detail (at least {LIMITS.steps[0]} characters).</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        )}
        <button type="submit" disabled={busy || !ready} className="btn btn-primary">
          {busy ? <Spinner /> : <CircleCheck className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Saving…' : 'Mark solved'}
        </button>
      </div>
    </form>
  )
}
