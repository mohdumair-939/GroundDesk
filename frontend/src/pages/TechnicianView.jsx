import { useState } from 'react'
import { Link } from 'react-router'
import { listTickets, updateStatus } from '../api'
import { CategoryTag, PriorityBadge, StatusBadge } from '../components/Badges'
import { STATUS_COLORS } from '../colors'
import Hero from '../components/Hero'
import { Empty, ErrorBox, Loading } from '../components/States'
import { formatDate } from '../constants'
import { useAsync } from '../useAsync'

const GROUPS = [
  { status: 'ASSIGNED', tone: 'orange', dot: 'bg-orange-500', title: 'To do', hint: 'New tickets routed to you.' },
  { status: 'IN_PROGRESS', tone: 'blue', dot: 'bg-blue-500', title: 'In progress', hint: 'Mark solved when fixed; the employee then approves the closure.' },
  { status: 'PENDING_APPROVAL', tone: 'teal', dot: 'bg-teal-500', title: 'Awaiting approval', hint: 'Closed once the employee confirms the fix.' },
  { status: 'CLOSED', tone: 'emerald', dot: 'bg-stone-400', title: 'Closed', hint: '' },
]

function SolveForm({ onSubmit, onCancel, busy }) {
  const [note, setNote] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(note.trim())
      }}
      className="mt-3 border-t border-stone-200 pt-3"
    >
      <label className="block text-sm font-medium text-stone-700" htmlFor="resolution">
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
        className="mt-1 block w-full field px-3 py-2 text-sm"
        placeholder="e.g. Replaced the faulty fan and tested under load"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy || note.trim().length < 3}
          className="btn-solid bg-teal-600 px-3 py-1.5 hover:bg-teal-700 text-sm font-medium disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Mark solved'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900">
          Cancel
        </button>
      </div>
    </form>
  )
}

function TicketCard({ ticket, busy, solving, onStart, onSolveOpen, onSolve, onSolveCancel }) {
  return (
    <li className={`card border-l-4 p-4 transition-shadow hover:shadow-md ${STATUS_COLORS[ticket.status].edge}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
            <span className="font-mono text-stone-500">{ticket.ticket_code}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <CategoryTag category={ticket.category} />
          </div>
          <Link to={`/tickets/${ticket.id}`} className="mt-1 block break-words font-medium text-stone-900 hover:text-brand-700">
            {ticket.title}
          </Link>
          <p className="mt-1 text-xs text-stone-500">
            Raised by {ticket.user_name} · assigned {formatDate(ticket.assignment.assigned_at)}
          </p>
          <p className="mt-1 text-xs text-stone-500">{ticket.assignment.rule_matched.split('; ')[0]}</p>
        </div>
        {ticket.status === 'ASSIGNED' && (
          <button
            onClick={onStart}
            disabled={busy}
            className="btn-solid shrink-0 bg-blue-600 px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? 'Starting…' : 'Start work'}
          </button>
        )}
        {ticket.status === 'IN_PROGRESS' && !solving && (
          <button
            onClick={onSolveOpen}
            className="btn-solid shrink-0 bg-teal-600 px-3 py-1.5 text-sm font-medium hover:bg-teal-700"
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
      <Hero
        subtitle={
          tickets.data
            ? openCount
              ? `You have ${openCount} ticket${openCount === 1 ? '' : 's'} to work on. Start with the oldest.`
              : 'Your queue is clear. Nice work.'
            : 'Loading your queue…'
        }
        stats={GROUPS.map((g) => ({
          label: g.title,
          value: tickets.data ? all.filter((t) => t.status === g.status).length : null,
          tone: g.tone,
        }))}
      />

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
              <h2 className="eyebrow flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${group.dot}`} aria-hidden="true" />
                {group.title}
                <span className="font-mono text-stone-400 normal-case">
                  {items.length}
                </span>
              </h2>
              {group.hint && <p className="mb-2 text-xs text-stone-400">{group.hint}</p>}
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
