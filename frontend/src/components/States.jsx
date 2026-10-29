export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-stone-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-brand-600" />
      {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800" role="alert">
      {error.message || String(error)}
      {onRetry && (
        <button onClick={onRetry} className="ml-3 font-medium underline">
          Retry
        </button>
      )}
    </div>
  )
}

export function Empty({ children }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white/60 px-6 py-12 text-center text-sm text-stone-500">
      <svg viewBox="0 0 64 40" className="mx-auto mb-4 h-10 w-16" aria-hidden="true">
        <rect x="2" y="8" width="26" height="30" rx="4" fill="#bae6fd" />
        <circle cx="42" cy="16" r="14" fill="#fed7aa" />
        <rect x="30" y="24" width="32" height="14" rx="4" fill="#ddd6fe" />
        <path d="m9 23 4 4 8-8" fill="none" stroke="#0369a1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </div>
  )
}
