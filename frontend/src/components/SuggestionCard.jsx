import { motion } from 'motion/react'
import { FileText, GraduationCap, RefreshCw, SearchX, Sparkles } from 'lucide-react'
import { Spinner } from './ui'
import { EASE, fadeUp, stagger } from '../motion'

const CONFIDENCE = {
  High: { level: 3, text: 'text-emerald-700', bar: 'bg-emerald-500', soft: 'bg-emerald-50 ring-emerald-200' },
  Medium: { level: 2, text: 'text-amber-700', bar: 'bg-amber-500', soft: 'bg-amber-50 ring-amber-200' },
  Low: { level: 1, text: 'text-slate-700', bar: 'bg-slate-500', soft: 'bg-slate-50 ring-slate-200' },
}

const pct = (score) => `${Math.round(score * 100)}%`

// Renders "[1][2]" citations inside a step as small source markers.
function StepText({ text }) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? (
      <sup key={i} className="ml-0.5 rounded bg-brand-50 px-1 font-mono text-[10px] font-semibold text-brand-700">
        {part.slice(1, -1)}
      </sup>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

function Steps({ text }) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const isStep = (l) => /^\d+[.)]\s/.test(l)
  return (
    <>
      <motion.ol variants={stagger(0.06, 0.15)} initial="hidden" animate="show" className="space-y-1">
        {lines.filter(isStep).map((line, i) => (
          <motion.li variants={fadeUp} key={i} className="flex gap-3 rounded-lg px-2 py-2 text-sm leading-relaxed text-slate-800 transition-colors hover:bg-slate-50">
            <span className="mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 font-mono text-[11px] font-semibold text-white shadow-[0_1px_2px_rgb(79_70_229/0.4)]">
              {i + 1}
            </span>
            <span className="min-w-0 break-words">
              <StepText text={line.replace(/^\d+[.)]\s*/, '')} />
            </span>
          </motion.li>
        ))}
      </motion.ol>
      {lines
        .filter((l) => !isStep(l))
        .map((line, i) => (
          <p key={i} className="mt-3 px-2 text-sm text-slate-600">
            <StepText text={line} />
          </p>
        ))}
    </>
  )
}

function Sources({ sources, heading }) {
  if (!sources.length) return null
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <h3 className="eyebrow">{heading}</h3>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {sources.map((s, i) => (
          <motion.li
            key={s.chunk_id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.3 + i * 0.05 }}
            className="rounded-lg border border-slate-200 bg-slate-50/50 p-3"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white font-mono text-[11px] font-semibold text-brand-700 ring-1 ring-slate-200">
                {s.n}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug font-medium text-slate-800">{s.title}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                  {s.origin === 'ticket' ? <GraduationCap className="h-3 w-3 shrink-0 text-violet-500" aria-hidden="true" /> : <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />}
                  <span className="truncate">{s.origin === 'ticket' ? 'Learned from a resolved ticket' : s.source}</span>
                </p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
              <span>{s.category}</span>
              <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                <motion.span
                  className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                  initial={{ width: 0 }}
                  animate={{ width: pct(s.score) }}
                  transition={{ duration: 0.7, ease: EASE, delay: 0.4 + i * 0.05 }}
                />
              </span>
              <span className="tabular-nums font-medium text-slate-700">{pct(s.score)} match</span>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function AiHeader({ children }) {
  return (
    <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-brand-50/80 via-violet-50/40 to-transparent" aria-hidden="true" />
      <h2 className="relative flex items-center gap-2.5 text-sm font-semibold text-slate-900">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-violet-600 text-white shadow-[0_2px_6px_rgb(99_102_241/0.35)]" aria-hidden="true">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        AI troubleshooting suggestion
      </h2>
      {children && <div className="relative">{children}</div>}
    </div>
  )
}

function ConfidenceMeter({ confidence, score }) {
  const c = CONFIDENCE[confidence] || CONFIDENCE.Low
  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 ring-1 ring-inset ${c.soft}`} title={score != null ? `Best knowledge-base match: ${pct(score)}` : undefined}>
      <span className="flex items-end gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((n) => (
          <motion.span
            key={n}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.35, ease: EASE, delay: 0.2 + n * 0.08 }}
            className={`w-1 origin-bottom rounded-sm ${n <= c.level ? c.bar : 'bg-slate-200'}`}
            style={{ height: 4 + n * 4 }}
          />
        ))}
      </span>
      <span className={`text-xs font-semibold ${c.text}`}>{confidence} confidence</span>
      {score != null && <span className="border-l border-slate-200 pl-2.5 text-xs tabular-nums text-slate-500">{pct(score)} match</span>}
    </div>
  )
}

export function SuggestionPending({ failed, onRetry, retrying, children }) {
  return (
    <div className="card overflow-hidden">
      <AiHeader />
      <div className="p-5">
        {failed ? (
          <div className="flex flex-col gap-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <span>The suggestion could not be generated yet.</span>
            <button onClick={onRetry} disabled={retrying} className="btn btn-primary btn-sm">
              {retrying ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
              {retrying ? 'Trying…' : 'Try again'}
            </button>
          </div>
        ) : (
          <div role="status">
            <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <Spinner className="h-4 w-4 text-brand-600" />
              Searching the knowledge base…
            </p>
            <div className="mt-4 space-y-2.5" aria-hidden="true">
              {['w-11/12', 'w-4/5', 'w-2/3'].map((w) => (
                <div key={w} className="flex items-center gap-3">
                  <span className="skeleton h-6 w-6 shrink-0 rounded-full" />
                  <span className={`skeleton h-3 ${w}`} />
                </div>
              ))}
            </div>
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
      <div className="card overflow-hidden">
        <AiHeader>
          <span className="pill bg-amber-50 text-amber-800 ring-amber-200">No reliable match</span>
        </AiHeader>
        <div className="p-5">
          <div className="flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600" aria-hidden="true">
              <SearchX className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">We couldn't find a solution for this issue</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Our knowledge base doesn't have a reliable fix for this problem yet, so we'd rather not guess. A technician will look into it for you —
                escalate the ticket and it will be assigned to the right team.
              </p>
            </div>
          </div>
          <Sources sources={suggestion.sources} heading="Articles checked" />
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <AiHeader>
        <ConfidenceMeter confidence={suggestion.confidence} score={suggestion.top_score} />
      </AiHeader>
      <div className="p-3 pt-3 sm:p-4">
        <Steps text={suggestion.suggestion_text} />
        <div className="px-2">
          <Sources sources={suggestion.sources} heading="Knowledge-base sources" />
          {children}
        </div>
      </div>
    </div>
  )
}
