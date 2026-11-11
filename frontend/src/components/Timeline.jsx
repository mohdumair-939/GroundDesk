import { motion } from 'motion/react'
import { Bot, MessageSquare } from 'lucide-react'
import { STATUS_COLORS } from '../colors'
import { STATUS_LABELS, formatDate } from '../constants'
import { StatusBadge } from './Badges'
import { Avatar } from './ui'
import { fadeUp, stagger } from '../motion'

const ROLE = { employee: 'Employee', technician: 'Technician', admin: 'Admin' }

export default function Timeline({ history }) {
  return (
    <motion.ol variants={stagger(0.05, 0.1)} initial="hidden" animate="show" className="relative">
      {history.map((h, i) => {
        const isNote = h.old_status === h.new_status
        const last = i === history.length - 1
        return (
          <motion.li key={h.id} variants={fadeUp} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className="absolute top-8 bottom-0 left-[15px] w-px bg-slate-200" aria-hidden="true" />}
            <span className="relative flex h-8 w-8 shrink-0">
              {h.changed_by ? (
                <Avatar name={h.changed_by.name} role={h.changed_by.role} />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200" aria-hidden="true">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              {!isNote && (
                <span
                  className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-white ${(STATUS_COLORS[h.new_status] || STATUS_COLORS.CLOSED).dot}`}
                  aria-hidden="true"
                />
              )}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-slate-900">{h.changed_by ? h.changed_by.name : 'System'}</span>
                <span className="text-xs text-slate-500">{h.changed_by ? ROLE[h.changed_by.role] || h.changed_by.role : 'AI & routing'}</span>
                <time dateTime={h.changed_at} className="text-xs text-slate-400 sm:ml-auto">
                  {formatDate(h.changed_at)}
                </time>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {isNote ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                    <MessageSquare className="h-3 w-3" aria-hidden="true" /> Note
                  </span>
                ) : (
                  <>
                    {h.old_status && <span className="line-through decoration-slate-300">{STATUS_LABELS[h.old_status]}</span>}
                    {h.old_status && <span aria-label="changed to">→</span>}
                    <StatusBadge status={h.new_status} />
                  </>
                )}
              </div>
              {h.note && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-700 ring-1 ring-slate-100">{h.note}</p>}
            </div>
          </motion.li>
        )
      })}
    </motion.ol>
  )
}
