import { CATEGORY_COLORS, STATUS_COLORS } from '../colors'
import { STATUS_LABELS } from '../constants'

const PRIORITY_STYLES = {
  Low: 'text-stone-500',
  Medium: 'text-amber-600',
  High: 'text-red-600',
}

// Priority: signal bars, filled by level.
const LEVEL = { Low: 1, Medium: 2, High: 3 }

export function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.CLOSED
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${c.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const level = LEVEL[priority] || 0
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${PRIORITY_STYLES[priority] || ''}`}>
      <span className="flex items-end gap-px" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`w-[3px] rounded-[1px] ${n <= level ? 'bg-current' : 'bg-stone-300'}`} style={{ height: 4 + n * 3 }} />
        ))}
      </span>
      {priority}
    </span>
  )
}

export function CategoryTag({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${c.tag}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
      </svg>
      {category}
    </span>
  )
}
