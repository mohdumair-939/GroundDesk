import { motion } from 'motion/react'
import { BookOpen, CircleCheck, FileText, GraduationCap, Pencil, TriangleAlert, Upload, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { getKbSummary, listKbArticles, publishKbArticle, rejectKbArticle, unpublishKbArticle, updateKbArticle } from '../api'
import { CategoryTag } from '../components/Badges'
import { KbStatusPill } from '../components/KbArticleStatus'
import { Empty, ErrorBox, Loading } from '../components/States'
import { useToast } from '../components/Toast'
import { AnimatedNumber, PageHeader, Spinner } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { CATEGORIES, KB_STATUS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const TABS = ['PENDING_REVIEW', 'AWAITING_CLOSURE', 'PUBLISHED', 'REJECTED']

function Section({ title, children, mono = false }) {
  return (
    <div className="mt-4">
      <h3 className="eyebrow">{title}</h3>
      <p className={`mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700 ${mono ? 'rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100' : ''}`}>{children}</p>
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
  const id = (name) => `kb-${article.id}-${name}`

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave({ ...draft, cause: draft.cause.trim() })
      }}
      className="mt-4 space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
        <div>
          <label htmlFor={id('title')} className="label">
            Title
          </label>
          <input id={id('title')} maxLength={120} value={draft.title} onChange={set('title')} className="field mt-1.5" />
        </div>
        <div>
          <label htmlFor={id('category')} className="label">
            Category
          </label>
          <select id={id('category')} value={draft.category} onChange={set('category')} className="field mt-1.5">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor={id('problem')} className="label">
          Problem / symptoms
        </label>
        <textarea id={id('problem')} rows={3} maxLength={2000} value={draft.problem} onChange={set('problem')} className="field mt-1.5" />
      </div>
      <div>
        <label htmlFor={id('cause')} className="label">
          Cause <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea id={id('cause')} rows={2} maxLength={1000} value={draft.cause} onChange={set('cause')} className="field mt-1.5" />
      </div>
      <div>
        <label htmlFor={id('steps')} className="label">
          Troubleshooting steps
        </label>
        <textarea id={id('steps')} rows={6} maxLength={4000} value={draft.steps} onChange={set('steps')} className="field mt-1.5 font-mono text-[13px]" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !ok} className="btn btn-primary">
          {busy && <Spinner />}
          Save changes
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}

// Reject / unpublish need a reason.
function ReasonForm({ verb, onSubmit, onCancel, busy, articleId }) {
  const [reason, setReason] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(reason.trim())
      }}
      className="mt-4 rounded-lg border border-red-100 bg-red-50/40 p-3"
    >
      <label htmlFor={`reason-${articleId}`} className="label">
        Reason
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input id={`reason-${articleId}`} maxLength={400} value={reason} onChange={(e) => setReason(e.target.value)} className="field flex-1" autoFocus />
        <div className="flex gap-2">
          <button type="submit" disabled={busy || reason.length < 3} className="btn btn-danger flex-1 sm:flex-none">
            {verb}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </form>
  )
}

function ArticleCard({ article, onChanged }) {
  const toast = useToast()
  const [mode, setMode] = useState(null) // null | 'edit' | 'reject' | 'unpublish'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const editable = article.status === 'PENDING_REVIEW' || article.status === 'AWAITING_CLOSURE'

  async function run(action, done) {
    setBusy(true)
    setError(null)
    try {
      await action()
      setMode(null)
      toast({ title: done, description: article.title })
      onChanged()
    } catch (err) {
      setError(err)
      toast({ type: 'error', title: 'That did not go through', description: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.li variants={fadeUp} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <KbStatusPill status={article.status} />
        <CategoryTag category={article.category} />
        <Link to={`/tickets/${article.ticket.id}`} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-600 hover:bg-brand-50 hover:text-brand-700">
          {article.ticket.ticket_code}
        </Link>
        <span>
          by {article.submitted_by?.name || 'unknown'} · {formatDate(article.submitted_at)}
        </span>
      </div>
      <h2 className="mt-3 text-base font-semibold break-words text-slate-900">{article.title}</h2>

      {article.status === 'PENDING_REVIEW' &&
        (article.confirmed_by_employee ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> The employee confirmed this fix worked.
          </p>
        ) : (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" /> The ticket was closed by an admin; the employee did not confirm this fix.
          </p>
        ))}
      {article.review_note && (
        <p className="mt-2 text-sm text-slate-500 italic">
          “{article.review_note}”{article.reviewed_by && ` — ${article.reviewed_by.name}`}
        </p>
      )}

      {mode === 'edit' ? (
        <EditForm article={article} busy={busy} onCancel={() => setMode(null)} onSave={(changes) => run(() => updateKbArticle(article.id, changes), 'Article saved')} />
      ) : (
        <>
          <Section title="Problem / symptoms">{article.problem}</Section>
          {article.cause && <Section title="Cause">{article.cause}</Section>}
          <Section title="Troubleshooting steps" mono>
            {article.steps}
          </Section>
          <details className="group mt-4 text-sm text-slate-500">
            <summary className="cursor-pointer font-medium text-slate-600 hover:text-slate-900">Original ticket</summary>
            <p className="mt-2 font-medium text-slate-700">{article.ticket.title}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{article.ticket.description}</p>
          </details>
        </>
      )}

      {error && (
        <div className="mt-4">
          <ErrorBox error={error} />
        </div>
      )}
      {mode === 'reject' && (
        <ReasonForm articleId={article.id} verb="Reject" busy={busy} onCancel={() => setMode(null)} onSubmit={(note) => run(() => rejectKbArticle(article.id, note), 'Article rejected')} />
      )}
      {mode === 'unpublish' && (
        <ReasonForm
          articleId={article.id}
          verb="Unpublish"
          busy={busy}
          onCancel={() => setMode(null)}
          onSubmit={(note) => run(() => unpublishKbArticle(article.id, note), 'Article unpublished')}
        />
      )}

      {mode === null && (article.status === 'PENDING_REVIEW' || editable || article.status === 'PUBLISHED') && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          {article.status === 'PENDING_REVIEW' && (
            <button onClick={() => run(() => publishKbArticle(article.id), 'Published to the knowledge base')} disabled={busy} className="btn btn-success">
              {busy ? <Spinner /> : <Upload className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Publishing…' : 'Publish to knowledge base'}
            </button>
          )}
          {editable && (
            <>
              <button onClick={() => setMode('edit')} className="btn btn-secondary">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </button>
              <button onClick={() => setMode('reject')} className="btn btn-danger-ghost">
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </button>
            </>
          )}
          {article.status === 'PUBLISHED' && (
            <button onClick={() => setMode('unpublish')} className="btn btn-danger-ghost">
              Unpublish
            </button>
          )}
        </div>
      )}
    </motion.li>
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
      <PageHeader
        title="Knowledge base"
        description="Fixes that technicians wrote up for escalated tickets. Review each one before publishing: make the steps general and remove names, passwords or one-off details. Published articles are used by the AI for similar tickets."
      />

      {docs && (
        <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {[
            { label: 'Articles the AI searches', value: docs.file + docs.ticket, Icon: BookOpen, tone: 'bg-brand-50 text-brand-600' },
            { label: 'IT guides', value: docs.file, Icon: FileText, tone: 'bg-sky-50 text-sky-600' },
            { label: 'Learned from tickets', value: docs.ticket, Icon: GraduationCap, tone: 'bg-violet-50 text-violet-600' },
          ].map(({ label, value, Icon, tone }) => (
            <motion.div key={label} variants={fadeUp} className="card flex items-center gap-4 p-4">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`} aria-hidden="true">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl leading-none font-semibold tabular-nums text-slate-900">
                  <AnimatedNumber value={value} />
                </p>
                <p className="mt-1 text-xs text-slate-500">{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <div className="scroll-thin -mx-4 mb-5 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="Article status">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`relative shrink-0 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${tab === t ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}
          >
            {KB_STATUS[t].label}
            {counts && (
              <span className={`ml-2 rounded-full px-1.5 py-px text-xs tabular-nums ${tab === t ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500'}`}>{counts[t]}</span>
            )}
            {tab === t && <motion.span layoutId="kb-tab" className="absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-600" transition={{ duration: 0.3, ease: EASE }} />}
          </button>
        ))}
      </div>

      <ErrorBox error={articles.error || summary.error} onRetry={refresh} />
      {articles.loading && !articles.data && <Loading label="Loading articles" />}
      {articles.data && articles.data.length === 0 && (
        <Empty icon={BookOpen} title={`No articles in “${KB_STATUS[tab].label}”`} />
      )}
      {articles.data && articles.data.length > 0 && (
        <motion.ul key={tab} variants={stagger(0.06)} initial="hidden" animate="show" className={`space-y-4 transition-opacity ${articles.loading ? 'opacity-60' : ''}`}>
          {articles.data.map((a) => (
            <ArticleCard key={`${a.id}-${a.status}-${a.title}`} article={a} onChanged={refresh} />
          ))}
        </motion.ul>
      )}
    </section>
  )
}
