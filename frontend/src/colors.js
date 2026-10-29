// One colour per meaning, shared by every screen. Class strings are written out in full so
// Tailwind can find them. `hex` is for inline styles (chart bars).

export const STATUS_COLORS = {
  OPEN: { hex: '#0ea5e9', dot: 'bg-sky-500', pill: 'bg-sky-50 text-sky-800 ring-sky-200', edge: 'border-l-sky-500' },
  SUGGESTION_PROVIDED: { hex: '#8b5cf6', dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-800 ring-violet-200', edge: 'border-l-violet-500' },
  RESOLVED: { hex: '#10b981', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200', edge: 'border-l-emerald-500' },
  ESCALATED: { hex: '#f59e0b', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 ring-amber-200', edge: 'border-l-amber-500' },
  ASSIGNED: { hex: '#f97316', dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-800 ring-orange-200', edge: 'border-l-orange-500' },
  IN_PROGRESS: { hex: '#3b82f6', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-800 ring-blue-200', edge: 'border-l-blue-500' },
  PENDING_APPROVAL: { hex: '#14b8a6', dot: 'bg-teal-500', pill: 'bg-teal-50 text-teal-800 ring-teal-200', edge: 'border-l-teal-500' },
  CLOSED: { hex: '#a8a29e', dot: 'bg-stone-400', pill: 'bg-stone-100 text-stone-600 ring-stone-200', edge: 'border-l-stone-300' },
}

const icon = {
  wifi: 'M8.3 16.5a5.2 5.2 0 0 1 7.4 0M5 13.2a9.9 9.9 0 0 1 14 0M1.7 9.9a14.5 14.5 0 0 1 20.6 0M12 19.8h.01',
  app: 'M4 5h16v14H4zM4 9h16M7.5 7h.01M10 7h.01',
  chip: 'M8 4v2M12 4v2M16 4v2M8 18v2M12 18v2M16 18v2M4 8h2M4 12h2M4 16h2M18 8h2M18 12h2M18 16h2M7 6h10v12H7z',
  key: 'M15.5 8.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM12 12v8m0-3h3m-3 3h2',
  mail: 'M3.5 6h17v12h-17zM3.5 6l8.5 7 8.5-7',
  dots: 'M6 12h.01M12 12h.01M18 12h.01',
}

export const CATEGORY_COLORS = {
  Network: { hex: '#0ea5e9', tag: 'bg-sky-100 text-sky-800', icon: icon.wifi },
  Software: { hex: '#8b5cf6', tag: 'bg-violet-100 text-violet-800', icon: icon.app },
  Hardware: { hex: '#f97316', tag: 'bg-orange-100 text-orange-800', icon: icon.chip },
  'Account/Access': { hex: '#e11d48', tag: 'bg-rose-100 text-rose-800', icon: icon.key },
  Email: { hex: '#14b8a6', tag: 'bg-teal-100 text-teal-800', icon: icon.mail },
  Other: { hex: '#78716c', tag: 'bg-stone-200 text-stone-700', icon: icon.dots },
}

// panel/sub/accent/shapes: the bright role banners (home pages and the sign-in side panel).
export const ROLE_COLORS = {
  employee: {
    avatar: 'bg-sky-500 text-white',
    chip: 'bg-sky-50 text-sky-800 ring-sky-200',
    panel: 'bg-sky-600',
    sub: 'text-sky-100',
    accent: 'text-amber-300',
    ink: 'text-sky-700',
    button: 'bg-sky-600 hover:bg-sky-700',
    shapes: ['#fbbf24', '#7dd3fc', '#f97316'],
  },
  technician: {
    avatar: 'bg-orange-500 text-white',
    chip: 'bg-orange-50 text-orange-800 ring-orange-200',
    panel: 'bg-orange-600',
    sub: 'text-orange-100',
    accent: 'text-yellow-200',
    ink: 'text-orange-700',
    button: 'bg-orange-600 hover:bg-orange-700',
    shapes: ['#fde047', '#fdba74', '#0ea5e9'],
  },
  admin: {
    avatar: 'bg-violet-600 text-white',
    chip: 'bg-violet-50 text-violet-800 ring-violet-200',
    panel: 'bg-violet-600',
    sub: 'text-violet-100',
    accent: 'text-amber-300',
    ink: 'text-violet-700',
    button: 'bg-violet-600 hover:bg-violet-700',
    shapes: ['#fbbf24', '#c4b5fd', '#34d399'],
  },
}
