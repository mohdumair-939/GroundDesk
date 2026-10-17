import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getTicket, requestSuggestion, sendFeedback, updateStatus } from '../api'
import AssignmentPanel from '../components/AssignmentPanel'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import FeedbackPanel from '../components/FeedbackPanel'
import { ErrorBox, Loading } from '../components/States'
import SuggestionCard, { SuggestionPending } from '../components/SuggestionCard'
import Timeline from '../components/Timeline'
import { STATUS_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

// Technician moves after a ticket has been assigned.
const NEXT_STEP = { ASSIGNED: 'IN_PROGRESS', IN_PROGRESS: 'CLOSED' }
const POLL_MS = 2000
const POLL_LIMIT = 20 // ~40 s before offering a manual retry

export default function TicketDetail() {
  const { id } = useParams()
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

  async function giveFeedback(resolved, comment) {
    setBusy(true)
    setActionError(null)
    try {
      setData(await sendFeedback(id, resolved, comment))
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  async function move(status) {
    setBusy(true)
    setActionError(null)
    try {
      setData(await updateStatus(id, status, `Moved to ${STATUS_LABELS[status]} by technician`))
    } catch (err) {
      setActionError(err)
    } finally {
      setBusy(false)
    }
  }

  if (loading && !ticket) return <Loading />
  if (error && !ticket) return <ErrorBox error={error} onRetry={reload} />

  const next = NEXT_STEP[ticket.status]

  return (
    <section className="space-y-5">
      <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
        ← All tickets
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
          <span className="font-mono">{ticket.ticket_code}</span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <span>{ticket.category}</span>
        </div>
        <h1 className="mt-2 break-words text-xl font-semibold">{ticket.title}</h1>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{ticket.description}</p>
        <p className="mt-4 text-xs text-slate-500">
          Raised by {ticket.user_name} ({ticket.user_email}) · {formatDate(ticket.created_at)}
        </p>

        {next && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <button
              onClick={() => move(next)}
              disabled={busy}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {busy ? 'Updating…' : `Mark as ${STATUS_LABELS[next]}`}
            </button>
          </div>
        )}
        <div className="mt-3">
          <ErrorBox error={actionError} />
        </div>
      </div>

      {ticket.suggestion ? (
        <SuggestionCard suggestion={ticket.suggestion}>
          {ticket.status === 'SUGGESTION_PROVIDED' && (
            <FeedbackPanel answered={ticket.suggestion.answered} onSubmit={giveFeedback} busy={busy} />
          )}
          {ticket.suggestion.feedback_resolved !== null && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {ticket.suggestion.feedback_resolved
                ? '✓ The user confirmed this suggestion fixed the issue.'
                : 'The user reported this did not fix the issue, so the ticket was escalated.'}
              {ticket.suggestion.feedback_comment && (
                <span className="block italic text-slate-500">“{ticket.suggestion.feedback_comment}”</span>
              )}
            </p>
          )}
        </SuggestionCard>
      ) : (
        ticket.status === 'OPEN' && (
          <SuggestionPending failed={polls >= POLL_LIMIT} onRetry={retrySuggestion} retrying={retrying}>
            {polls >= POLL_LIMIT && <FeedbackPanel answered={false} onSubmit={giveFeedback} busy={busy} />}
          </SuggestionPending>
        )
      )}

      {ticket.assignment && <AssignmentPanel assignment={ticket.assignment} />}

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Status timeline</h2>
        <Timeline history={ticket.history} />
      </div>
    </section>
  )
}
