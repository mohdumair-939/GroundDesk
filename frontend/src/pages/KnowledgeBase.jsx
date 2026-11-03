import { useState } from 'react'
import { Link } from 'react-router'
import { getKbSummary, listKbArticles, publishKbArticle, rejectKbArticle, unpublishKbArticle, updateKbArticle } from '../api'
import { CategoryTag } from '../components/Badges'
import { KbStatusPill } from '../components/KbArticleStatus'
import { Empty, ErrorBox, Loading } from '../components/States'
import { CATEGORIES, KB_STATUS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const TABS = ['PENDING_REVIEW', 'AWAITING_CLOSURE', 'PUBLISHED', 'REJECTED']
const field = 'mt-1 block w-full field px-3 py-2 text-sm'
const label = 'block text-xs font-medium text-stone-500'
const btn = 'px-3 py-1.5 text-sm font-medium disabled:opacity-50'
const ghost = 'rounded-md px-3 py-1.5 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900'

function Section({ title, children }) {
  return (
    <div className="mt-3">
      <h3 className="eyebrow">{title}</h3>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-stone-800">{children}</p>
    </div>
  )
}

function EditForm({ article, onSave, onCancel, busy }) {
  const [draft, setDraft] = useState({
    title: article.title,
    category: article.category,
    problem: article.problem,
    cause: article.cause || '',
    steps: article.steps,
  })
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }))
  const ok = draft.title.trim().length >= 5 && draft.problem.trim().length >= 20 && draft.steps.trim().length >= 20

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...draft, cause: draft.cause.trim() })
      }}
      className="mt-3 space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className={label}>
          Title
          <input maxLength={120} value={draft.title} onChange={set('title')} className={field} />
        </label>
        <label className={label}>
          Category
          <select value={draft.category} onChange={set('category')} className={`${field} py-2`}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className={label}>
        Problem / symptoms
        <textarea rows={3} maxLength={2000} value={draft.problem} onChange={set('problem')} className={field} />
      </label>
      <label className={label}>
        Cause (optional)
        <textarea rows={2} maxLength={1000} value={draft.cause} onChange={set('cause')} className={field} />
      </label>
      <label className={label}>
        Troubleshooting steps
        <textarea rows={6} maxLength={4000} value={draft.steps} onChange={set('steps')} className={`${field} font-mono text-[13px]`} />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !ok} className={`${btn} btn-primary`}>
          Save changes
        </button>
        <button type="button" onClick={onCancel} className={ghost}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// Reject / unpublish need a reason.
function ReasonForm({ verb, onSubmit, onCancel, busy }) {
  const [reason, setReason] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(reason.trim())
      }}
      className="mt-3 flex flex-wrap items-end gap-2"
    >
      <label className={`${label} min-w-0 flex-1`}>
        Reason
        <input maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} className={field} autoFocus />
      </label>
      <button type="submit" disabled={busy || reason.length < 3} className={`${btn} btn-solid bg-red-600 hover:bg-red-700`}>
        {verb}
      </button>
      <button type="button" onClick={onCancel} className={ghost}>
        Cancel
      </button>
    </form>
  )
}

function ArticleCard({ article, onChanged }) {
  const [mode, setMode] = useState(null) // null | 'edit' | 'reject' | 'unpublish'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const editable = article.status === 'PENDING_REVIEW' || article.status === 'AWAITING_CLOSURE'

  async function run(action) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setMode(null)
      onChanged()
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
        <KbStatusPill status={article.status} />
        <CategoryTag category={article.category} />
        <Link to={`/tickets/${article.ticket.id}`} className="font-mono hover:text-brand-700">
          {article.ticket.ticket_code}
        </Link>
        <span>
          by {article.submitted_by?.name || 'unknown'} · {formatDate(article.submitted_at)}
        </span>
      </div>
      <h2 className="mt-2 break-words font-semibold text-stone-900">{article.title}</h2>

      {article.status === 'PENDING_REVIEW' &&
        (article.confirmed_by_employee ? (
          <p className="mt-1 text-xs font-medium text-emerald-700">✓ The employee confirmed this fix worked.</p>
        ) : (
          <p className="mt-1 text-xs font-medium text-amber-700">
            The ticket was closed by an admin; the employee did not confirm this fix.
          </p>
        ))}
      {article.review_note && (
        <p className="mt-1 text-sm italic text-stone-500">
          “{article.review_note}”{article.reviewed_by && ` — ${article.reviewed_by.name}`}
        </p>
      )}

      {mode === 'edit' ? (
        <EditForm article={article} busy={busy} onCancel={() => setMode(null)} onSave={(changes) => run(() => updateKbArticle(article.id, changes))} />
      ) : (
        <>
          <Section title="Problem / symptoms">{article.problem}</Section>
          {article.cause && <Section title="Cause">{article.cause}</Section>}
          <Section title="Troubleshooting steps">{article.steps}</Section>
          <details className="mt-3 text-sm text-stone-500">
            <summary className="cursor-pointer">Original ticket</summary>
            <p className="mt-1 font-medium text-stone-700">{article.ticket.title}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{article.ticket.description}</p>
          </details>
        </>
      )}

      <ErrorBox error={error} />
      {mode === 'reject' && (
        <ReasonForm verb="Reject" busy={busy} onCancel={() => setMode(null)} onSubmit={(note) => run(() => rejectKbArticle(article.id, note))} />
      )}
      {mode === 'unpublish' && (
        <ReasonForm
          verb="Unpublish"
          busy={busy}
          onCancel={() => setMode(null)}
          onSubmit={(note) => run(() => unpublishKbArticle(article.id, note))}
        />
      )}

      {mode === null && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-200 pt-4">
          {article.status === 'PENDING_REVIEW' && (
            <button onClick={() => run(() => publishKbArticle(article.id))} disabled={busy} className={`${btn} btn-solid bg-emerald-600 hover:bg-emerald-700`}>
              {busy ? 'Publishing…' : 'Publish to knowledge base'}
            </button>
          )}
          {editable && (
            <>
              <button onClick={() => setMode('edit')} className={ghost}>
                Edit
              </button>
              <button onClick={() => setMode('reject')} className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
                Reject
              </button>
            </>
          )}
          {article.status === 'PUBLISHED' && (
            <button onClick={() => setMode('unpublish')} className="rounded-md px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50">
              Unpublish
            </button>
          )}
        </div>
      )}
    </li>
  )
}

export default function KnowledgeBase() {
  const [tab, setTab] = useState('PENDING_REVIEW')
  const summary = useAsync(() => getKbSummary(), [])
  const articles = useAsync(() => listKbArticles(tab), [tab])
  const counts = summary.data?.articles
  const docs = summary.data?.documents

  const refresh = () => {
    articles.reload()
    summary.reload()
  }

  return (
    <section>
      <div className="mb-4">
        <h1 className="page-title">Knowledge base</h1>
        <p className="mt-1 text-sm text-stone-500">
          Fixes that technicians wrote up for escalated tickets. Review each one before publishing: make the steps general and
          remove names, passwords or one-off details. Published articles are used by the AI for similar tickets.
        </p>
        {docs && (
          <p className="mt-2 text-sm text-stone-700">
            The AI searches <strong>{docs.file + docs.ticket}</strong> articles: {docs.file} guides and {docs.ticket} learned
            from resolved tickets.
          </p>
        )}
      </div>

      <div className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-stone-200 px-4 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t ? 'border-brand-700 text-stone-900' : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            {KB_STATUS[t].label}
            {counts && <span className="ml-1.5 font-mono text-xs text-stone-400">{counts[t]}</span>}
          </button>
        ))}
      </div>

      <ErrorBox error={articles.error || summary.error} onRetry={refresh} />
      {articles.loading && !articles.data && <Loading />}
      {articles.data && articles.data.length === 0 && <Empty>No articles here.</Empty>}
      {articles.data && articles.data.length > 0 && (
        <ul className="space-y-4">
          {articles.data.map((a) => (
            <ArticleCard key={`${a.id}-${a.status}-${a.title}`} article={a} onChanged={refresh} />
          ))}
        </ul>
      )}
    </section>
  )
}
