import { ThumbsDown, ThumbsUp, Wrench } from 'lucide-react'
import { useState } from 'react'
import { Spinner } from './ui'

// "Did this solve your problem?" for an answered suggestion; a single escalate action otherwise.
export default function FeedbackPanel({ answered, onSubmit, busy }) {
  const [comment, setComment] = useState('')
  const [choice, setChoice] = useState(null)

  const submit = (resolved) => {
    setChoice(resolved)
    onSubmit(resolved, comment.trim())
  }

  return (
    <div className="mt-5 rounded-xl border border-brand-100 bg-linear-to-b from-brand-50/70 to-white p-4">
      <p className="text-sm font-semibold text-slate-900">{answered ? 'Did this solve your problem?' : 'Send this ticket to a technician?'}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {answered ? 'Your answer closes the ticket or routes it to the right team.' : 'It will be routed to the right team by clear rules.'}
      </p>
      <label htmlFor="feedback-comment" className="sr-only">
        Feedback comment
      </label>
      <textarea
        id="feedback-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="Optional comment (what you tried, what happened)"
        className="field mt-3"
      />
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        {answered && (
          <button onClick={() => submit(true)} disabled={busy} className="btn btn-success">
            {busy && choice === true ? <Spinner /> : <ThumbsUp className="h-4 w-4" aria-hidden="true" />}
            {busy && choice === true ? 'Saving…' : 'Yes, it is fixed'}
          </button>
        )}
        <button onClick={() => submit(false)} disabled={busy} className={`btn ${answered ? 'btn-secondary' : 'btn-primary'}`}>
          {busy && choice === false ? <Spinner /> : answered ? <ThumbsDown className="h-4 w-4" aria-hidden="true" /> : <Wrench className="h-4 w-4" aria-hidden="true" />}
          {busy && choice === false ? 'Escalating…' : answered ? 'No, escalate to a technician' : 'Escalate to a technician'}
        </button>
      </div>
    </div>
  )
}
