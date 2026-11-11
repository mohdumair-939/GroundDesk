import { CATEGORY_COLORS, PRIORITY_COLORS, STATUS_COLORS } from '../colors'
import { STATUS_LABELS } from '../constants'

const LEVEL = { Low: 1, Medium: 2, High: 3 }

export function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.CLOSED
  return (
    <span className={`pill ${c.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// Priority: signal bars filled by level, plus the word (never colour alone).
export function PriorityBadge({ priority }) {
  const level = LEVEL[priority] || 0
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Low
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${c.text}`}>
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`w-[3px] rounded-[1px] ${n <= level ? 'bg-current' : 'bg-slate-200'}`} style={{ height: 3 + n * 3 }} />
        ))}
      </span>
      {priority}
    </span>
  )
}

export function CategoryTag({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-slate-700 ring-1 ring-slate-200 ring-inset">
      <c.Icon className={`h-3 w-3 ${c.ink}`} aria-hidden="true" />
      {category}
    </span>
  )
}
