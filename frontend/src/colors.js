// One colour per meaning, shared by every screen. Class strings are written out in full so
// Tailwind can find them. `hex` is for SVG charts and inline styles.
import { AppWindow, Cpu, Ellipsis, KeyRound, Mail, Wifi } from 'lucide-react'

export const STATUS_COLORS = {
  OPEN: { hex: '#0ea5e9', dot: 'bg-sky-500', pill: 'bg-sky-50 text-sky-800 ring-sky-200' },
  SUGGESTION_PROVIDED: { hex: '#8b5cf6', dot: 'bg-violet-500', pill: 'bg-violet-50 text-violet-800 ring-violet-200' },
  RESOLVED: { hex: '#10b981', dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-800 ring-emerald-200' },
  ESCALATED: { hex: '#f59e0b', dot: 'bg-amber-500', pill: 'bg-amber-50 text-amber-900 ring-amber-200' },
  ASSIGNED: { hex: '#f97316', dot: 'bg-orange-500', pill: 'bg-orange-50 text-orange-800 ring-orange-200' },
  IN_PROGRESS: { hex: '#3b82f6', dot: 'bg-blue-500', pill: 'bg-blue-50 text-blue-800 ring-blue-200' },
  PENDING_APPROVAL: { hex: '#14b8a6', dot: 'bg-teal-500', pill: 'bg-teal-50 text-teal-800 ring-teal-200' },
  CLOSED: { hex: '#94a3b8', dot: 'bg-slate-400', pill: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const CATEGORY_COLORS = {
  Network: { hex: '#0ea5e9', ink: 'text-sky-600', soft: 'bg-sky-50 text-sky-600', Icon: Wifi },
  Software: { hex: '#8b5cf6', ink: 'text-violet-600', soft: 'bg-violet-50 text-violet-600', Icon: AppWindow },
  Hardware: { hex: '#f97316', ink: 'text-orange-600', soft: 'bg-orange-50 text-orange-600', Icon: Cpu },
  'Account/Access': { hex: '#e11d48', ink: 'text-rose-600', soft: 'bg-rose-50 text-rose-600', Icon: KeyRound },
  Email: { hex: '#14b8a6', ink: 'text-teal-600', soft: 'bg-teal-50 text-teal-600', Icon: Mail },
  Other: { hex: '#64748b', ink: 'text-slate-500', soft: 'bg-slate-100 text-slate-600', Icon: Ellipsis },
}

export const PRIORITY_COLORS = {
  Low: { text: 'text-slate-500', soft: 'bg-slate-100 text-slate-700 ring-slate-200', hex: '#94a3b8' },
  Medium: { text: 'text-amber-600', soft: 'bg-amber-50 text-amber-800 ring-amber-200', hex: '#f59e0b' },
  High: { text: 'text-red-600', soft: 'bg-red-50 text-red-700 ring-red-200', hex: '#dc2626' },
}

export const ROLE_COLORS = {
  employee: { avatar: 'bg-sky-500 text-white', chip: 'bg-sky-50 text-sky-800 ring-sky-200' },
  technician: { avatar: 'bg-amber-500 text-white', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
  admin: { avatar: 'bg-brand-600 text-white', chip: 'bg-brand-50 text-brand-800 ring-brand-200' },
}
