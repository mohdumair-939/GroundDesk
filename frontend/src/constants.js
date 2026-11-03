export const CATEGORIES = ['Network', 'Software', 'Hardware', 'Account/Access', 'Email', 'Other']
// Shown under the category picker so employees know where a problem belongs.
export const CATEGORY_HINTS = {
  Network: 'VPN, Wi-Fi, slow internet, shared drives, certificate errors, reaching cloud servers.',
  Software: 'Apps, Office files, OneDrive sync, browsers, Git, Docker, package installs, updates.',
  Hardware: 'Laptop, battery and charging, monitors, printers, keyboard, mouse, Bluetooth.',
  'Account/Access': 'Passwords, lockouts, MFA, single sign-on, cloud console or CLI access, file permissions.',
  Email: 'Outlook, mailbox full, phishing, email on your phone.',
  Other: 'Anything that does not fit the categories above.',
}
export const PRIORITY_HINTS = {
  Low: 'Minor issue or a request; you can keep working.',
  Medium: 'Slows down your work, but there is a workaround.',
  High: 'You cannot work, or many people are affected.',
}
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
