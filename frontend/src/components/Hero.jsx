import { useState } from 'react'
import { useAuth } from '../auth'
import { ROLE_COLORS } from '../colors'

const TONES = {
  sky: 'bg-sky-50 ring-sky-200 text-sky-700',
  violet: 'bg-violet-50 ring-violet-200 text-violet-700',
  amber: 'bg-amber-50 ring-amber-200 text-amber-700',
  orange: 'bg-orange-50 ring-orange-200 text-orange-700',
  blue: 'bg-blue-50 ring-blue-200 text-blue-700',
  teal: 'bg-teal-50 ring-teal-200 text-teal-700',
  emerald: 'bg-emerald-50 ring-emerald-200 text-emerald-700',
}

function greeting(now) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Welcome banner for each role's home page. `stats`: [{ label, value, tone }]; values may be null while loading.
export default function Hero({ subtitle, action, stats, className = 'mb-6' }) {
  const { user } = useAuth()
  const [now] = useState(() => new Date())
  const b = ROLE_COLORS[user.role]
  const firstName = user.name.trim().split(/\s+/)[0]
  const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className={`space-y-3 ${className}`}>
      <div className={`relative overflow-hidden rounded-xl px-6 py-7 text-white sm:px-8 ${b.panel}`}>
        <svg className="pointer-events-none absolute -top-6 right-0 h-48 w-72 max-sm:opacity-40" viewBox="0 0 288 192" aria-hidden="true">
          <circle cx="226" cy="58" r="46" fill={b.shapes[0]} />
          <rect x="132" y="96" width="84" height="84" rx="10" fill={b.shapes[1]} opacity="0.9" />
          <path d="M288 192h-72a72 72 0 0 1 72-72Z" fill={b.shapes[2]} />
          <circle cx="150" cy="40" r="8" fill="#fff" opacity="0.85" />
        </svg>
        <div className="relative max-w-lg">
          <p className={`text-xs font-medium ${b.sub}`}>{today}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
            {greeting(now)}, {firstName}
          </h1>
          {subtitle && <p className={`mt-1.5 text-sm ${b.sub}`}>{subtitle}</p>}
          {action && <div className="mt-5">{action}</div>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-lg px-4 py-3 ring-1 ring-inset ${TONES[s.tone]}`}>
              <p className="text-[1.625rem] leading-none font-semibold tabular-nums">{s.value ?? '–'}</p>
              <p className="mt-1.5 text-xs font-medium text-stone-600">{s.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// White button that sits on the coloured banner.
export const heroButton =
  'inline-flex items-center gap-1.5 rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-stone-900 shadow-[0_1px_2px_rgb(0_0_0/0.15)] transition-colors hover:bg-stone-100'
