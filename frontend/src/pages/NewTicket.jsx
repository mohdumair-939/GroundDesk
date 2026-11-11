import { motion } from 'motion/react'
import { ArrowLeft, BookOpen, CircleCheck, Route, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { createTicket } from '../api'
import { ErrorBox } from '../components/States'
import { useToast } from '../components/Toast'
import { PageHeader, Spinner } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { CATEGORY_COLORS, PRIORITY_COLORS } from '../colors'
import { CATEGORIES, CATEGORY_HINTS, PRIORITIES, PRIORITY_HINTS } from '../constants'

const EMPTY = { title: '', description: '', category: '', priority: 'Medium' }
const TITLE_MAX = 120
const DESC_MIN = 20

// Mirrors the backend rules so most mistakes are caught before submitting.
function validate(form) {
  const errors = {}
  const title = form.title.trim()
  if (title.length < 5 || title.length > TITLE_MAX) errors.title = 'Title must be 5–120 characters.'
  if (form.description.trim().length < DESC_MIN) errors.description = `Please describe the problem in at least ${DESC_MIN} characters.`
  if (!form.category) errors.category = 'Choose a category.'
  return errors
}

const NEXT_STEPS = [
  { Icon: BookOpen, title: 'Knowledge base search', text: 'Your description is matched against the IT guides.' },
  { Icon: Sparkles, title: 'Grounded suggestion', text: 'You get numbered steps with their sources, usually within seconds. No reliable match means no guess.' },
  { Icon: Route, title: 'Technician if needed', text: 'Not fixed? Escalate and the ticket is routed to the right team by clear rules.' },
]

function FieldError({ id, children }) {
  if (!children) return null
  return (
    <motion.span id={id} initial={{ opacity: 0, y: -2 }} animate={{ opacity: 1, y: 0 }} className="mt-1.5 block text-xs font-medium text-red-600">
      {children}
    </motion.span>
  )
}

export default function NewTicket() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => {
    const next = { ...form, [key]: e.target.value }
    setForm(next)
    // After the first submit attempt, errors update live as the user fixes them.
    if (touched) setErrors(validate(next))
  }

  async function onSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setTouched(true)
    setSubmitError(null)
    if (Object.keys(found).length) {
      document.getElementById(Object.keys(found)[0] === 'category' ? 'category-Network' : Object.keys(found)[0])?.focus()
      return
    }

    setSubmitting(true)
    try {
      const ticket = await createTicket(form)
      toast({ title: `Ticket ${ticket.ticket_code} created`, description: 'The AI is searching the knowledge base for a fix.' })
      navigate(`/tickets/${ticket.id}`)
    } catch (err) {
      setErrors(err.fieldErrors || {})
      setSubmitError(err)
      setSubmitting(false)
      toast({ type: 'error', title: 'Ticket not submitted', description: err.message })
    }
  }

  const titleLen = form.title.trim().length
  const descLen = form.description.trim().length

  return (
    <section>
      <Link to="/" className="btn btn-ghost btn-sm -ml-2.5 mb-3 text-slate-500">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        My tickets
      </Link>
      <PageHeader title="Raise a ticket" description="Describe the problem. The help desk will suggest troubleshooting steps from its knowledge base." />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <form onSubmit={onSubmit} noValidate className="card overflow-hidden">
          <div className="space-y-6 p-5 sm:p-7">
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="title" className="label">
                  Title
                </label>
                <span className={`text-xs tabular-nums ${titleLen > TITLE_MAX - 10 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {titleLen}/{TITLE_MAX}
                </span>
              </div>
              <input
                id="title"
                value={form.title}
                onChange={set('title')}
                maxLength={TITLE_MAX}
                className={`field mt-1.5 ${errors.title ? 'field-error' : ''}`}
                placeholder="e.g. Can't connect to VPN from home"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              <FieldError id="title-error">{errors.title}</FieldError>
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                rows={6}
                value={form.description}
                onChange={set('description')}
                className={`field mt-1.5 resize-y ${errors.description ? 'field-error' : ''}`}
                placeholder="What happened, the exact error message, when it started, and what you already tried."
                aria-invalid={!!errors.description}
                aria-describedby="description-help"
              />
              <div id="description-help" className="mt-2 flex items-center gap-3">
                <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  <motion.span
                    className={`block h-full rounded-full ${descLen >= DESC_MIN ? 'bg-emerald-500' : 'bg-brand-400'}`}
                    animate={{ width: `${Math.min(descLen / DESC_MIN, 1) * 100}%` }}
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                </span>
                <span className={`text-xs ${descLen >= DESC_MIN ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {descLen >= DESC_MIN ? (
                    <span className="inline-flex items-center gap-1">
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> Enough detail
                    </span>
                  ) : (
                    `${DESC_MIN - descLen} more characters`
                  )}
                </span>
              </div>
              <FieldError id="description-error">{errors.description}</FieldError>
            </div>

            <fieldset aria-describedby="category-hint">
              <legend className="label">Category</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CATEGORIES.map((c) => {
                  const { Icon, soft } = CATEGORY_COLORS[c]
                  const checked = form.category === c
                  return (
                    <label
                      key={c}
                      className={`relative flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-[border-color,background-color,box-shadow] has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-brand-500/20 ${
                        checked
                          ? 'border-brand-500 bg-brand-50/60 text-slate-900 shadow-[0_0_0_1px_var(--color-brand-500)]'
                          : errors.category
                            ? 'border-red-300 text-slate-700 hover:border-red-400'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input id={`category-${c.replace('/', '-')}`} type="radio" name="category" value={c} checked={checked} onChange={set('category')} className="sr-only" />
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${soft}`} aria-hidden="true">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 leading-tight break-words">{c}</span>
                    </label>
                  )
                })}
              </div>
              <p id="category-hint" className="hint min-h-[1.25rem]">
                {CATEGORY_HINTS[form.category] || 'Pick the closest match; it decides which team helps you.'}
              </p>
              <FieldError id="category-error">{errors.category}</FieldError>
            </fieldset>

            <fieldset aria-describedby="priority-hint">
              <legend className="label">Priority</legend>
              <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {PRIORITIES.map((p) => {
                  const checked = form.priority === p
                  return (
                    <label
                      key={p}
                      className={`relative flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                        checked ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <input type="radio" name="priority" value={p} checked={checked} onChange={set('priority')} className="sr-only" />
                      {checked && (
                        <motion.span
                          layoutId="priority-pill"
                          className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_1px_3px_rgb(15_23_42/0.06)]"
                          transition={{ duration: 0.25, ease: EASE }}
                        />
                      )}
                      <span className="relative h-2 w-2 rounded-full" style={{ background: PRIORITY_COLORS[p].hex }} aria-hidden="true" />
                      <span className="relative">{p}</span>
                    </label>
                  )
                })}
              </div>
              <p id="priority-hint" className="hint">
                {PRIORITY_HINTS[form.priority]}
              </p>
            </fieldset>

            <ErrorBox error={submitError} />
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-lg">
              {submitting ? (
                <>
                  <Spinner /> Submitting…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" aria-hidden="true" /> Submit ticket
                </>
              )}
            </button>
          </div>
        </form>

        <motion.aside variants={stagger(0.08, 0.2)} initial="hidden" animate="show" className="card relative overflow-hidden p-5 lg:sticky lg:top-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-brand-50 to-transparent" aria-hidden="true" />
          <h2 className="relative section-title">What happens next</h2>
          <ol className="relative mt-4 space-y-4">
            {NEXT_STEPS.map(({ Icon, title, text }, i) => (
              <motion.li key={title} variants={fadeUp} className="flex gap-3">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600 shadow-card ring-1 ring-slate-200" aria-hidden="true">
                  <Icon className="h-4 w-4" />
                  {i < NEXT_STEPS.length - 1 && <span className="absolute top-9 left-1/2 h-4 w-px -translate-x-1/2 bg-slate-200" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-900">{title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{text}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </motion.aside>
      </div>
    </section>
  )
}
