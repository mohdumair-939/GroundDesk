import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listTickets } from '../api'
import { useAuth } from '../auth'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { Empty, ErrorBox, Loading } from '../components/States'
import { CATEGORIES, STATUSES, STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const selectClass = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'

export default function TicketList() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', category: '', q: '' })
  const { data: tickets, error, loading, reload } = useAsync(
    () => listTickets(filters),
    [filters.status, filters.category, filters.q],
  )
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{isAdmin ? 'All tickets' : 'My tickets'}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? 'Every ticket in the help desk. Open one to follow up, reassign or close it.' : 'Tickets you have raised and their current status.'}
          </p>
        </div>
        {!isAdmin && (
          <Link to="/new" className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700">
            + New ticket
          </Link>
        )}
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
          No tickets found.{' '}
          {!isAdmin && (
            <Link to="/new" className="font-medium text-slate-900 underline">
              Raise one
            </Link>
          )}
        </Empty>
      )}

      {tickets && tickets.length > 0 && (
        <ul className={`divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white ${loading ? 'opacity-60' : ''}`}>
          {tickets.map((t) => (
            <li key={t.id}>
              <Link to={`/tickets/${t.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4">
                <span className="w-20 shrink-0 font-mono text-xs text-slate-500">{t.ticket_code}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{t.title}</span>
                  {isAdmin && (
                    <span className="block truncate text-xs text-slate-500">
                      {t.user_name}
                      {t.assignment && ` → ${t.assignment.technician?.name ?? t.assignment.department.name}`}
                    </span>
                  )}
                </span>
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
