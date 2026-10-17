import { useState } from 'react'
import { Link } from 'react-router'
import { listTechnicians, listTickets, updateStatus } from '../api'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { Empty, ErrorBox, Loading } from '../components/States'
import { formatDate } from '../constants'
import { useAsync } from '../useAsync'

const STORAGE_KEY = 'helpdesk.technicianId'
const ACTIONS = {
  ASSIGNED: { to: 'IN_PROGRESS', label: 'Start work', note: 'Technician started work', cls: 'bg-blue-600 hover:bg-blue-500' },
  IN_PROGRESS: { to: 'CLOSED', label: 'Close ticket', note: 'Technician closed the ticket', cls: 'bg-slate-900 hover:bg-slate-700' },
}
const ORDER = { IN_PROGRESS: 0, ASSIGNED: 1, CLOSED: 2 }

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export default function TechnicianView() {
  const techs = useAsync(() => listTechnicians(), [])
  const [chosenId, setTechId] = useState(readStored)
  // Default to the first technician until one is chosen.
  const techId = chosenId || (techs.data?.length ? String(techs.data[0].id) : '')
  const tickets = useAsync(
    () => (techId ? listTickets({ technician_id: techId }) : Promise.resolve([])),
    [techId],
  )
  const [busyId, setBusyId] = useState(null)
  const [actionError, setActionError] = useState(null)

  function choose(e) {
    setTechId(e.target.value)
    try {
      localStorage.setItem(STORAGE_KEY, e.target.value)
    } catch {
      // storage unavailable (private mode); the choice just isn't remembered
    }
  }

  async function act(ticket) {
    const action = ACTIONS[ticket.status]
    setBusyId(ticket.id)
    setActionError(null)
    try {
      await updateStatus(ticket.id, action.to, action.note)
      tickets.reload()
      techs.reload()
    } catch (err) {
      setActionError(err)
    } finally {
      setBusyId(null)
    }
  }

  const me = techs.data?.find((t) => String(t.id) === techId)
  const sorted = [...(tickets.data || [])].sort(
    (a, b) => (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3) || b.id - a.id,
  )

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Technician view</h1>
          <p className="mt-1 text-sm text-slate-500">Escalated tickets assigned to you. Start work, then close them.</p>
        </div>
        {techs.data && (
          <label className="text-sm">
            <span className="mr-2 text-slate-500">Signed in as</span>
            <select value={techId} onChange={choose} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
              {techs.data.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.department.name} ({t.open_tickets} open)
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <ErrorBox error={techs.error || tickets.error} onRetry={techs.error ? techs.reload : tickets.reload} />
      <ErrorBox error={actionError} />
      {((techs.loading && !techs.data) || (tickets.loading && !tickets.data)) && <Loading />}

      {me && tickets.data && sorted.length === 0 && <Empty>No tickets are assigned to {me.name} yet.</Empty>}

      {sorted.length > 0 && (
        <ul className="space-y-3">
          {sorted.map((t) => {
            const action = ACTIONS[t.status]
            return (
              <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono">{t.ticket_code}</span>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <span>{t.category}</span>
                    </div>
                    <Link to={`/tickets/${t.id}`} className="mt-1 block break-words font-medium hover:underline">
                      {t.title}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {t.user_name} · assigned {formatDate(t.assignment.assigned_at)}
                    </p>
                    <p className="mt-1 text-xs text-orange-800">{t.assignment.rule_matched.split('; ')[0]}</p>
                  </div>
                  {action && (
                    <button
                      onClick={() => act(t)}
                      disabled={busyId === t.id}
                      className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 ${action.cls}`}
                    >
                      {busyId === t.id ? 'Updating…' : action.label}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
