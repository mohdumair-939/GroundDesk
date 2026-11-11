import { CircleCheck, Lock, Play, RotateCcw, Send, ShieldCheck, ThumbsDown, UserCheck, Wrench } from 'lucide-react'
import { useState } from 'react'
import { listTechnicians } from '../api'
import { CATEGORIES, PRIORITIES } from '../constants'
import { useAsync } from '../useAsync'
import Modal from './Modal'
import SolveForm from './SolveForm'
import { Spinner } from './ui'

function ActionCard({ title, description, Icon, tone = 'bg-slate-100 text-slate-600', className = '', children }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Employee: approve or reject the technician's fix.
export function ClosurePanel({ ticket, onSubmit, busy }) {
  const [comment, setComment] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const resolution = [...ticket.history].reverse().find((h) => h.new_status === 'PENDING_APPROVAL')

  return (
    <ActionCard
      title="Your technician marked this ticket as solved"
      description="Confirm the fix to close the ticket, or send it back."
      Icon={CircleCheck}
      tone="bg-teal-50 text-teal-600"
      className="border-teal-200 ring-4 ring-teal-50"
    >
      {resolution?.note && (
        <blockquote className="rounded-lg border-l-2 border-teal-400 bg-teal-50/50 px-3 py-2 text-sm text-slate-700">{resolution.note}</blockquote>
      )}
      <p className="mt-4 text-sm font-medium text-slate-800">Is the problem fixed?</p>
      <label htmlFor="closure-comment" className="sr-only">
        {rejecting ? 'What is still not working' : 'Comment for the technician'}
      </label>
      <textarea
        id="closure-comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={400}
        placeholder={rejecting ? 'What is still not working?' : 'Add a comment for the technician (optional)'}
        className="field mt-2"
      />
      <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
        {!rejecting ? (
          <>
            <button onClick={() => onSubmit(true, comment.trim())} disabled={busy} className="btn btn-success">
              {busy ? <Spinner /> : <CircleCheck className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Saving…' : 'Yes, close the ticket'}
            </button>
            <button onClick={() => setRejecting(true)} disabled={busy} className="btn btn-secondary">
              <ThumbsDown className="h-4 w-4" aria-hidden="true" />
              No, it is not fixed
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onSubmit(false, comment.trim())} disabled={busy || comment.trim().length < 3} className="btn btn-primary">
              {busy ? <Spinner /> : <Send className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Sending…' : 'Send back to technician'}
            </button>
            <button onClick={() => setRejecting(false)} className="btn btn-ghost">
              Cancel
            </button>
          </>
        )}
      </div>
    </ActionCard>
  )
}

// Technician (and admin): start work / mark solved with a resolution note and a KB article.
export function TechnicianPanel({ ticket, onMove, busy }) {
  const [solving, setSolving] = useState(false)

  if (ticket.status === 'ASSIGNED') {
    return (
      <ActionCard title="Ready to start" description="Let the employee know someone is on it." Icon={Wrench} tone="bg-orange-50 text-orange-600">
        <button onClick={() => onMove('IN_PROGRESS', 'Technician started work')} disabled={busy} className="btn btn-primary w-full sm:w-auto">
          {busy ? <Spinner /> : <Play className="h-4 w-4" aria-hidden="true" />}
          {busy ? 'Starting…' : 'Start work'}
        </button>
      </ActionCard>
    )
  }
  if (ticket.status === 'IN_PROGRESS') {
    return (
      <ActionCard title="Work in progress" description="When it's fixed, mark it solved; the employee then approves the closure." Icon={Wrench} tone="bg-blue-50 text-blue-600">
        <button onClick={() => setSolving(true)} className="btn btn-primary w-full sm:w-auto">
          <CircleCheck className="h-4 w-4" aria-hidden="true" />
          Mark solved…
        </button>
        <Modal open={solving} onClose={() => setSolving(false)} title={`Mark ${ticket.ticket_code} as solved`} description={ticket.title}>
          <SolveForm
            ticket={ticket}
            busy={busy}
            onCancel={() => setSolving(false)}
            onSubmit={async (note, kbArticle) => {
              if (await onMove('PENDING_APPROVAL', note, kbArticle)) setSolving(false)
            }}
          />
        </Modal>
      </ActionCard>
    )
  }
  return null
}

const OPEN = ['OPEN', 'SUGGESTION_PROVIDED', 'ESCALATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']

// Admin: edit priority/category, reassign, force-close, reopen.
export function AdminPanel({ ticket, act, busy }) {
  const techs = useAsync(() => listTechnicians(), [])
  const [priority, setPriority] = useState(ticket.priority)
  const [category, setCategory] = useState(ticket.category)
  const [techId, setTechId] = useState('')
  const [reason, setReason] = useState('')

  const canReassign = ['ESCALATED', 'ASSIGNED', 'IN_PROGRESS'].includes(ticket.status)
  const canClose = OPEN.includes(ticket.status)
  const canReopen = ['RESOLVED', 'CLOSED'].includes(ticket.status)
  const changed = priority !== ticket.priority || category !== ticket.category

  return (
    <ActionCard title="Admin controls" description="Changes are recorded on the ticket timeline." Icon={ShieldCheck} tone="bg-brand-50 text-brand-600">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="admin-priority" className="label">
            Priority
          </label>
          <select id="admin-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="field mt-1.5">
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-category" className="label">
            Category
          </label>
          <select id="admin-category" value={category} onChange={(e) => setCategory(e.target.value)} className="field mt-1.5">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <button onClick={() => act('update', { priority, category })} disabled={busy || !changed} className="btn btn-secondary">
          Save
        </button>
      </div>

      {canReassign && (
        <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="admin-reassign" className="label">
              Reassign to
            </label>
            <select id="admin-reassign" value={techId} onChange={(e) => setTechId(e.target.value)} className="field mt-1.5">
              <option value="">Choose a technician…</option>
              {(techs.data || []).map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === ticket.assignment?.technician?.id}>
                  {t.name} — {t.department.name} ({t.open_tickets} open)
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => act('reassign', { techId, note: reason })} disabled={busy || !techId} className="btn btn-secondary">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Reassign
          </button>
        </div>
      )}

      {(canClose || canReopen) && (
        <div className="mt-5 border-t border-slate-100 pt-5">
          <label className="label" htmlFor="admin-reason">
            Reason{' '}
            <span className="font-normal text-slate-500">
              (required to {canClose ? 'close' : 'reopen'}
              {canReassign && '; also used as the reassignment note'})
            </span>
          </label>
          <textarea id="admin-reason" rows={2} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} className="field mt-1.5" />
          <div className="mt-3 flex flex-wrap gap-2">
            {canClose && (
              <button onClick={() => act('close', { note: reason })} disabled={busy || reason.trim().length < 3} className="btn btn-danger">
                <Lock className="h-4 w-4" aria-hidden="true" />
                Force close
              </button>
            )}
            {canReopen && (
              <button onClick={() => act('reopen', { note: reason })} disabled={busy || reason.trim().length < 3} className="btn btn-primary">
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </ActionCard>
  )
}

// Everyone involved: add a follow-up note to the timeline.
export function NoteForm({ onSubmit, busy }) {
  const [note, setNote] = useState('')
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (await onSubmit(note.trim())) setNote('')
      }}
      className="mt-6 border-t border-slate-100 pt-5"
    >
      <label className="label" htmlFor="note">
        Add a note
      </label>
      <textarea id="note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="field mt-1.5" placeholder="Share an update or ask a question…" />
      <div className="mt-2 flex justify-end">
        <button type="submit" disabled={busy || note.trim().length < 3} className="btn btn-secondary btn-sm">
          <Send className="h-3.5 w-3.5" aria-hidden="true" />
          Add note
        </button>
      </div>
    </form>
  )
}
