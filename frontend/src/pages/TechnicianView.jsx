import { useState } from 'react'
import { Link } from 'react-router'
import { listTickets, updateStatus } from '../api'
import { useAuth } from '../auth'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { Empty, ErrorBox, Loading } from '../components/States'
import { formatDate } from '../constants'
import { useAsync } from '../useAsync'

const GROUPS = [
  { status: 'ASSIGNED', title: 'To do', hint: 'New tickets routed to you.' },
  { status: 'IN_PROGRESS', title: 'In progress', hint: 'Mark solved when fixed; the employee then approves the closure.' },
  { status: 'PENDING_APPROVAL', title: 'Waiting for employee approval', hint: 'Closed once the employee confirms the fix.' },
  { status: 'CLOSED', title: 'Closed', hint: '' },
]

function SolveForm({ onSubmit, onCancel, busy }) {
  const [note, setNote] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(note.trim())
      }}
      className="mt-3 border-t border-slate-100 pt-3"
    >
      <label className="block text-sm font-medium text-slate-700" htmlFor="resolution">
        What did you do to fix it?
      </label>
      <textarea
        id="resolution"
        required
        minLength={3}
        maxLength={400}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        placeholder="e.g. Replaced the faulty fan and tested under load"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || note.trim().length < 3}
          className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Mark solved'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
          Cancel
        </button>
      </div>
    </form>
  )
}

function TicketCard({ ticket, busy, solving, onStart, onSolveOpen, onSolve, onSolveCancel }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{ticket.ticket_code}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span>{ticket.category}</span>
          </div>
          <Link to={`/tickets/${ticket.id}`} className="mt-1 block break-words font-medium hover:underline">
            {ticket.title}
          </Link>
          <p className="mt-1 text-xs text-slate-500">
            Raised by {ticket.user_name} · assigned {formatDate(ticket.assignment.assigned_at)}
          </p>
          <p className="mt-1 text-xs text-orange-800">{ticket.assignment.rule_matched.split('; ')[0]}</p>
        </div>
        {ticket.status === 'ASSIGNED' && (
          <button
            onClick={onStart}
            disabled={busy}
            className="shrink-0 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {busy ? 'Starting…' : 'Start work'}
          </button>
        )}
        {ticket.status === 'IN_PROGRESS' && !solving && (
          <button
            onClick={onSolveOpen}
            className="shrink-0 rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-500"
          >
            Mark solved…
          </button>
        )}
      </div>
      {solving && <SolveForm onSubmit={onSolve} onCancel={onSolveCancel} busy={busy} />}
    </li>
  )
}

export default function TechnicianView() {
  const { user } = useAuth()
  const tickets = useAsync(() => listTickets(), [])
  const [busyId, setBusyId] = useState(null)
  const [solvingId, setSolvingId] = useState(null)
  const [actionError, setActionError] = useState(null)

  async function move(ticket, status, note) {
    setBusyId(ticket.id)
    setActionError(null)
    try {
      await updateStatus(ticket.id, status, note)
      setSolvingId(null)
      tickets.reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusyId(null)
    }
  }

  const all = tickets.data || []
  const openCount = all.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS').length

  return (
    <section>
      <div className="mb-5">
        <h1 className="text-xl font-semibold">My queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user.name} · {tickets.data ? `${openCount} ticket${openCount === 1 ? '' : 's'} to work on` : 'loading…'}
        </p>
      </div>

      <ErrorBox error={tickets.error} onRetry={tickets.reload} />
      <ErrorBox error={actionError} />
      {tickets.loading && !tickets.data && <Loading />}
      {tickets.data && all.length === 0 && <Empty>No tickets are assigned to you yet.</Empty>}

      {all.length > 0 &&
        GROUPS.map((group) => {
          const items = all.filter((t) => t.status === group.status)
          if (!items.length) return null
          return (
            <div key={group.status} className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {group.title} <span className="font-normal">({items.length})</span>
              </h2>
              {group.hint && <p className="mb-2 text-xs text-slate-400">{group.hint}</p>}
              <ul className="space-y-3">
                {items.map((t) => (
                  <TicketCard
                    key={t.id}
                    ticket={t}
                    busy={busyId === t.id}
                    solving={solvingId === t.id}
                    onStart={() => move(t, 'IN_PROGRESS', 'Technician started work')}
                    onSolveOpen={() => setSolvingId(t.id)}
                    onSolve={(note) => move(t, 'PENDING_APPROVAL', note)}
                    onSolveCancel={() => setSolvingId(null)}
                  />
                ))}
              </ul>
            </div>
          )
        })}
    </section>
  )
}
