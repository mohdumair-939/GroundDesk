import { useState } from 'react'

// "Did this solve your problem?" for an answered suggestion; a single escalate action otherwise.
export default function FeedbackPanel({ answered, onSubmit, busy }) {
  const [comment, setComment] = useState('')
  const [choice, setChoice] = useState(null)

  const submit = (resolved) => {
    setChoice(resolved)
    onSubmit(resolved, comment.trim())
  }

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-medium text-stone-800">
        {answered ? 'Did this solve your problem?' : 'Send this ticket to a technician?'}
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Optional comment (what you tried, what happened)"
        className="mt-2 block w-full field px-3 py-2 text-sm"
        aria-label="Feedback comment"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        {answered && (
          <button
            onClick={() => submit(true)}
            disabled={busy}
            className="btn-solid bg-emerald-600 px-3 py-1.5 hover:bg-emerald-700 text-sm font-medium disabled:opacity-50"
          >
            {busy && choice === true ? 'Saving…' : 'Yes, it is fixed'}
          </button>
        )}
        <button
          onClick={() => submit(false)}
          disabled={busy}
          className="btn-solid bg-amber-500 px-3 py-1.5 hover:bg-amber-600 text-sm font-medium disabled:opacity-50"
        >
          {busy && choice === false ? 'Escalating…' : answered ? 'No, escalate to a technician' : 'Escalate to a technician'}
        </button>
      </div>
    </div>
  )
}
