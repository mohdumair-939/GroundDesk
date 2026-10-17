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
