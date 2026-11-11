import { motion } from 'motion/react'
import { Inbox, RefreshCw, TriangleAlert } from 'lucide-react'
import { Skeleton } from './ui'
import { EASE } from '../motion'

// Generic loading placeholder; pages with a known layout use their own skeletons below.
export function Loading({ label = 'Loading…', rows = 4 }) {
  return (
    <div role="status" aria-label={label} className="card space-y-4 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}

export function ListSkeleton({ rows = 6 }) {
  return (
    <div role="status" aria-label="Loading tickets" className="card divide-y divide-slate-100 overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-3 w-16" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-full sm:block" />
          <Skeleton className="hidden h-3 w-24 md:block" />
        </div>
      ))}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
      role="alert"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
      <span className="min-w-0 flex-1">{error.message || String(error)}</span>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex shrink-0 items-center gap-1 font-medium text-red-700 underline-offset-4 hover:underline">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </button>
      )}
    </motion.div>
  )
}

export function Empty({ title = 'Nothing here yet', children, icon: Icon = Inbox, action }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white/60 px-6 py-14 text-center"
    >
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-card ring-1 ring-slate-200" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}
