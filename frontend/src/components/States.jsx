export function Loading({ label = 'Loading…' }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-slate-500" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </div>
  )
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null
  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
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
    <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {children}
    </div>
  )
}
