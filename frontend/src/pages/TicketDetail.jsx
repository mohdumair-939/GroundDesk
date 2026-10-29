import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  addNote,
  adminUpdateTicket,
  getTicket,
  reassignTicket,
  reopenTicket,
  requestSuggestion,
  sendClosure,
  sendFeedback,
  updateStatus,
} from '../api'
import { useAuth } from '../auth'
import AssignmentPanel from '../components/AssignmentPanel'
import { CategoryTag, PriorityBadge, StatusBadge } from '../components/Badges'
import { STATUS_COLORS } from '../colors'
import FeedbackPanel from '../components/FeedbackPanel'
import { ErrorBox, Loading } from '../components/States'
import SuggestionCard, { SuggestionPending } from '../components/SuggestionCard'
import { AdminPanel, ClosurePanel, NoteForm, TechnicianPanel } from '../components/TicketActions'
import Timeline from '../components/Timeline'
import { formatDate } from '../constants'
import { useAsync } from '../useAsync'

const POLL_MS = 2000
const POLL_LIMIT = 20 // ~40 s before offering a manual retry

export default function TicketDetail() {
  const { id } = useParams()
  const { user } = useAuth()
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
  async function run(action) {
    setBusy(true)
    setActionError(null)
    try {
      setData(await action())
      return true
    } catch (err) {
      setActionError(err)
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
    run(() => {
      if (kind === 'update') return adminUpdateTicket(id, args)
      if (kind === 'reassign') return reassignTicket(id, args.techId, args.note)
      if (kind === 'close') return updateStatus(id, 'CLOSED', args.note)
      return reopenTicket(id, args.note)
    })

  if (loading && !ticket) return <Loading />
  if (error && !ticket) return <ErrorBox error={error} onRetry={reload} />

  const isOwner = user.role === 'employee'
  const isTech = user.role === 'technician'
  const isAdmin = user.role === 'admin'

  return (
    <section className="space-y-5">
      <Link to={isAdmin ? '/tickets' : '/'} className="inline-flex items-center gap-1 text-sm text-stone-500 transition-colors hover:text-stone-900">
        ← Back
      </Link>

      <div className={`card border-t-4 p-6 ${STATUS_COLORS[ticket.status].edge.replace('border-l-', 'border-t-')}`}>
        <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
          <span className="font-mono text-xs text-stone-500">{ticket.ticket_code}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <CategoryTag category={ticket.category} />
        </div>
        <h1 className="page-title mt-3 break-words">{ticket.title}</h1>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-stone-700">{ticket.description}</p>
        <p className="mt-4 text-xs text-stone-500">
          Raised by {ticket.user_name} ({ticket.user_email}) · {formatDate(ticket.created_at)}
        </p>
      </div>

      <ErrorBox error={actionError} />

      {isOwner && ticket.status === 'PENDING_APPROVAL' && (
        <ClosurePanel ticket={ticket} busy={busy} onSubmit={(approved, comment) => run(() => sendClosure(id, approved, comment))} />
      )}
      {(isTech || isAdmin) && <TechnicianPanel ticket={ticket} busy={busy} onMove={(status, note) => run(() => updateStatus(id, status, note))} />}
      {isAdmin && <AdminPanel key={`${ticket.priority}-${ticket.category}-${ticket.status}`} ticket={ticket} act={adminAct} busy={busy} />}

      {ticket.suggestion ? (
        <SuggestionCard suggestion={ticket.suggestion}>
          {isOwner && ticket.status === 'SUGGESTION_PROVIDED' && (
            <FeedbackPanel
              answered={ticket.suggestion.answered}
              onSubmit={(resolved, comment) => run(() => sendFeedback(id, resolved, comment))}
              busy={busy}
            />
          )}
          {ticket.suggestion.feedback_resolved !== null && (
            <p className="mt-4 border-t border-stone-200 pt-3 text-sm text-stone-600">
              {ticket.suggestion.feedback_resolved
                ? '✓ The employee confirmed this suggestion fixed the issue.'
                : 'The employee reported this did not fix the issue, so the ticket was escalated.'}
              {ticket.suggestion.feedback_comment && (
                <span className="block italic text-stone-500">“{ticket.suggestion.feedback_comment}”</span>
              )}
            </p>
          )}
        </SuggestionCard>
      ) : (
        ticket.status === 'OPEN' &&
        (isOwner || isAdmin) && (
          <SuggestionPending failed={polls >= POLL_LIMIT} onRetry={retrySuggestion} retrying={retrying}>
            {isOwner && polls >= POLL_LIMIT && (
              <FeedbackPanel answered={false} onSubmit={(resolved, comment) => run(() => sendFeedback(id, resolved, comment))} busy={busy} />
            )}
          </SuggestionPending>
        )
      )}

      {ticket.assignment && <AssignmentPanel assignment={ticket.assignment} />}

      <div className="card p-5">
        <h2 className="mb-4 text-sm font-semibold text-stone-900">Activity</h2>
        <Timeline history={ticket.history} />
        <NoteForm busy={busy} onSubmit={(note) => run(() => addNote(id, note))} />
      </div>
    </section>
  )
}
