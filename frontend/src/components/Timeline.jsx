import { formatDate } from '../constants'
import { STATUS_COLORS } from '../colors'
import { StatusBadge } from './Badges'

export default function Timeline({ history }) {
  return (
    <ol className="relative ml-2 border-l border-stone-200">
      {history.map((h) => (
        <li key={h.id} className="mb-4 ml-4 last:mb-0">
          <span
            className={`absolute -left-[6px] mt-1 h-3 w-3 rounded-full border-2 border-white ring-1 ring-stone-200 ${
              h.old_status === h.new_status ? 'bg-stone-300' : (STATUS_COLORS[h.new_status] || STATUS_COLORS.CLOSED).dot
            }`}
          />
          <div className="flex flex-wrap items-center gap-2">
            {h.old_status === h.new_status ? (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">Note</span>
            ) : (
              <StatusBadge status={h.new_status} />
            )}
            <span className="text-xs text-stone-600">{h.changed_by ? `${h.changed_by.name} (${h.changed_by.role})` : 'System'}</span>
            <time className="text-xs text-stone-400">{formatDate(h.changed_at)}</time>
          </div>
          {h.note && <p className="mt-1 text-sm text-stone-600">{h.note}</p>}
        </li>
      ))}
    </ol>
  )
}
