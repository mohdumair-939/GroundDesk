import { useState } from 'react'
import { useNavigate } from 'react-router'
import { createTicket } from '../api'
import { ErrorBox } from '../components/States'
import { CATEGORIES, PRIORITIES } from '../constants'

const EMPTY = { title: '', description: '', category: '', priority: 'Medium', user_name: '', user_email: '' }

// Mirrors the backend rules so most mistakes are caught before submitting.
function validate(form) {
  const errors = {}
  const title = form.title.trim()
  if (title.length < 5 || title.length > 120) errors.title = 'Title must be 5–120 characters.'
  if (form.description.trim().length < 20) errors.description = 'Please describe the problem in at least 20 characters.'
  if (!form.category) errors.category = 'Choose a category.'
  if (form.user_name.trim().length < 2) errors.user_name = 'Enter your name.'
  if (!/^\S+@\S+\.\S+$/.test(form.user_email.trim())) errors.user_email = 'Enter a valid email address.'
  return errors
}

const inputClass = (hasError) =>
  `mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm ${hasError ? 'border-red-400' : 'border-slate-300'}`

function Field({ label, name, error, hint, children }) {
  return (
    <label className="block" htmlFor={name}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>
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
      <h1 className="text-xl font-semibold">Raise a ticket</h1>
      <p className="mt-1 text-sm text-slate-500">
        Describe the problem. The help desk will suggest troubleshooting steps from its knowledge base.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
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
          hint="What happened, any error message, and what you already tried."
        >
          <textarea
            id="description"
            rows={5}
            value={form.description}
            onChange={set('description')}
            className={inputClass(errors.description)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" name="category" error={errors.category}>
            <select id="category" value={form.category} onChange={set('category')} className={inputClass(errors.category)}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Priority" name="priority" error={errors.priority}>
            <select id="priority" value={form.priority} onChange={set('priority')} className={inputClass(errors.priority)}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <Field label="Your name" name="user_name" error={errors.user_name}>
            <input
              id="user_name"
              value={form.user_name}
              onChange={set('user_name')}
              className={inputClass(errors.user_name)}
              autoComplete="name"
            />
          </Field>
          <Field label="Your email" name="user_email" error={errors.user_email}>
            <input
              id="user_email"
              type="email"
              value={form.user_email}
              onChange={set('user_email')}
              className={inputClass(errors.user_email)}
              autoComplete="email"
            />
          </Field>
        </div>

        <ErrorBox error={submitError} />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit ticket'}
          </button>
        </div>
      </form>
    </section>
  )
}
