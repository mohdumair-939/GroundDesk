import { useState } from 'react'
import { Link } from 'react-router'
import { listTickets } from '../api'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { Empty, ErrorBox, Loading } from '../components/States'
import { CATEGORIES, STATUSES, STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const selectClass = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'

export default function TicketList() {
  const [filters, setFilters] = useState({ status: '', category: '', q: '' })
  const { data: tickets, error, loading, reload } = useAsync(
    () => listTickets(filters),
    [filters.status, filters.category, filters.q],
  )
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-xl font-semibold">Tickets</h1>
        <Link to="/new" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
          + New ticket
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search code, title, email"
          value={filters.q}
          onChange={set('q')}
          className={`${selectClass} min-w-0 flex-1 sm:max-w-xs`}
          aria-label="Search tickets"
        />
        <select value={filters.status} onChange={set('status')} className={selectClass} aria-label="Status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={filters.category} onChange={set('category')} className={selectClass} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !tickets && <Loading />}

      {tickets && tickets.length === 0 && (
        <Empty>
          No tickets found. <Link to="/new" className="font-medium text-slate-900 underline">Raise one</Link>.
        </Empty>
      )}

      {tickets && tickets.length > 0 && (
        <ul className={`divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white ${loading ? 'opacity-60' : ''}`}>
          {tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/tickets/${t.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{t.ticket_code}</span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
                <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{t.category}</span>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                  <span className="hidden md:inline">{formatDate(t.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
