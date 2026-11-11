import { motion } from 'motion/react'
import { ArrowLeft, CircleCheck, CircleX, Clock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { addNote, adminUpdateTicket, getTicket, reassignTicket, reopenTicket, requestSuggestion, sendClosure, sendFeedback, updateStatus } from '../api'
import { useAuth } from '../auth'
import AssignmentPanel from '../components/AssignmentPanel'
import { CategoryTag, PriorityBadge, StatusBadge } from '../components/Badges'
import FeedbackPanel from '../components/FeedbackPanel'
import KbArticleStatus from '../components/KbArticleStatus'
import StatusProgress from '../components/StatusProgress'
import { ErrorBox } from '../components/States'
import SuggestionCard, { SuggestionPending } from '../components/SuggestionCard'
import { AdminPanel, ClosurePanel, NoteForm, TechnicianPanel } from '../components/TicketActions'
import Timeline from '../components/Timeline'
import { useToast } from '../components/Toast'
import { Avatar, Skeleton } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const POLL_MS = 2000
const POLL_LIMIT = 20 // ~40 s before offering a manual retry

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Loading ticket" className="space-y-5">
      <Skeleton className="h-4 w-24" />
      <div className="card space-y-4 p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="mt-4 h-8 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="card h-64 p-5">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="card h-48 p-5">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  )
}

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const { data: ticket, error, loading, reload, setData } = useAsync(() => getTicket(id), [id])
  const [actionError, setActionError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [polls, setPolls] = useState(0)
  const [retrying, setRetrying] = useState(false)

  // The suggestion is generated in the background after creation; poll until it appears.
  const waiting = ticket && ticket.status === 'OPEN' && !ticket.suggestion
  useEffect(() => {
    if (!waiting || polls >= POLL_LIMIT) return
    const timer = setTimeout(() => {
      getTicket(id)
        .then(setData)
        .catch(() => {})
        .finally(() => setPolls((n) => n + 1))
    }, POLL_MS)
    return () => clearTimeout(timer)
  }, [waiting, polls, id, setData])

  // Runs an action that returns the updated ticket; returns true on success.
  async function run(action, success) {
    setBusy(true)
    setActionError(null)
    try {
      const updated = await action()
      setData(updated)
      const title = typeof success === 'function' ? success(updated) : success
      if (title) toast({ title, description: `${updated.ticket_code} is now ${STATUS_LABELS[updated.status].toLowerCase()}.` })
      return true
    } catch (err) {
      setActionError(err)
      toast({ type: 'error', title: 'That did not go through', description: err.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function retrySuggestion() {
    setRetrying(true)
    setActionError(null)
    try {
      setData(await requestSuggestion(id))
    } catch (err) {
      // 409 means the background run finished meanwhile; just refresh.
      if (err.status === 409) setData(await getTicket(id))
      else setActionError(err)
    } finally {
      setRetrying(false)
    }
  }

  const adminAct = (kind, args) =>
    run(
      () => {
        if (kind === 'update') return adminUpdateTicket(id, args)
        if (kind === 'reassign') return reassignTicket(id, args.techId, args.note)
        if (kind === 'close') return updateStatus(id, 'CLOSED', args.note)
        return reopenTicket(id, args.note)
      },
      { update: 'Ticket updated', reassign: 'Ticket reassigned', close: 'Ticket closed', reopen: 'Ticket reopened' }[kind],
    )

  if (loading && !ticket) return <DetailSkeleton />
  if (error && !ticket) return <ErrorBox error={error} onRetry={reload} />

  const isOwner = user.role === 'employee'
  const isTech = user.role === 'technician'
  const isAdmin = user.role === 'admin'
  const feedback = ticket.suggestion?.feedback_resolved

  return (
    <section>
      <Link to={isAdmin ? '/tickets' : '/'} className="btn btn-ghost btn-sm -ml-2.5 mb-3 text-slate-500">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isAdmin ? 'All tickets' : isTech ? 'My queue' : 'My tickets'}
      </Link>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="card overflow-hidden">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">{ticket.ticket_code}</span>
            <motion.span key={ticket.status} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
              <StatusBadge status={ticket.status} />
            </motion.span>
            <PriorityBadge priority={ticket.priority} />
            <CategoryTag category={ticket.category} />
          </div>
          <h1 className="mt-3 text-xl leading-snug font-semibold tracking-tight break-words text-slate-900 sm:text-2xl">{ticket.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-600">{ticket.description}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={ticket.user_name} role="employee" className="h-5 w-5 text-[9px]" />
              {ticket.user_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {formatDate(ticket.created_at)}
            </span>
          </p>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-7">
          <StatusProgress ticket={ticket} />
        </div>
      </motion.div>

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <motion.div variants={stagger(0.07, 0.1)} initial="hidden" animate="show" className="min-w-0 space-y-5">
          {actionError && <ErrorBox error={actionError} />}

          {isOwner && ticket.status === 'PENDING_APPROVAL' && (
            <motion.div variants={fadeUp}>
              <ClosurePanel
                ticket={ticket}
                busy={busy}
                onSubmit={(approved, comment) => run(() => sendClosure(id, approved, comment), approved ? 'Thanks — ticket closed' : 'Sent back to your technician')}
              />
            </motion.div>
          )}
          {(isTech || isAdmin) && ['ASSIGNED', 'IN_PROGRESS'].includes(ticket.status) && (
            <motion.div variants={fadeUp}>
              <TechnicianPanel
                ticket={ticket}
                busy={busy}
                onMove={(status, note, kbArticle) =>
                  run(() => updateStatus(id, status, note, kbArticle), status === 'IN_PROGRESS' ? 'Work started' : 'Marked as solved')
                }
              />
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            {ticket.suggestion ? (
              <SuggestionCard suggestion={ticket.suggestion}>
                {isOwner && ticket.status === 'SUGGESTION_PROVIDED' && (
                  <FeedbackPanel
                    answered={ticket.suggestion.answered}
                    busy={busy}
                    onSubmit={(resolved, comment) =>
                      run(() => sendFeedback(id, resolved, comment), resolved ? 'Glad that fixed it' : 'Escalated to a technician')
                    }
                  />
                )}
                {feedback !== null && feedback !== undefined && (
                  <div
                    className={`mt-5 flex gap-3 rounded-lg p-3 text-sm ${feedback ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}
                  >
                    {feedback ? (
                      <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    ) : (
                      <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                    )}
                    <div>
                      <p className="font-medium">
                        {feedback ? 'The employee confirmed this suggestion fixed the issue.' : 'The employee reported this did not fix the issue, so the ticket was escalated.'}
                      </p>
                      {ticket.suggestion.feedback_comment && <p className="mt-1 italic opacity-80">“{ticket.suggestion.feedback_comment}”</p>}
                    </div>
                  </div>
                )}
              </SuggestionCard>
            ) : (
              ticket.status === 'OPEN' &&
              (isOwner || isAdmin) && (
                <SuggestionPending failed={polls >= POLL_LIMIT} onRetry={retrySuggestion} retrying={retrying}>
                  {isOwner && polls >= POLL_LIMIT && (
                    <FeedbackPanel answered={false} busy={busy} onSubmit={(resolved, comment) => run(() => sendFeedback(id, resolved, comment), 'Escalated to a technician')} />
                  )}
                </SuggestionPending>
              )
            )}
          </motion.div>

          {isAdmin && (
            <motion.div variants={fadeUp}>
              <AdminPanel key={`${ticket.priority}-${ticket.category}-${ticket.status}`} ticket={ticket} act={adminAct} busy={busy} />
            </motion.div>
          )}

          {(isTech || isAdmin) && ticket.kb_article && (
            <motion.div variants={fadeUp}>
              <KbArticleStatus article={ticket.kb_article} isAdmin={isAdmin} />
            </motion.div>
          )}

          <motion.section variants={fadeUp} className="card p-5 sm:p-6">
            <h2 className="section-title mb-5">Activity</h2>
            <Timeline history={ticket.history} />
            {/* While the employee owes an approval, their comment goes with the decision above,
                so a plain note cannot be mistaken for closing the ticket. */}
            {!(isOwner && ticket.status === 'PENDING_APPROVAL') && (
              <NoteForm busy={busy} onSubmit={(note) => run(() => addNote(id, note), 'Note added')} />
            )}
          </motion.section>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.15 }}
          className="space-y-5 lg:sticky lg:top-24"
        >
          <Details ticket={ticket} />
          {ticket.assignment && <AssignmentPanel assignment={ticket.assignment} />}
        </motion.aside>
      </div>
    </section>
  )
}

function Details({ ticket }) {
  const rows = [
    ['Status', <StatusBadge key="s" status={ticket.status} />],
    ['Priority', <PriorityBadge key="p" priority={ticket.priority} />],
    ['Category', <CategoryTag key="c" category={ticket.category} />],
    [
      'Raised by',
      <span key="r" className="block min-w-0">
        <span className="block truncate font-medium text-slate-900">{ticket.user_name}</span>
        <span className="block truncate text-xs text-slate-500">{ticket.user_email}</span>
      </span>,
    ],
    ['Created', formatDate(ticket.created_at)],
    ['Updated', formatDate(ticket.updated_at)],
  ]
  return (
    <section className="card p-5">
      <h2 className="section-title">Details</h2>
      <dl className="mt-3 divide-y divide-slate-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 text-right text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
