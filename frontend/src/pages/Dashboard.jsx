import { motion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Bot,
  Building2,
  ChartBar,
  ChartPie,
  CircleCheck,
  Clock,
  Hourglass,
  Inbox,
  RefreshCw,
  Ticket,
  TrendingUp,
  Users as UsersIcon,
  Wrench,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { getKbSummary, getStats, listTechnicians, listTickets } from '../api'
import { useAuth } from '../auth'
import { CategoryTag, StatusBadge } from '../components/Badges'
import { BarList, Donut, StackedBars, TrendChart } from '../components/charts'
import { ErrorBox } from '../components/States'
import { AnimatedNumber, Avatar, PageHeader, Panel, Skeleton } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { CATEGORY_COLORS, STATUS_COLORS } from '../colors'
import { STATUS_LABELS } from '../constants'
import { useAsync } from '../useAsync'

const TREND_DAYS = 14
const TICKET_SAMPLE = 500 // the API's maximum page size
const OPEN_STATUSES = ['OPEN', 'SUGGESTION_PROVIDED', 'ESCALATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']
const WITH_TECH = ['ESCALATED', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_APPROVAL']
// Validated categorical slots (CVD-safe, labeled in the legend).
const AI_SERIES = { resolved: '#10b981', escalated: '#f59e0b', waiting: '#8b5cf6' }
const DEPT_SERIES = [
  { key: 'open', label: 'Open', color: '#6366f1' },
  { key: 'awaiting', label: 'Awaiting approval', color: '#f59e0b' },
  { key: 'closed', label: 'Closed', color: '#10b981' },
]

function duration(minutes) {
  if (minutes === null) return '—'
  if (minutes < 60) return `${minutes} min`
  if (minutes < 48 * 60) return `${(minutes / 60).toFixed(1)} h`
  return `${(minutes / 1440).toFixed(1)} days`
}

function greeting(now) {
  const h = now.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Tickets raised per day over the last `days` days, from created_at.
function dailyCounts(tickets, days) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const buckets = Array.from({ length: days }, (_, i) => {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    return { date, value: 0 }
  })
  for (const t of tickets) {
    const i = Math.floor((new Date(t.created_at) - start) / 86_400_000)
    if (i >= 0 && i < days) buckets[i].value++
  }
  return buckets
}

function Kpi({ label, value, format, hint, Icon, tone, to }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`} aria-hidden="true">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-[2rem] leading-none font-semibold tracking-tight tabular-nums text-slate-900">
        <AnimatedNumber value={value} format={format} />
      </p>
      {hint && <p className="mt-2.5 text-xs leading-snug text-slate-500 sm:truncate">{hint}</p>}
    </>
  )
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      {to ? (
        <Link to={to} className="card card-interactive block p-5">
          {body}
        </Link>
      ) : (
        <div className="card p-5">{body}</div>
      )}
    </motion.div>
  )
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card space-y-4 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="card p-5">
          <Skeleton className="mx-auto h-36 w-36 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const stats = useAsync(() => getStats(), [])
  const tickets = useAsync(() => listTickets({ limit: TICKET_SAMPLE }), [])
  const techs = useAsync(() => listTechnicians(), [])
  const kb = useAsync(() => getKbSummary(), [])
  const [spinning, setSpinning] = useState(false)
  const [now] = useState(() => new Date())
  const s = stats.data

  const trend = useMemo(() => (tickets.data ? dailyCounts(tickets.data, TREND_DAYS) : null), [tickets.data])

  function refresh() {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 700)
    stats.reload()
    tickets.reload()
    techs.reload()
    kb.reload()
  }

  if (stats.loading && !s) return <DashboardSkeleton />
  if (stats.error && !s) return <ErrorBox error={stats.error} onRetry={stats.reload} />

  const open = OPEN_STATUSES.reduce((sum, st) => sum + s.by_status[st], 0)
  const withTech = WITH_TECH.reduce((sum, st) => sum + s.by_status[st], 0)
  const resolved = s.by_status.RESOLVED + s.by_status.CLOSED
  const decided = s.ai.resolved_by_ai + s.ai.escalated
  const aiRate = decided ? Math.round((s.ai.resolved_by_ai / decided) * 100) : null
  const trendTotal = trend?.reduce((sum, d) => sum + d.value, 0) ?? 0
  const truncated = tickets.data?.length === TICKET_SAMPLE
  const pendingReview = kb.data?.articles.PENDING_REVIEW ?? null
  const today = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  const statusRows = Object.entries(s.by_status).map(([st, n]) => ({
    key: st,
    label: STATUS_LABELS[st],
    value: n,
    color: STATUS_COLORS[st].hex,
    to: `/tickets?status=${st}`,
  }))
  const categoryRows = Object.entries(s.by_category).map(([c, n]) => ({
    key: c,
    label: c,
    value: n,
    color: (CATEGORY_COLORS[c] || CATEGORY_COLORS.Other).hex,
    to: `/tickets?category=${encodeURIComponent(c)}`,
  }))
  const deptRows = s.departments.map((d) => ({
    key: d.name,
    label: d.name,
    segments: [
      { key: 'open', value: d.open },
      { key: 'awaiting', value: d.awaiting_approval },
      { key: 'closed', value: d.closed },
    ],
  }))
  const techList = [...(techs.data || [])].sort((a, b) => b.open_tickets - a.open_tickets || a.name.localeCompare(b.name))
  const maxLoad = Math.max(1, ...techList.map((t) => t.open_tickets))

  return (
    <div>
      <PageHeader
        eyebrow={<span>{today}</span>}
        title={`${greeting(now)}, ${user.name.trim().split(/\s+/)[0]}`}
        description={`${withTech} ticket${withTech === 1 ? ' is' : 's are'} with technicians right now. Here is how the help desk is doing.`}
        actions={
          <>
            <button onClick={refresh} className="btn btn-secondary">
              <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} aria-hidden="true" />
              Refresh
            </button>
            <Link to="/tickets" className="btn btn-primary">
              All tickets
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </>
        }
      />

      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Total tickets" value={s.total} Icon={Ticket} tone="bg-brand-50 text-brand-600" hint={`${trendTotal} raised in the last ${TREND_DAYS} days`} to="/tickets" />
        <Kpi label="Open tickets" value={open} Icon={Inbox} tone="bg-amber-50 text-amber-600" hint={`${withTech} with technicians`} />
        <Kpi
          label="Resolved tickets"
          value={resolved}
          Icon={CircleCheck}
          tone="bg-emerald-50 text-emerald-600"
          hint={`Avg. time to close: ${duration(s.avg_minutes_to_close)}`}
        />
        <Kpi
          label="AI-resolved"
          value={s.ai.resolved_by_ai}
          Icon={Bot}
          tone="bg-violet-50 text-violet-600"
          hint={aiRate === null ? 'No answered suggestions yet' : `${aiRate}% of answered suggestions`}
          to="/tickets?status=RESOLVED"
        />
      </motion.div>

      <motion.div variants={stagger(0.08, 0.15)} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Panel
            title="Ticket trend"
            subtitle={`Tickets raised per day, last ${TREND_DAYS} days${truncated ? ` (latest ${TICKET_SAMPLE} tickets)` : ''}`}
            icon={TrendingUp}
            className="h-full"
            action={
              <span className="text-right">
                <span className="block text-lg leading-none font-semibold tabular-nums text-slate-900">{trendTotal}</span>
                <span className="text-[11px] text-slate-500">raised</span>
              </span>
            }
          >
            {trend ? <TrendChart data={trend} /> : tickets.error ? <ErrorBox error={tickets.error} onRetry={tickets.reload} /> : <Skeleton className="h-[200px] w-full" />}
          </Panel>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Panel title="AI outcome" subtitle="What happened after the AI suggestion" icon={Bot} className="h-full">
            <Donut
              centerLabel="tickets"
              parts={[
                { key: 'resolved', label: 'Resolved by AI', value: s.ai.resolved_by_ai, color: AI_SERIES.resolved },
                { key: 'escalated', label: 'Escalated', value: s.ai.escalated, color: AI_SERIES.escalated },
                { key: 'waiting', label: 'Awaiting employee', value: s.ai.awaiting_answer, color: AI_SERIES.waiting },
              ]}
            />
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Grounded steps for <strong className="font-medium text-slate-700">{s.ai.answered}</strong> of {s.ai.with_suggestion} tickets. For{' '}
              {s.ai.no_reliable_answer} the knowledge base had no reliable match, so the AI did not guess.
            </p>
          </Panel>
        </motion.div>
      </motion.div>

      <motion.div variants={stagger(0.08, 0.25)} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <motion.div variants={fadeUp}>
          <Panel title="Status distribution" subtitle="Select a status to see those tickets" icon={ChartBar} className="h-full">
            <BarList rows={statusRows} labelWidth="w-32" />
          </Panel>
        </motion.div>
        <motion.div variants={fadeUp}>
          <Panel title="Departments" subtitle="Escalated tickets routed to each team" icon={Building2} className="h-full">
            <StackedBars rows={deptRows} series={DEPT_SERIES} />
          </Panel>
        </motion.div>
        <motion.div variants={fadeUp} className="lg:col-span-2 xl:col-span-1">
          <Panel title="By category" subtitle="As categorised by the employee" icon={ChartPie} className="h-full">
            {categoryRows.length ? <BarList rows={categoryRows} labelWidth="w-32" /> : <p className="text-sm text-slate-500">No tickets yet.</p>}
          </Panel>
        </motion.div>
      </motion.div>

      <motion.div variants={stagger(0.08, 0.35)} initial="hidden" animate="show" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <motion.div variants={fadeUp} className="lg:col-span-2">
          <Panel
            title="Recent tickets"
            subtitle="The latest tickets across the help desk"
            icon={Clock}
            className="h-full"
            bodyClassName="px-2 pb-2 pt-3"
            action={
              <Link to="/tickets" className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800">
                View all <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          >
            {!tickets.data ? (
              <div className="space-y-3 p-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : tickets.data.length === 0 ? (
              <p className="px-3 pb-3 text-sm text-slate-500">No tickets yet.</p>
            ) : (
              <ul>
                {tickets.data.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <Link to={`/tickets/${t.id}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50">
                      <span className="hidden w-16 shrink-0 font-mono text-xs text-slate-400 sm:block">{t.ticket_code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-brand-700">{t.title}</span>
                        <span className="block truncate text-xs text-slate-500">
                          <span className="sm:hidden">{t.ticket_code} · </span>
                          {t.user_name}
                        </span>
                      </span>
                      <span className="hidden md:block">
                        <CategoryTag category={t.category} />
                      </span>
                      <StatusBadge status={t.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>

        <motion.div variants={fadeUp} className="space-y-4">
          <Panel title="Quick actions" bodyClassName="grid gap-2 p-5 pt-4">
            {[
              { to: '/knowledge', label: 'Review KB articles', Icon: BookOpen, badge: pendingReview },
              { to: '/tickets?status=PENDING_APPROVAL', label: 'Awaiting approval', Icon: Hourglass, badge: s.by_status.PENDING_APPROVAL },
              { to: '/tickets?status=ESCALATED', label: 'Escalated tickets', Icon: Wrench, badge: s.by_status.ESCALATED },
              { to: '/users', label: 'Manage users', Icon: UsersIcon },
            ].map(({ to, label, Icon, badge }) => (
              <Link
                key={to}
                to={to}
                className="group flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-[border-color,background-color,transform] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
              >
                <Icon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-brand-600" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {badge > 0 && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-brand-700">{badge}</span>}
                <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" aria-hidden="true" />
              </Link>
            ))}
          </Panel>

          <Panel title="Technician workload" subtitle="Assigned + in progress per technician" icon={UsersIcon}>
            {!techs.data ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : (
              <ul className="scroll-thin -mr-2 max-h-72 space-y-3 overflow-y-auto pr-2">
                {techList.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <Avatar name={t.name} role="technician" className="h-8 w-8 text-[11px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-800">{t.name}</span>
                        <span className="shrink-0 text-xs tabular-nums text-slate-500">
                          <span className="font-semibold text-slate-900">{t.open_tickets}</span> open
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="truncate text-[11px] text-slate-500">{t.department.name}</span>
                        <span className="relative h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                          <motion.span
                            className="absolute inset-y-0 left-0 rounded-full bg-brand-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(t.open_tickets / maxLoad) * 100}%` }}
                            transition={{ duration: 0.7, ease: EASE, delay: 0.3 + i * 0.03 }}
                          />
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </motion.div>
      </motion.div>
    </div>
  )
}
