import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpDown, Bot, ChevronRight, CircleCheck, Hourglass, Plus, Search, Ticket, Wrench, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { listTickets } from '../api'
import { useAuth } from '../auth'
import { CategoryTag, PriorityBadge, StatusBadge } from '../components/Badges'
import { Empty, ErrorBox, ListSkeleton } from '../components/States'
import { AnimatedNumber, PageHeader } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { CATEGORIES, PRIORITIES, STATUSES, STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const SORTS = {
  newest: { label: 'Newest first', fn: (a, b) => b.id - a.id },
  oldest: { label: 'Oldest first', fn: (a, b) => a.id - b.id },
  updated: { label: 'Recently updated', fn: (a, b) => new Date(b.updated_at) - new Date(a.updated_at) },
  priority: { label: 'Priority (high first)', fn: (a, b) => PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority) || b.id - a.id },
}
const FILTER_KEYS = ['status', 'category', 'priority', 'q']

const count = (list, ...statuses) => (list ? list.filter((t) => statuses.includes(t.status)).length : null)

const relative = (value) => {
  const minutes = Math.round((Date.now() - new Date(value)) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`
  if (minutes < 10080) return `${Math.round(minutes / 1440)}d ago`
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function StatCard({ label, value, Icon, tone }) {
  return (
    <motion.div variants={fadeUp} className="card p-4 sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="truncate text-[13px] font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl leading-none font-semibold tracking-tight tabular-nums text-slate-900 sm:text-[1.75rem]">
        {value === null ? '–' : <AnimatedNumber value={value} />}
      </p>
    </motion.div>
  )
}

export default function TicketList() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [params, setParams] = useSearchParams()
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']))
  const sort = SORTS[params.get('sort')] ? params.get('sort') : 'newest'
  const [query, setQuery] = useState(filters.q)

  const { data: tickets, error, loading, reload } = useAsync(
    () => listTickets({ status: filters.status, category: filters.category, priority: filters.priority, q: filters.q }),
    [filters.status, filters.category, filters.priority, filters.q],
  )
  const mine = useAsync(() => (isAdmin ? Promise.resolve(null) : listTickets({})), [isAdmin])

  function update(changes) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) {
          if (v) next.set(k, v)
          else next.delete(k)
        }
        return next
      },
      { replace: true },
    )
  }

  // Keep the box in step with ?q= set elsewhere (the top-bar search), and debounce typing.
  useEffect(() => setQuery((current) => (current.trim() === filters.q ? current : filters.q)), [filters.q])
  useEffect(() => {
    if (query.trim() === filters.q) return
    const timer = setTimeout(() => update({ q: query.trim() }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const sorted = useMemo(() => (tickets ? [...tickets].sort(SORTS[sort].fn) : null), [tickets, sort])
  const active = FILTER_KEYS.filter((k) => filters[k]).length

  return (
    <section>
      {isAdmin ? (
        <PageHeader title="All tickets" description="Every ticket in the help desk. Open one to follow up, reassign or close it." />
      ) : (
        <>
          <PageHeader
            eyebrow={<span>Welcome back, {user.name.trim().split(/\s+/)[0]}</span>}
            title="My tickets"
            description="Something not working? Describe it and you'll get troubleshooting steps from the knowledge base straight away."
            actions={
              <Link to="/new" className="btn btn-primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Raise a ticket
              </Link>
            }
          />
          <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Waiting on AI or you" value={count(mine.data, 'OPEN', 'SUGGESTION_PROVIDED')} Icon={Bot} tone="bg-violet-50 text-violet-600" />
            <StatCard label="With a technician" value={count(mine.data, 'ESCALATED', 'ASSIGNED', 'IN_PROGRESS')} Icon={Wrench} tone="bg-blue-50 text-blue-600" />
            <StatCard label="Needs your approval" value={count(mine.data, 'PENDING_APPROVAL')} Icon={Hourglass} tone="bg-teal-50 text-teal-600" />
            <StatCard label="Resolved" value={count(mine.data, 'RESOLVED', 'CLOSED')} Icon={CircleCheck} tone="bg-emerald-50 text-emerald-600" />
          </motion.div>
        </>
      )}

      {/* Toolbar */}
      <div className="card mb-4 p-3">
        <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center">
          <div className="relative col-span-2 md:min-w-56 md:flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder={isAdmin ? 'Search code, title or email' : 'Search your tickets'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field pl-9"
              aria-label="Search tickets"
            />
          </div>
          <select value={filters.status} onChange={(e) => update({ status: e.target.value })} className="field md:w-44" aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select value={filters.category} onChange={(e) => update({ category: e.target.value })} className="field md:w-40" aria-label="Filter by category">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select value={filters.priority} onChange={(e) => update({ priority: e.target.value })} className="field md:w-36" aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <div className="relative">
            <ArrowUpDown className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <select value={sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} className="field pl-8 md:w-48" aria-label="Sort tickets">
              {Object.entries(SORTS).map(([key, s]) => (
                <option key={key} value={key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-2.5 flex min-h-6 items-center justify-between gap-3 px-1 text-xs text-slate-500">
          <span aria-live="polite">{sorted ? `${sorted.length} ticket${sorted.length === 1 ? '' : 's'}` : 'Loading…'}</span>
          <AnimatePresence>
            {active > 0 && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setQuery('')
                  update({ status: '', category: '', priority: '', q: '' })
                }}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear {active} filter{active === 1 ? '' : 's'}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ErrorBox error={error} onRetry={reload} />
      {loading && !sorted && <ListSkeleton />}

      {sorted && sorted.length === 0 && (
        <Empty
          icon={Ticket}
          title={active ? 'No tickets match these filters' : 'No tickets yet'}
          action={
            active ? null : (
              !isAdmin && (
                <Link to="/new" className="btn btn-primary">
                  <Plus className="h-4 w-4" aria-hidden="true" /> Raise a ticket
                </Link>
              )
            )
          }
        >
          {active ? 'Try a different search or clear the filters.' : isAdmin ? 'Tickets raised by employees appear here.' : 'When something stops working, raise a ticket and the AI will suggest a fix.'}
        </Empty>
      )}

      {sorted && sorted.length > 0 && (
        <div className={`card overflow-hidden transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div
            className={`hidden border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[11px] font-medium tracking-wide text-slate-500 uppercase md:grid ${
              isAdmin ? 'md:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem] xl:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem_10rem]' : 'md:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem] xl:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem_7rem]'
            }`}
            aria-hidden="true"
          >
            <span>Ticket</span>
            <span>Category</span>
            <span>Priority</span>
            <span>Status</span>
            <span className="hidden xl:block">{isAdmin ? 'Assigned to' : 'Updated'}</span>
          </div>
          <motion.ul variants={stagger(0.025)} initial="hidden" animate="show" className="divide-y divide-slate-100">
            {sorted.map((t, i) => (
              <motion.li key={t.id} variants={i < 20 ? fadeUp : undefined} layout="position" transition={{ duration: 0.25, ease: EASE }}>
                <Link
                  to={`/tickets/${t.id}`}
                  className={`group relative flex flex-col gap-2.5 px-4 py-3.5 transition-colors hover:bg-slate-50/80 focus-visible:-outline-offset-2 sm:px-5 md:grid md:items-center md:gap-4 ${
                    isAdmin ? 'md:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem] xl:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem_10rem]' : 'md:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem] xl:grid-cols-[minmax(0,1fr)_8.5rem_6rem_10rem_7rem]'
                  }`}
                >
                  <span className="absolute inset-y-0 left-0 w-0.5 bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                  <span className="flex min-w-0 items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-400">{t.ticket_code}</span>
                        <span className="text-[11px] text-slate-400 md:hidden">· {relative(t.created_at)}</span>
                      </span>
                      <span className="mt-0.5 block font-medium text-slate-900 group-hover:text-brand-700 md:truncate">{t.title}</span>
                      {isAdmin && <span className="mt-0.5 block truncate text-xs text-slate-500">{t.user_name}</span>}
                    </span>
                    <span className="shrink-0 md:hidden">
                      <StatusBadge status={t.status} />
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5 md:contents">
                    <span>
                      <CategoryTag category={t.category} />
                    </span>
                    <span>
                      <PriorityBadge priority={t.priority} />
                    </span>
                    <span className="hidden md:block">
                      <StatusBadge status={t.status} />
                    </span>
                    <span className="hidden min-w-0 items-center justify-between gap-2 text-xs text-slate-500 xl:flex">
                      <span className="truncate" title={isAdmin ? undefined : formatDate(t.updated_at)}>
                        {isAdmin ? (t.assignment ? (t.assignment.technician?.name ?? t.assignment.department.name) : '—') : relative(t.updated_at)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      )}
    </section>
  )
}
