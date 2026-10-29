const CONFIDENCE_STYLES = {
  High: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  Low: 'bg-stone-100 text-stone-700 ring-stone-300',
}

const pct = (score) => `${Math.round(score * 100)}%`

// Renders "[1][2]" citations inside a step as small source markers.
function StepText({ text }) {
  const parts = text.split(/(\[\d+\])/g)
  return parts.map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup key={i} className="ml-0.5 font-mono text-[10px] font-medium text-violet-600">
        {part}
      </sup>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Steps({ text }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const steps = lines.filter((l) => /^\d+[.)]\s/.test(l))
  const other = lines.filter((l) => !/^\d+[.)]\s/.test(l))
  return (
    <>
      <ol className="mt-3 space-y-2">
        {steps.map((line, i) => (
          <li key={i} className="flex gap-3 text-sm text-stone-800">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-600 font-mono text-[11px] font-medium text-white">
              {i + 1}
            </span>
            <span className="min-w-0 break-words">
              <StepText text={line.replace(/^\d+[.)]\s*/, '')} />
            </span>
          </li>
        ))}
      </ol>
      {other.map((line, i) => (
        <p key={i} className="mt-3 text-sm text-stone-600">
          <StepText text={line} />
        </p>
      ))}
    </>
  )
}

function Sources({ sources, heading }) {
  if (!sources.length) return null
  return (
    <div className="mt-4 border-t border-stone-200 pt-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{heading}</h3>
      <ul className="mt-2 space-y-1">
        {sources.map((s) => (
          <li key={s.chunk_id} className="flex flex-wrap items-baseline gap-x-2 text-sm">
            <span className="font-mono text-xs font-medium text-violet-600">[{s.n}]</span>
            <span className="text-stone-800">{s.title}</span>
            <span className="text-xs text-stone-500">
              {s.category} · match {pct(s.score)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AiHeader({ children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-100 bg-violet-50 px-5 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-violet-950">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1m0-11.4-2.1 2.1m-7.2 7.2-2.1 2.1" />
          </svg>
        </span>
        AI troubleshooting suggestion
      </h2>
      {children}
    </div>
  )
}

export function SuggestionPending({ failed, onRetry, retrying, children }) {
  return (
    <div className="card overflow-hidden">
      <AiHeader />
      <div className="p-5">
      {failed ? (
        <div className=" text-sm text-stone-700">
          The suggestion could not be generated yet.
          <button
            onClick={onRetry}
            disabled={retrying}
            className="btn-solid ml-3 bg-violet-600 px-3 py-1 hover:bg-violet-700 text-sm font-medium disabled:opacity-50"
          >
            {retrying ? 'Trying…' : 'Try again'}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-stone-600" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-violet-600" />
          Searching the knowledge base…
        </div>
      )}
      {children}
      </div>
    </div>
  )
}

export default function SuggestionCard({ suggestion, children }) {
  if (!suggestion.answered) {
    return (
      <div className="rounded-lg border border-amber-200 border-t-4 border-t-amber-400 bg-amber-50 p-5">
        <h2 className="text-sm font-semibold text-amber-900">No reliable solution found</h2>
        <p className="mt-2 text-sm text-amber-900/90">{suggestion.suggestion_text}</p>
        {suggestion.top_score !== null && (
          <p className="mt-2 text-xs text-amber-800/80">
            Closest knowledge base match was {pct(suggestion.top_score)}, below the confidence threshold, so no
            answer was generated.
          </p>
        )}
        <Sources sources={suggestion.sources} heading="Articles checked" />
        {children}
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <AiHeader>
        <span className={`rounded-md bg-white px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${CONFIDENCE_STYLES[suggestion.confidence]}`}>
          {suggestion.confidence} confidence
        </span>
      </AiHeader>
      <div className="p-5 pt-2">
        <Steps text={suggestion.suggestion_text} />
        <Sources sources={suggestion.sources} heading="Sources used" />
        {children}
      </div>
    </div>
  )
}
