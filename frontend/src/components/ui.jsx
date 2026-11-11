// Shared building blocks for every screen: headers, panels, counters, skeletons and motion presets.
import { animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { ROLE_COLORS } from '../colors'
import { EASE } from '../motion'

export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
    </motion.header>
  )
}

// A titled card. `action` sits at the top right (a link or small control).
export function Panel({ title, subtitle, action, icon: Icon, className = '', bodyClassName = '', children }) {
  return (
    <section className={`card ${className}`}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-5 pt-5">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600" aria-hidden="true">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0">
              <h2 className="section-title">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  )
}

// Counts up to `value` when it first appears or changes. Text stays correct for screen readers.
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString(), duration = 0.9 }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(0)
  const from = useRef(0)

  useEffect(() => {
    if (reduce || typeof value !== 'number') return
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, duration, reduce])

  const display = reduce || typeof value !== 'number' ? value : shown
  return (
    <>
      <span aria-hidden="true">{typeof display === 'number' ? format(display) : display}</span>
      <span className="sr-only">{typeof value === 'number' ? format(value) : value}</span>
    </>
  )
}

export function Skeleton({ className = '' }) {
  return <span className={`skeleton block ${className}`} aria-hidden="true" />
}

const initials = (name) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')

export function Avatar({ name, role, className = 'h-8 w-8 text-xs', muted = false }) {
  const tone = muted ? 'bg-slate-200 text-slate-500' : ROLE_COLORS[role]?.avatar || 'bg-slate-500 text-white'
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function Spinner({ className = 'h-4 w-4' }) {
  return <span className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden="true" />
}

// A segmented progress bar, e.g. a technician's queue split by stage.
export function SegmentBar({ segments, className = 'h-2' }) {
  const total = segments.reduce((s, x) => s + x.value, 0)
  return (
    <div className={`flex gap-0.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
      {total > 0 &&
        segments
          .filter((s) => s.value > 0)
          .map((s, i) => (
            <motion.span
              key={s.label}
              title={`${s.label}: ${s.value}`}
              initial={{ width: 0 }}
              animate={{ width: `${(s.value / total) * 100}%` }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.1 + i * 0.05 }}
              style={{ background: s.color }}
              className="h-full"
            />
          ))}
    </div>
  )
}
