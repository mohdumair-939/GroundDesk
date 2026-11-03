import { useState } from 'react'
import { useNavigate } from 'react-router'
import { createTicket } from '../api'
import { ErrorBox } from '../components/States'
import { CATEGORIES, CATEGORY_HINTS, PRIORITIES, PRIORITY_HINTS } from '../constants'

const EMPTY = { title: '', description: '', category: '', priority: 'Medium' }

// Mirrors the backend rules so most mistakes are caught before submitting.
function validate(form) {
  const errors = {}
  const title = form.title.trim()
  if (title.length < 5 || title.length > 120) errors.title = 'Title must be 5–120 characters.'
  if (form.description.trim().length < 20) errors.description = 'Please describe the problem in at least 20 characters.'
  if (!form.category) errors.category = 'Choose a category.'
  return errors
}

const inputClass = (hasError) =>
  `field mt-1.5 block w-full px-3 py-2 text-sm ${hasError ? 'border-red-400 focus:ring-red-500/15' : ''}`

function Field({ label, name, error, hint, children }) {
  return (
    <label className="block" htmlFor={name}>
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>
      )}
    </label>
  )
}

export default function NewTicket() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    const found = validate(form)
    setErrors(found)
    setSubmitError(null)
    if (Object.keys(found).length) return

    setSubmitting(true)
    try {
      const ticket = await createTicket(form)
      navigate(`/tickets/${ticket.id}`)
    } catch (err) {
      setErrors(err.fieldErrors || {})
      setSubmitError(err)
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-2xl">
      <h1 className="page-title">Raise a ticket</h1>
      <p className="mt-1 text-sm text-stone-500">
        Describe the problem. The help desk will suggest troubleshooting steps from its knowledge base.
      </p>

      <form onSubmit={onSubmit} noValidate className="card mt-5 space-y-5 p-5 sm:mt-6 sm:p-6">
        <Field label="Title" name="title" error={errors.title} hint={`${form.title.trim().length}/120`}>
          <input
            id="title"
            value={form.title}
            onChange={set('title')}
            maxLength={120}
            className={inputClass(errors.title)}
            placeholder="e.g. Can't connect to VPN from home"
          />
        </Field>

        <Field
          label="Description"
          name="description"
          error={errors.description}
          hint="What happened, the exact error message, when it started, and what you already tried."
        >
          <textarea
            id="description"
            rows={6}
            value={form.description}
            onChange={set('description')}
            className={inputClass(errors.description)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" name="category" error={errors.category} hint={CATEGORY_HINTS[form.category] || 'Pick the closest match; it decides which team helps you.'}>
            <select id="category" value={form.category} onChange={set('category')} className={inputClass(errors.category)}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority" name="priority" error={errors.priority} hint={PRIORITY_HINTS[form.priority]}>
            <select id="priority" value={form.priority} onChange={set('priority')} className={inputClass(errors.priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
        </div>

        <ErrorBox error={submitError} />

        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md px-3 py-2.5 text-sm font-medium sm:py-2 text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-4 py-2.5 text-sm font-medium disabled:opacity-50 sm:py-2"
          >
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}
