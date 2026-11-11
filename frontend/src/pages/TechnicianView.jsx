import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowRight, ChevronDown, CircleCheck, Flame, Inbox, ListTodo, Play, RefreshCw, Route } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { listTickets, updateStatus } from '../api'
import { useAuth } from '../auth'
import { CategoryTag, PriorityBadge } from '../components/Badges'
import Modal from '../components/Modal'
import SolveForm from '../components/SolveForm'
import { Empty, ErrorBox } from '../components/States'
import { useToast } from '../components/Toast'
import { AnimatedNumber, PageHeader, SegmentBar, Skeleton, Spinner } from '../components/ui'
import { EASE } from '../motion'
import { STATUS_COLORS } from '../colors'
import { formatDate } from '../constants'
import { useAsync } from '../useAsync'

const STAGES = [
  { status: 'ASSIGNED', title: 'To do', hint: 'New tickets routed to you.' },
  { status: 'IN_PROGRESS', title: 'In progress', hint: 'Mark solved when fixed; the employee then approves the closure.' },
  { status: 'PENDING_APPROVAL', title: 'Awaiting approval', hint: 'Closed once the employee confirms the fix.' },
  { status: 'CLOSED', title: 'Closed', hint: '' },
]

function TicketCard({ ticket, busy, onStart, onSolve }) {
  return (
    <motion.li
      layoutId={`ticket-${ticket.id}`}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="card card-interactive group relative overflow-hidden p-4"
    >
      <span className="absolute inset-y-0 left-0 w-[3px]" style={{ background: STATUS_COLORS[ticket.status].hex }} aria-hidden="true" />
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-slate-400">{ticket.ticket_code}</span>
        <PriorityBadge priority={ticket.priority} />
      </div>
      <Link to={`/tickets/${ticket.id}`} className="mt-1.5 block text-sm leading-snug font-medium break-words text-slate-900 after:absolute after:inset-0 hover:text-brand-700">
        {ticket.title}
      </Link>
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <CategoryTag category={ticket.category} />
      </div>
      <p className="mt-2.5 text-xs text-slate-500">
        {ticket.user_name} · assigned {formatDate(ticket.assignment.assigned_at)}
      </p>
      <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
        <Route className="mt-px h-3 w-3 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="line-clamp-2">{ticket.assignment.rule_matched.split('; ')[0]}</span>
      </p>
      {(ticket.status === 'ASSIGNED' || ticket.status === 'IN_PROGRESS') && (
        <div className="relative z-10 mt-3.5 border-t border-slate-100 pt-3">
          {ticket.status === 'ASSIGNED' ? (
            <button onClick={onStart} disabled={busy} className="btn btn-primary btn-sm w-full">
              {busy ? <Spinner className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" aria-hidden="true" />}
              {busy ? 'Starting…' : 'Start work'}
            </button>
          ) : (
            <button onClick={onSolve} className="btn btn-success btn-sm w-full">
              <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark solved…
            </button>
          )}
        </div>
      )}
    </motion.li>
  )
}

function BoardSkeleton() {
  return (
    <div role="status" aria-label="Loading your queue" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-xl bg-slate-100/70 p-3">
          <Skeleton className="h-4 w-24" />
          <div className="card space-y-3 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TechnicianView() {
  const { user } = useAuth()
  const toast = useToast()
  const tickets = useAsync(() => listTickets(), [])
  const [busyId, setBusyId] = useState(null)
  const [solving, setSolving] = useState(null) // the ticket being marked solved
  const [actionError, setActionError] = useState(null)
  const [showClosed, setShowClosed] = useState(false)

  async function move(ticket, status, note, kbArticle) {
    setBusyId(ticket.id)
    setActionError(null)
    try {
      await updateStatus(ticket.id, status, note, kbArticle)
      setSolving(null)
      tickets.reload()
      toast(
        status === 'IN_PROGRESS'
          ? { title: `Started ${ticket.ticket_code}`, description: 'Moved to In progress.' }
          : { title: `${ticket.ticket_code} marked as solved`, description: 'Waiting for the employee to approve the closure.' },
      )
    } catch (err) {
      setActionError(err)
      toast({ type: 'error', title: 'That did not go through', description: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const all = tickets.data || []
  const by = (status) => all.filter((t) => t.status === status)
  const active = all.filter((t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS')
  const urgent = active.filter((t) => t.priority === 'High').length
  const closed = by('CLOSED')

  return (
    <section>
      <PageHeader
        eyebrow={<span>Technician workspace</span>}
        title={`Hi ${user.name.trim().split(/\s+/)[0]}, here's your queue`}
        description={
          tickets.data
            ? active.length
              ? `You have ${active.length} ticket${active.length === 1 ? '' : 's'} to work on. Start with the oldest.`
              : 'Your queue is clear. Nice work.'
            : 'Loading your queue…'
        }
        actions={
          <button onClick={tickets.reload} className="btn btn-secondary">
            <RefreshCw className={`h-4 w-4 ${tickets.loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        }
      />

      {/* Workload and pipeline */}
      <div className="card mb-6 p-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-center">
          <div className="flex items-center gap-4 lg:border-r lg:border-slate-100 lg:pr-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600" aria-hidden="true">
              <ListTodo className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[13px] font-medium text-slate-500">Active workload</p>
              <p className="text-2xl leading-tight font-semibold tabular-nums text-slate-900">
                {tickets.data ? <AnimatedNumber value={active.length} /> : '–'}
                <span className="ml-1 text-sm font-normal text-slate-500">open</span>
              </p>
              {urgent > 0 && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-red-600">
                  <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {urgent} high priority
                </p>
              )}
            </div>
          </div>
          <div>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAGES.map((s, i) => (
                <li key={s.status} className="relative flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-slate-100">
                    <p className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_COLORS[s.status].hex }} aria-hidden="true" />
                      {s.title}
                    </p>
                    <p className="mt-1 text-xl leading-none font-semibold tabular-nums text-slate-900">{tickets.data ? <AnimatedNumber value={by(s.status).length} /> : '–'}</p>
                  </div>
                  {i < STAGES.length - 1 && <ArrowRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" aria-hidden="true" />}
                </li>
              ))}
            </ol>
            <SegmentBar
              className="mt-4 h-1.5"
              segments={STAGES.map((s) => ({ label: s.title, value: tickets.data ? by(s.status).length : 0, color: STATUS_COLORS[s.status].hex }))}
            />
          </div>
        </div>
      </div>

      {tickets.error && (
        <div className="mb-4">
          <ErrorBox error={tickets.error} onRetry={tickets.reload} />
        </div>
      )}
      {actionError && (
        <div className="mb-4">
          <ErrorBox error={actionError} />
        </div>
      )}
      {tickets.loading && !tickets.data && <BoardSkeleton />}
      {tickets.data && all.length === 0 && (
        <Empty icon={Inbox} title="No tickets assigned yet">
          Escalated tickets routed to you will appear here.
        </Empty>
      )}

      {all.length > 0 && (
        <LayoutGroup>
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
            {STAGES.slice(0, 3).map((stage) => {
              const items = by(stage.status)
              return (
                <section key={stage.status} className="rounded-xl bg-slate-100/60 p-3 ring-1 ring-slate-200/60" aria-labelledby={`col-${stage.status}`}>
                  <div className="mb-3 px-1">
                    <h2 id={`col-${stage.status}`} className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[stage.status].hex }} aria-hidden="true" />
                      {stage.title}
                      <span className="rounded-full bg-white px-1.5 text-xs font-medium tabular-nums text-slate-500 ring-1 ring-slate-200">{items.length}</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">{stage.hint}</p>
                  </div>
                  <ul className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {items.map((t) => (
                        <TicketCard key={t.id} ticket={t} busy={busyId === t.id} onStart={() => move(t, 'IN_PROGRESS', 'Technician started work')} onSolve={() => setSolving(t)} />
                      ))}
                    </AnimatePresence>
                    {items.length === 0 && <li className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">Nothing here</li>}
                  </ul>
                </section>
              )
            })}
          </div>
        </LayoutGroup>
      )}

      {closed.length > 0 && (
        <section className="card mt-6 overflow-hidden">
          <button
            onClick={() => setShowClosed((s) => !s)}
            className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
            aria-expanded={showClosed}
            aria-controls="closed-list"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CircleCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              Closed
              <span className="rounded-full bg-slate-100 px-1.5 text-xs font-medium tabular-nums text-slate-500">{closed.length}</span>
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showClosed ? 'rotate-180' : ''}`} aria-hidden="true" />
          </button>
          <AnimatePresence initial={false}>
            {showClosed && (
              <motion.ul
                id="closed-list"
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="divide-y divide-slate-100 overflow-hidden border-t border-slate-100"
              >
                {closed.map((t) => (
                  <li key={t.id}>
                    <Link to={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-slate-50">
                      <span className="w-16 shrink-0 font-mono text-xs text-slate-400">{t.ticket_code}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{t.title}</span>
                      <span className="hidden sm:block">
                        <CategoryTag category={t.category} />
                      </span>
                    </Link>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </section>
      )}

      <Modal open={!!solving} onClose={() => setSolving(null)} title={solving ? `Mark ${solving.ticket_code} as solved` : ''} description={solving?.title}>
        {solving && (
          <SolveForm
            ticket={solving}
            busy={busyId === solving.id}
            onCancel={() => setSolving(null)}
            onSubmit={(note, kbArticle) => move(solving, 'PENDING_APPROVAL', note, kbArticle)}
          />
        )}
      </Modal>
    </section>
  )
}
