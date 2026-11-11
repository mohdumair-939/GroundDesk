import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router'
import { KB_STATUS } from '../constants'

export function KbStatusPill({ status }) {
  const s = KB_STATUS[status]
  return <span className={`pill ${s.pill}`}>{s.label}</span>
}

// Shown on the ticket page to the technician and admins.
export default function KbArticleStatus({ article, isAdmin }) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 section-title">
          <BookOpen className="h-4 w-4 text-slate-400" aria-hidden="true" />
          Knowledge-base article
        </h2>
        <KbStatusPill status={article.status} />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-800">{article.title}</p>
      <p className="mt-1 text-sm text-slate-600">{KB_STATUS[article.status].text}</p>
      {article.review_note && <p className="mt-2 text-sm text-slate-500 italic">“{article.review_note}”</p>}
      {isAdmin && (
        <Link to="/knowledge" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800">
          Open knowledge-base review <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}
