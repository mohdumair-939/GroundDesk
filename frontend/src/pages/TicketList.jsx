import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listTickets } from '../api'
import { useAuth } from '../auth'
import { CategoryTag, PriorityBadge, StatusBadge } from '../components/Badges'
import { STATUS_COLORS } from '../colors'
import Hero, { heroButton } from '../components/Hero'
import { Empty, ErrorBox, Loading } from '../components/States'
import { CATEGORIES, STATUSES, STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const count = (list, ...statuses) => (list ? list.filter((t) => statuses.includes(t.status)).length : null)

const selectClass = 'field px-2.5 py-1.5 text-sm'

export default function TicketList() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState({ status: searchParams.get('status') || '', category: '', q: '' })
  const { data: tickets, error, loading, reload } = useAsync(
    () => listTickets(filters),
    [filters.status, filters.category, filters.q],
  )
  const mine = useAsync(() => (isAdmin ? Promise.resolve(null) : listTickets({})), [isAdmin])
  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section>
      {isAdmin ? (
        <div className="mb-4">
          <h1 className="page-title">All tickets</h1>
          <p className="mt-1 text-sm text-stone-500">Every ticket in the help desk. Open one to follow up, reassign or close it.</p>
        </div>
      ) : (
        <>
          <Hero
            subtitle="Something not working? Describe it and you'll get troubleshooting steps from the knowledge base straight away."
            action={
              <Link to="/new" className={heroButton}>
                <span aria-hidden="true">+</span> Raise a ticket
              </Link>
            }
            stats={[
              { label: 'Waiting on AI or you', value: count(mine.data, 'OPEN', 'SUGGESTION_PROVIDED'), tone: 'violet' },
              { label: 'With a technician', value: count(mine.data, 'ESCALATED', 'ASSIGNED', 'IN_PROGRESS'), tone: 'blue' },
              { label: 'Needs your approval', value: count(mine.data, 'PENDING_APPROVAL'), tone: 'teal' },
              { label: 'Resolved', value: count(mine.data, 'RESOLVED', 'CLOSED'), tone: 'emerald' },
            ]}
          />
          <h2 className="mb-3 text-base font-semibold text-stone-900">My tickets</h2>
        </>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <input
          type="search"
          placeholder={isAdmin ? 'Search code, title, email' : 'Search your tickets'}
          value={filters.q}
          onChange={set('q')}
          className={`${selectClass} col-span-2 min-w-0 py-2 sm:max-w-xs sm:flex-1 sm:py-1.5`}
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
        {tickets && (
          <p className="col-span-2 text-xs text-stone-500 sm:ml-auto" aria-live="polite">
            {tickets.length} ticket{tickets.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !tickets && <Loading />}

      {tickets && tickets.length === 0 && (
        <Empty>
          No tickets found.{' '}
          {!isAdmin && (
            <Link to="/new" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700">
              Raise one
            </Link>
          )}
        </Empty>
      )}

      {tickets && tickets.length > 0 && (
        <ul className={`divide-y divide-stone-200 overflow-hidden card ${loading ? 'opacity-60' : ''}`}>
          {tickets.map((t) => (
            <li key={t.id} className={`border-l-4 ${STATUS_COLORS[t.status].edge}`}>
              <Link
                to={`/tickets/${t.id}`}
                className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-stone-50 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
              >
                <span className="flex items-center justify-between gap-3 sm:contents">
                  <span className="shrink-0 font-mono text-xs text-stone-500 sm:w-20">{t.ticket_code}</span>
                  <span className="sm:hidden">
                    <StatusBadge status={t.status} />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-stone-900 group-hover:text-brand-800 sm:truncate">{t.title}</span>
                  {isAdmin && (
                    <span className="block truncate text-xs text-stone-500">
                      {t.user_name}
                      {t.assignment && ` → ${t.assignment.technician?.name ?? t.assignment.department.name}`}
                    </span>
                  )}
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-stone-500">
                  <CategoryTag category={t.category} />
                  <PriorityBadge priority={t.priority} />
                  <span className="hidden sm:inline-flex">
                    <StatusBadge status={t.status} />
                  </span>
                  <span className="sm:hidden lg:inline">{formatDate(t.created_at)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
