import { useState } from 'react'

const field = 'mt-1 block w-full field px-3 py-2 text-sm'
const label = 'block text-sm font-medium text-stone-700'

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
      className="space-y-3"
    >
      <div>
        <label className={label} htmlFor={id('note')}>
          What did you do to fix it?
        </label>
        <p className="text-xs text-stone-500">Shown to the employee, who confirms the fix before the ticket closes.</p>
        <textarea
          id={id('note')}
          required
          rows={2}
          maxLength={400}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={field}
          placeholder="e.g. Cleaned the fan and vents, and updated the BIOS"
        />
      </div>

      <div className="rounded-md border border-violet-200 bg-violet-50/60 p-3">
        <label className="flex items-start gap-2 text-sm font-medium text-violet-950">
          <input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} className="mt-0.5 accent-violet-600" />
          <span>
            Add this fix to the knowledge base
            <span className="block text-xs font-normal text-violet-900/80">
              So the AI can solve similar problems next time. An admin reviews it after the employee confirms the fix. Untick
              it for one-off fixes.
            </span>
          </span>
        </label>

        {share && (
          <div className="mt-3 space-y-3">
            <div>
              <label className={label} htmlFor={id('title')}>
                Article title
              </label>
              <input id={id('title')} maxLength={120} value={article.title} onChange={set('title')} className={field} />
            </div>
            <div>
              <label className={label} htmlFor={id('problem')}>
                Problem / symptoms
              </label>
              <p className="text-xs text-stone-500">Describe it the way a user would. Leave out names and device IDs.</p>
              <textarea id={id('problem')} rows={3} maxLength={2000} value={article.problem} onChange={set('problem')} className={field} />
            </div>
            <div>
              <label className={label} htmlFor={id('cause')}>
                Cause <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <textarea id={id('cause')} rows={2} maxLength={1000} value={article.cause} onChange={set('cause')} className={field} />
            </div>
            <div>
              <label className={label} htmlFor={id('steps')}>
                Troubleshooting steps
              </label>
              <p className="text-xs text-stone-500">One numbered step per line, most likely fix first. No passwords or personal details.</p>
              <textarea
                id={id('steps')}
                rows={5}
                maxLength={4000}
                value={article.steps}
                onChange={set('steps')}
                className={`${field} font-mono text-[13px]`}
                placeholder={'1. …\n2. …\n3. If this does not help, escalate to …'}
              />
              {article.steps.trim().length > 0 && article.steps.trim().length < LIMITS.steps[0] && (
                <p className="mt-1 text-xs text-amber-700">Add a little more detail (at least {LIMITS.steps[0]} characters).</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || !ready}
          className="btn-solid bg-teal-600 px-3 py-1.5 text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Mark solved'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
