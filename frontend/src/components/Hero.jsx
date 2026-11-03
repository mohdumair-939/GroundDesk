import { useState } from 'react'
import { useAuth } from '../auth'
import { ROLE_COLORS } from '../colors'
import { ROLE_LABELS } from '../constants'

const TONES = {
  sky: 'bg-sky-500',
  violet: 'bg-violet-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  teal: 'bg-teal-500',
  emerald: 'bg-emerald-500',
}

function greeting(now) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Welcome header for each role's home page. `stats`: [{ label, value, tone }]; values may be null while loading.
export default function Hero({ subtitle, action, stats, className = 'mb-6' }) {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const firstName = user.name.trim().split(/\s+/)[0]
  const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="card relative overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-1 bg-brand-600" aria-hidden="true" />
        <div className="flex flex-col gap-4 bg-linear-to-r from-brand-50/80 via-white to-white px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:py-6">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
              <span>{today}</span>
              <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${ROLE_COLORS[user.role].chip}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
              {greeting(now)}, {firstName}
            </h1>
            {subtitle && <p className="mt-1 max-w-xl text-sm text-stone-600">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card px-4 py-3.5">
              <p className="flex items-center gap-2 text-xs font-medium text-stone-500">
                <span className={`h-2 w-2 shrink-0 rounded-full ${TONES[s.tone]}`} aria-hidden="true" />
                <span className="truncate">{s.label}</span>
              </p>
              <p className="mt-1.5 text-2xl leading-none font-semibold tabular-nums text-stone-900">{s.value ?? '–'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Primary and secondary actions placed in the header.
export const heroButton =
  'btn-primary inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium sm:w-auto sm:py-2'
export const heroSecondaryButton =
  'btn-secondary inline-flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium sm:w-auto sm:py-2'
