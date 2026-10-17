import { formatDate } from '../constants'
import { StatusBadge } from './Badges'

export default function Timeline({ history }) {
  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {history.map((h) => (
        <li key={h.id} className="mb-4 ml-4 last:mb-0">
          <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-slate-400" />
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={h.new_status} />
            <time className="text-xs text-slate-500">{formatDate(h.changed_at)}</time>
          </div>
          {h.note && <p className="mt-1 text-sm text-slate-600">{h.note}</p>}
        </li>
      ))}
    </ol>
  )
}
