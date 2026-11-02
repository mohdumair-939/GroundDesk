export const CATEGORIES = ['Network', 'Software', 'Hardware', 'Account/Access', 'Email', 'Other']
export const PRIORITIES = ['Low', 'Medium', 'High']
export const ROLE_LABELS = { employee: 'Employee', technician: 'Technician', admin: 'Admin' }

export const STATUS_LABELS = {
  OPEN: 'Open',
  SUGGESTION_PROVIDED: 'Suggestion provided',
  RESOLVED: 'Resolved',
  ESCALATED: 'Escalated',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  PENDING_APPROVAL: 'Awaiting approval',
  CLOSED: 'Closed',
}
export const STATUSES = Object.keys(STATUS_LABELS)

export function formatDate(value) {
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// Knowledge-base articles proposed from resolved tickets.
export const KB_STATUS = {
  AWAITING_CLOSURE: {
    label: 'Waiting for the employee',
    text: 'Goes to admin review once the employee confirms the fix worked.',
    pill: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
  PENDING_REVIEW: {
    label: 'Waiting for review',
    text: 'The fix was confirmed. An admin will review it before the AI can use it.',
    pill: 'bg-sky-50 text-sky-800 ring-sky-200',
  },
  PUBLISHED: {
    label: 'Published',
    text: 'In the knowledge base. The AI now uses it for similar tickets.',
    pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  REJECTED: {
    label: 'Not added',
    text: 'This fix was not added to the knowledge base.',
    pill: 'bg-stone-100 text-stone-600 ring-stone-300',
  },
}
