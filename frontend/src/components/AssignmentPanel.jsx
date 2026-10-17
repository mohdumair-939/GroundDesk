import { formatDate } from '../constants'

export default function AssignmentPanel({ assignment }) {
  const [rule, ...rest] = assignment.rule_matched.split('; ')
  return (
    <div className="rounded-lg border border-orange-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-orange-900">Assigned to technician</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-slate-500">Department</dt>
        <dd className="font-medium">{assignment.department.name}</dd>
        <dt className="text-slate-500">Technician</dt>
        <dd className="font-medium">
          {assignment.technician ? (
            <>
              {assignment.technician.name}{' '}
              <span className="font-normal text-slate-500">({assignment.technician.email})</span>
            </>
          ) : (
            'Team queue'
          )}
        </dd>
        <dt className="text-slate-500">Assigned</dt>
        <dd>{formatDate(assignment.assigned_at)}</dd>
      </dl>
      <div className="mt-4 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-900">
        <span className="font-medium">Why this team: </span>
        {rule}
        {rest.length > 0 && <span className="block text-xs text-orange-800/80">{rest.join('; ')}</span>}
      </div>
    </div>
  )
}
