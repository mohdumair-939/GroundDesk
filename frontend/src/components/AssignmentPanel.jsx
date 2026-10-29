import { formatDate } from '../constants'

export default function AssignmentPanel({ assignment }) {
  const [rule, ...rest] = assignment.rule_matched.split('; ')
  return (
    <div className="card overflow-hidden">
      <h2 className="flex items-center gap-2 border-b border-orange-100 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-950">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-white" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3-3 8-8-1.3-1.3a4 4 0 0 1-5-5L13 2l1.7 4.3ZM3 21l4-4" />
          </svg>
        </span>
        Assigned to technician
      </h2>
      <div className="p-5">
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-stone-500">Department</dt>
        <dd className="font-medium">{assignment.department.name}</dd>
        <dt className="text-stone-500">Technician</dt>
        <dd className="font-medium">
          {assignment.technician ? (
            <>
              {assignment.technician.name}{' '}
              <span className="font-normal text-stone-500">({assignment.technician.email})</span>
            </>
          ) : (
            'Team queue'
          )}
        </dd>
        <dt className="text-stone-500">Assigned</dt>
        <dd>{formatDate(assignment.assigned_at)}</dd>
      </dl>
      <div className="mt-4 rounded-md bg-orange-50/60 px-3 py-2.5 text-sm text-stone-700 ring-1 ring-orange-100">
        <span className="font-medium">Why this team: </span>
        {rule}
        {rest.length > 0 && <span className="block text-xs text-stone-500">{rest.join('; ')}</span>}
      </div>
      </div>
    </div>
  )
}
