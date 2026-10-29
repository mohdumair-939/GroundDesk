import { Link } from 'react-router'
import { getStats } from '../api'
import Hero, { heroButton } from '../components/Hero'
import { ErrorBox, Loading } from '../components/States'
import { CATEGORY_COLORS, STATUS_COLORS } from '../colors'
import { STATUS_LABELS } from '../constants'
import { useAsync } from '../useAsync'

// Categorical slots (validated light-mode palette): identity of the AI-outcome segments.
const SERIES = { resolved: '#10b981', escalated: '#f59e0b', waiting: '#8b5cf6' }
const BAR = '#2c6b52' // single-series magnitude bars (brand-600)
const OPEN_STATUSES = ['ESCALATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']

function duration(minutes) {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 48 * 60) return `${(minutes / 60).toFixed(1)} h`
  return `${(minutes / 1440).toFixed(1)} days`
}

const TILES = {
  total: ['bg-sky-100 text-sky-700', 'M4 6h16M4 12h16M4 18h10'],
  open: ['bg-orange-100 text-orange-700', 'M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 2l1.7 4.3ZM3 21l4-4'],
  ai: ['bg-violet-100 text-violet-700', 'M12 3v3m0 12v3M3 12h3m12 0h3M6.3 6.3l2.1 2.1m7.2 7.2 2.1 2.1m0-11.4-2.1 2.1m-7.2 7.2-2.1 2.1'],
  time: ['bg-emerald-100 text-emerald-700', 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
}

function Tile({ label, value, hint, kind }) {
  const [tone, path] = TILES[kind]
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d={path} />
          </svg>
        </span>
      </div>
      <p className="mt-2 text-[1.75rem] leading-none font-semibold tracking-tight tabular-nums text-stone-900">{value}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-stone-500">{hint}</p>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <section className="card p-5">
      <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-stone-500">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

// Horizontal bars for one series: label, bar (4px rounded end), value as text.
function BarList({ rows, max, linkFor, colorFor = () => BAR }) {
  return (
    <ul className="space-y-2">
      {rows.map(([key, label, value]) => {
        const width = max ? Math.max((value / max) * 100, value ? 2 : 0) : 0
        const inner = (
          <>
            <span className="w-36 shrink-0 truncate text-sm text-stone-700">{label}</span>
            <span className="relative h-3 flex-1 rounded-sm bg-stone-100" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-sm" style={{ width: `${width}%`, background: colorFor(key) }} />
            </span>
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-stone-900">{value}</span>
          </>
        )
        return (
          <li key={key} title={`${label}: ${value}`}>
            {linkFor ? (
              <Link to={linkFor(key)} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-1 transition-colors hover:bg-stone-50">
                {inner}
              </Link>
            ) : (
              <div className="flex items-center gap-3">{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function AiOutcome({ ai }) {
  const parts = [
    ['resolved', 'Resolved by AI suggestion', ai.resolved_by_ai],
    ['escalated', 'Escalated to a technician', ai.escalated],
    ['waiting', 'Waiting for the employee', ai.awaiting_answer],
  ]
  const total = parts.reduce((sum, [, , n]) => sum + n, 0)
  return (
    <>
      {total > 0 ? (
        <div className="flex h-3 gap-0.5 overflow-hidden rounded-sm" role="img" aria-label={parts.map(([, l, n]) => `${l}: ${n}`).join(', ')}>
          {parts
            .filter(([, , n]) => n > 0)
            .map(([key, label, n]) => (
              <span key={key} title={`${label}: ${n} (${Math.round((n / total) * 100)}%)`} style={{ width: `${(n / total) * 100}%`, background: SERIES[key] }} />
            ))}
        </div>
      ) : (
        <p className="text-sm text-stone-500">No tickets yet.</p>
      )}
      <ul className="mt-3 space-y-1">
        {parts.map(([key, label, n]) => (
          <li key={key} className="flex items-center gap-2 text-sm text-stone-700">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: SERIES[key] }} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <span className="tabular-nums text-stone-900">{n}</span>
            <span className="w-10 text-right text-xs tabular-nums text-stone-500">{total ? `${Math.round((n / total) * 100)}%` : ''}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-stone-200 pt-3 text-xs text-stone-500">
        The AI gave grounded steps for {ai.answered} of {ai.with_suggestion} tickets; for {ai.no_reliable_answer} the knowledge
        base had no reliable match, so it did not guess.
      </p>
    </>
  )
}

export default function Dashboard() {
  const { data: s, error, loading, reload } = useAsync(() => getStats(), [])

  if (loading && !s) return <Loading />
  if (error && !s) return <ErrorBox error={error} onRetry={reload} />

  const open = OPEN_STATUSES.reduce((sum, st) => sum + s.by_status[st], 0)
  const decided = s.ai.resolved_by_ai + s.ai.escalated
  const aiRate = decided ? `${Math.round((s.ai.resolved_by_ai / decided) * 100)}%` : '—'
  const statusRows = Object.entries(s.by_status).map(([st, n]) => [st, STATUS_LABELS[st], n])
  const categoryRows = Object.entries(s.by_category).map(([c, n]) => [c, c, n])
  const maxDept = Math.max(0, ...s.departments.map((d) => d.open))

  return (
    <div className="space-y-5">
      <Hero
        className=""
        subtitle={`${open} ticket${open === 1 ? ' is' : 's are'} open with technicians. Here is how the help desk is doing right now.`}
        action={
          <button onClick={reload} className={heroButton}>
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile kind="total" label="Total tickets" value={s.total} />
        <Tile kind="open" label="Open with technicians" value={open} hint="Escalated, assigned, in progress or awaiting approval" />
        <Tile kind="ai" label="Resolved by AI" value={aiRate} hint={`${s.ai.resolved_by_ai} of ${decided} tickets the employee answered (rest escalated)`} />
        <Tile
          kind="time"
          label="Avg. time to close"
          value={duration(s.avg_minutes_to_close)}
          hint="From creation to approved closure"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="AI outcome" subtitle="What happened after the AI suggestion">
          <AiOutcome ai={s.ai} />
        </Card>
        <Card title="Tickets by status" subtitle="Select a status to see those tickets">
          <BarList rows={statusRows} max={Math.max(...statusRows.map((r) => r[2]))} linkFor={(st) => `/tickets?status=${st}`} colorFor={(st) => STATUS_COLORS[st].hex} />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="By department" subtitle="Escalated tickets routed to each team">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500">
                  <th className="pb-2 font-medium">Department</th>
                  <th className="pb-2 font-medium">Open</th>
                  <th className="pb-2 pl-3 text-right font-medium">Awaiting approval</th>
                  <th className="pb-2 pl-3 text-right font-medium">Closed</th>
                  <th className="pb-2 pl-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {s.departments.map((d) => (
                  <tr key={d.name}>
                    <td className="py-2 pr-3 text-stone-700">{d.name}</td>
                    <td className="py-2 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="tabular-nums text-stone-900">{d.open}</span>
                        <span className="h-2 w-16 rounded-sm bg-stone-100" aria-hidden="true">
                          <span className="block h-2 rounded-sm" style={{ width: `${maxDept ? (d.open / maxDept) * 100 : 0}%`, background: BAR }} />
                        </span>
                      </span>
                    </td>
                    <td className="py-2 text-right tabular-nums text-stone-900">{d.awaiting_approval}</td>
                    <td className="py-2 text-right tabular-nums text-stone-900">{d.closed}</td>
                    <td className="py-2 text-right tabular-nums text-stone-900">{d.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="By category" subtitle="All tickets, as categorised by the employee">
          {categoryRows.length ? (
            <BarList
              rows={categoryRows}
              max={Math.max(...categoryRows.map((r) => r[2]))}
              colorFor={(c) => (CATEGORY_COLORS[c] || CATEGORY_COLORS.Other).hex}
            />
          ) : (
            <p className="text-sm text-stone-500">No tickets yet.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
