import { Building2, Route } from 'lucide-react'
import { formatDate } from '../constants'
import { Avatar } from './ui'

// Who the ticket went to and the rule that sent it there (rule-based, explainable routing).
export default function AssignmentPanel({ assignment }) {
  const [rule, ...rest] = assignment.rule_matched.split('; ')
  const tech = assignment.technician
  return (
    <section className="card p-5">
      <h2 className="section-title">Assignment</h2>
      <div className="mt-4 flex items-center gap-3">
        {tech ? (
          <Avatar name={tech.name} role="technician" className="h-10 w-10 text-sm" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-hidden="true">
            <Building2 className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">{tech ? tech.name : 'Team queue'}</p>
          <p className="truncate text-xs text-slate-500">{tech ? tech.email : 'No technician yet'}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Department</dt>
          <dd className="text-right font-medium text-slate-800">{assignment.department.name}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Assigned</dt>
          <dd className="text-right text-slate-800">{formatDate(assignment.assigned_at)}</dd>
        </div>
      </dl>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Route className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          Why this team
        </p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{rule}</p>
        {rest.length > 0 && <p className="mt-1 text-xs leading-relaxed text-slate-500">{rest.join('; ')}</p>}
      </div>
    </section>
  )
}
