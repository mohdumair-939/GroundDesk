// Lightweight SVG charts (no chart library). Thin marks, 4px rounded data ends, 2px gaps between
// segments, a hover tooltip on every mark, text in neutral ink, and a screen-reader table or
// label for each chart so the data never depends on colour or hover alone.
import { motion } from 'motion/react'
import { useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { EASE } from '../motion'

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

function Tooltip({ tip }) {
  if (!tip) return null
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-raised"
      style={{ left: tip.x, top: tip.y - 8 }}
      role="presentation"
    >
      {tip.content}
    </div>
  )
}

const niceMax = (n) => {
  if (n <= 4) return 4
  const step = 10 ** Math.floor(Math.log10(n))
  return Math.ceil(n / step) * step
}

// Area chart for a single daily series: [{ date: Date, value }].
export function TrendChart({ data, height = 200, label = 'Tickets raised' }) {
  const [ref, width] = useWidth()
  const [hover, setHover] = useState(null)
  const pad = { top: 12, right: 8, bottom: 26, left: 28 }
  const w = Math.max(width - pad.left - pad.right, 10)
  const h = height - pad.top - pad.bottom
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const x = (i) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * w : w / 2)
  const y = (v) => pad.top + h - (v / max) * h
  const points = data.map((d, i) => [x(i), y(d.value)])
  const line = points.map(([px, py], i) => `${i ? 'L' : 'M'}${px},${py}`).join(' ')
  const area = `${line} L${x(data.length - 1)},${pad.top + h} L${x(0)},${pad.top + h} Z`
  const fmt = (d) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const ticks = [0, max / 2, max]
  const labelIdx = [0, Math.floor((data.length - 1) / 2), data.length - 1]

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = e.clientX - rect.left - pad.left
    const i = Math.round((rel / w) * (data.length - 1))
    setHover(Math.min(Math.max(i, 0), data.length - 1))
  }

  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} className="block overflow-visible" onPointerMove={onMove} onPointerLeave={() => setHover(null)} aria-hidden="true">
          <defs>
            <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray={t ? '3 4' : undefined} />
              <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {labelIdx.map((i, n) => (
            <text key={n} x={x(i)} y={height - 6} textAnchor={n === 0 ? 'start' : n === 2 ? 'end' : 'middle'} className="fill-slate-400 text-[11px]">
              {fmt(data[i].date)}
            </text>
          ))}
          <motion.path d={area} fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
          <motion.path
            d={line}
            fill="none"
            stroke="#4f46e5"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: EASE }}
          />
          {hover !== null && (
            <g>
              <line x1={points[hover][0]} x2={points[hover][0]} y1={pad.top} y2={pad.top + h} stroke="#94a3b8" strokeDasharray="3 3" />
              <circle cx={points[hover][0]} cy={points[hover][1]} r="5" fill="#4f46e5" stroke="#fff" strokeWidth="2" />
            </g>
          )}
          <rect x={pad.left} y={pad.top} width={w} height={h} fill="transparent" />
        </svg>
      )}
      <Tooltip
        tip={
          hover !== null && {
            x: points[hover][0],
            y: points[hover][1],
            content: (
              <>
                <span className="text-slate-300">{fmt(data[hover].date)}</span> · <strong className="font-semibold">{data[hover].value}</strong>{' '}
                {data[hover].value === 1 ? 'ticket' : 'tickets'}
              </>
            ),
          }
        }
      />
      <table className="sr-only">
        <caption>
          {label}: {total} in the last {data.length} days
        </caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date.toISOString()}>
              <th scope="row">{fmt(d.date)}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Donut for a few parts of a whole: [{ key, label, value, color }]. Legend with values beside it.
export function Donut({ parts, size = 148, thickness = 16, centerLabel = 'total' }) {
  const [hover, setHover] = useState(null)
  const total = parts.reduce((s, p) => s + p.value, 0)
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const gap = total && parts.filter((p) => p.value).length > 1 ? 3 : 0
  let offset = 0
  const active = parts.find((p) => p.key === hover)

  return (
    // Side by side only where the card is wide (full-width on tablets, very wide desktops).
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col 2xl:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(', ')}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
          {total > 0 &&
            parts.map((p, i) => {
              const len = (p.value / total) * c
              const dash = Math.max(len - gap, 0)
              const seg = (
                <motion.circle
                  key={p.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={hover === p.key ? thickness + 3 : thickness}
                  strokeLinecap="butt"
                  initial={{ strokeDasharray: `0 ${c}` }}
                  animate={{ strokeDasharray: `${dash} ${c - dash}` }}
                  transition={{ duration: 0.9, ease: EASE, delay: 0.15 + i * 0.08 }}
                  strokeDashoffset={-offset}
                  onPointerEnter={() => setHover(p.key)}
                  onPointerLeave={() => setHover(null)}
                  className="cursor-default transition-[stroke-width] duration-150"
                />
              )
              offset += len
              return p.value ? seg : null
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums text-slate-900">{active ? active.value : total}</span>
          <span className="max-w-[6.5rem] truncate text-[11px] text-slate-500">{active ? active.label : centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {parts.map((p) => (
          <li
            key={p.key}
            onPointerEnter={() => setHover(p.key)}
            onPointerLeave={() => setHover(null)}
            className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition-colors ${hover === p.key ? 'bg-slate-50' : ''}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-700">{p.label}</span>
            <span className="tabular-nums font-medium text-slate-900">{p.value}</span>
            <span className="w-9 text-right text-xs tabular-nums text-slate-500">{total ? `${Math.round((p.value / total) * 100)}%` : '–'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Horizontal bars: [{ key, label, value, color, to? }]. Each row is labeled and valued in text.
export function BarList({ rows, labelWidth = 'w-32 sm:w-40' }) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-1">
      {rows.map((r, i) => {
        const width = max ? Math.max((r.value / max) * 100, r.value ? 2 : 0) : 0
        const inner = (
          <>
            <span className={`${labelWidth} shrink-0 truncate text-sm text-slate-600 group-hover:text-slate-900`}>{r.label}</span>
            <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: r.color }}
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + i * 0.04 }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums text-slate-900">{r.value}</span>
          </>
        )
        const cls = 'group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors'
        return (
          <li key={r.key} title={`${r.label}: ${r.value}`}>
            {r.to ? (
              <Link to={r.to} className={`${cls} hover:bg-slate-50`} aria-label={`${r.label}: ${r.value}. Show these tickets`}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// One stacked bar per row: rows [{ key, label, segments: [{ key, value }] }], series [{ key, label, color }].
export function StackedBars({ rows, series }) {
  const [tip, setTip] = useState(null)
  const wrap = useRef(null)
  const max = Math.max(1, ...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)))

  function show(e, row, seg, s) {
    const box = wrap.current.getBoundingClientRect()
    const el = e.currentTarget.getBoundingClientRect()
    setTip({
      x: el.left - box.left + el.width / 2,
      y: el.top - box.top,
      content: (
        <>
          <span className="text-slate-300">{row.label}</span> · {s.label}: <strong className="font-semibold">{seg.value}</strong>
        </>
      ),
    })
  }

  return (
    <div ref={wrap} className="relative">
      <ul className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <ul className="space-y-3.5">
        {rows.map((row, ri) => {
          const total = row.segments.reduce((s, x) => s + x.value, 0)
          return (
            <li key={row.key}>
              <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-slate-700">{row.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-slate-500">
                  <span className="font-medium text-slate-900">{total}</span> total
                </span>
              </div>
              <div className="h-2.5 rounded-[4px] bg-slate-100">
              <motion.div
                className="flex h-2.5 gap-[2px]"
                initial={{ width: 0 }}
                animate={{ width: `${(total / max) * 100}%` }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 + ri * 0.05 }}
                aria-label={`${row.label}: ${row.segments.map((seg) => `${series.find((s) => s.key === seg.key).label} ${seg.value}`).join(', ')}`}
                role="img"
              >
                {row.segments
                  .filter((seg) => seg.value > 0)
                  .map((seg, i, arr) => {
                    const s = series.find((x) => x.key === seg.key)
                    return (
                      <span
                        key={seg.key}
                        onPointerEnter={(e) => show(e, row, seg, s)}
                        onPointerLeave={() => setTip(null)}
                        className={`h-full transition-opacity hover:opacity-80 ${i === 0 ? 'rounded-l-[4px]' : ''} ${i === arr.length - 1 ? 'rounded-r-[4px]' : ''}`}
                        style={{ flexGrow: seg.value, flexBasis: 0, background: s.color }}
                      />
                    )
                  })}
              </motion.div>
              </div>
            </li>
          )
        })}
      </ul>
      <Tooltip tip={tip} />
    </div>
  )
}
