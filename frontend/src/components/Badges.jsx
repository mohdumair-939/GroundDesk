import { STATUS_LABELS } from '../constants'

const STATUS_STYLES = {
  OPEN: 'bg-sky-50 text-sky-700 ring-sky-200',
  SUGGESTION_PROVIDED: 'bg-violet-50 text-violet-700 ring-violet-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ESCALATED: 'bg-amber-50 text-amber-800 ring-amber-200',
  ASSIGNED: 'bg-orange-50 text-orange-700 ring-orange-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 ring-blue-200',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const PRIORITY_STYLES = {
  Low: 'bg-slate-50 text-slate-600 ring-slate-200',
  Medium: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
  High: 'bg-red-50 text-red-700 ring-red-200',
}

const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap'

export function StatusBadge({ status }) {
  return <span className={`${base} ${STATUS_STYLES[status] || ''}`}>{STATUS_LABELS[status] || status}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`${base} ${PRIORITY_STYLES[priority] || ''}`}>{priority}</span>
}
