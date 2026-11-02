import { Link } from 'react-router'
import { KB_STATUS } from '../constants'

export function KbStatusPill({ status }) {
  const s = KB_STATUS[status]
  return <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${s.pill}`}>{s.label}</span>
}

// Shown on the ticket page to the technician and admins.
export default function KbArticleStatus({ article, isAdmin }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-stone-900">Knowledge base article</h2>
        <KbStatusPill status={article.status} />
      </div>
      <p className="mt-2 text-sm font-medium text-stone-800">{article.title}</p>
      <p className="mt-1 text-sm text-stone-600">{KB_STATUS[article.status].text}</p>
      {article.review_note && <p className="mt-1 text-sm italic text-stone-500">“{article.review_note}”</p>}
      {isAdmin && (
        <Link to="/knowledge" className="mt-2 inline-block text-sm font-medium text-brand-700 hover:text-brand-800">
          Open knowledge base review →
        </Link>
      )}
    </div>
  )
}
