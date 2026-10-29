import { useState } from 'react'
import { CATEGORIES, PRIORITIES } from '../constants'
import { listTechnicians } from '../api'
import { useAsync } from '../useAsync'

const textarea = 'mt-1 block w-full field px-3 py-2 text-sm'
const select = 'field px-2 py-1.5 text-sm'
const btn = 'px-3 py-1.5 text-sm font-medium disabled:opacity-50'

function Card({ title, tone = 'slate', children }) {
  const tones = {
    slate: '',
    teal: 'border-teal-200 bg-teal-50',
    violet: 'border-t-4 border-t-violet-500',
  }
  return (
    <div className={`card p-5 ${tones[tone]}`}>
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  )
}

// Employee: approve or reject the technician's fix.
export function ClosurePanel({ ticket, onSubmit, busy }) {
  const [comment, setComment] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const resolution = [...ticket.history].reverse().find((h) => h.new_status === 'PENDING_APPROVAL')

  return (
    <Card title="Your technician marked this ticket as solved" tone="teal">
      {resolution?.note && <p className="text-sm text-stone-700">{resolution.note}</p>}
      <p className="mt-3 text-sm font-medium text-stone-800">Is the problem fixed?</p>
      {rejecting && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={400}
          placeholder="What is still not working?"
          className={textarea}
          aria-label="What is still not working"
        />
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!rejecting ? (
          <>
            <button onClick={() => onSubmit(true, '')} disabled={busy} className={`${btn} btn-solid bg-emerald-600 hover:bg-emerald-700`}>
              {busy ? 'Saving…' : 'Yes, close the ticket'}
            </button>
            <button onClick={() => setRejecting(true)} disabled={busy} className={`${btn} btn-solid bg-amber-500 hover:bg-amber-600`}>
              No, it is not fixed
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onSubmit(false, comment.trim())}
              disabled={busy || comment.trim().length < 3}
              className={`${btn} btn-solid bg-amber-500 hover:bg-amber-600`}
            >
              {busy ? 'Sending…' : 'Send back to technician'}
            </button>
            <button onClick={() => setRejecting(false)} className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900">
              Cancel
            </button>
          </>
        )}
      </div>
    </Card>
  )
}

// Technician (and admin): start work / mark solved with a resolution note.
export function TechnicianPanel({ ticket, onMove, busy }) {
  const [note, setNote] = useState('')
  if (ticket.status === 'ASSIGNED') {
    return (
      <Card title="Technician actions">
        <button onClick={() => onMove('IN_PROGRESS', 'Technician started work')} disabled={busy} className={`${btn} btn-solid bg-blue-600 hover:bg-blue-700`}>
          {busy ? 'Starting…' : 'Start work'}
        </button>
      </Card>
    )
  }
  if (ticket.status === 'IN_PROGRESS') {
    return (
      <Card title="Technician actions">
        <label className="block text-sm text-stone-700" htmlFor="resolution">
          Resolution note (shown to the employee, who approves the closure)
        </label>
        <textarea id="resolution" rows={2} maxLength={400} value={note} onChange={(e) => setNote(e.target.value)} className={textarea} />
        <button
          onClick={() => onMove('PENDING_APPROVAL', note.trim())}
          disabled={busy || note.trim().length < 3}
          className={`${btn} mt-3 btn-solid bg-teal-600 hover:bg-teal-700`}
        >
          {busy ? 'Saving…' : 'Mark solved'}
        </button>
      </Card>
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
    <Card title="Admin controls" tone="violet">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs text-stone-500">
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={`${select} mt-1 block`}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-stone-500">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${select} mt-1 block`}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => act('update', { priority, category })}
          disabled={busy || !changed}
          className={`${btn} btn-primary`}
        >
          Save
        </button>
      </div>

      {canReassign && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-200 pt-4">
          <label className="text-xs text-stone-500">
            Reassign to
            <select value={techId} onChange={(e) => setTechId(e.target.value)} className={`${select} mt-1 block`}>
              <option value="">Choose a technician…</option>
              {(techs.data || []).map((t) => (
                <option key={t.id} value={t.id} disabled={t.id === ticket.assignment?.technician?.id}>
                  {t.name} — {t.department.name} ({t.open_tickets} open)
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => act('reassign', { techId, note: reason })} disabled={busy || !techId} className={`${btn} btn-solid bg-orange-500 hover:bg-orange-600`}>
            Reassign
          </button>
        </div>
      )}

      {(canClose || canReopen) && (
        <div className="mt-4 border-t border-stone-200 pt-4">
          <label className="block text-xs text-stone-500" htmlFor="admin-reason">
            Reason (required to {canClose ? 'close' : 'reopen'}
            {canReassign && '; also used as the reassignment note'})
          </label>
          <textarea id="admin-reason" rows={2} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} className={textarea} />
          <div className="mt-2 flex flex-wrap gap-2">
            {canClose && (
              <button onClick={() => act('close', { note: reason })} disabled={busy || reason.trim().length < 3} className={`${btn} btn-solid bg-red-600 hover:bg-red-700`}>
                Force close
              </button>
            )}
            {canReopen && (
              <button onClick={() => act('reopen', { note: reason })} disabled={busy || reason.trim().length < 3} className={`${btn} btn-solid bg-blue-600 hover:bg-blue-700`}>
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
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
      className="mt-4 border-t border-stone-200 pt-4"
    >
      <label className="block text-sm font-medium text-stone-700" htmlFor="note">
        Add a note
      </label>
      <textarea id="note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className={textarea} />
      <button type="submit" disabled={busy || note.trim().length < 3} className={`${btn} mt-2 btn-primary`}>
        Add note
      </button>
    </form>
  )
}
