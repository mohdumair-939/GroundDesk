import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'

const inputClass = 'field mt-1.5 block w-full px-3 py-2 text-sm'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    if (form.password.length < 8) return setError(new Error('Password must be at least 8 characters.'))
    if (form.password !== form.confirm) return setError(new Error('Passwords do not match.'))
    setBusy(true)
    setError(null)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Create an employee account</h2>
          <p className="mt-1.5 text-sm text-stone-500">
            Use your work email. Each email can have only one account and one role.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Full name</span>
          <input required minLength={2} value={form.name} onChange={set('name')} className={inputClass} autoComplete="name" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Email</span>
          <input type="email" required value={form.email} onChange={set('email')} className={inputClass} autoComplete="email" />
        </label>
        <PasswordInput
          label="Password"
          required
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
          hint="At least 8 characters."
        />
        <PasswordInput
          label="Confirm password"
          required
          value={form.confirm}
          onChange={set('confirm')}
          autoComplete="new-password"
        />
        <ErrorBox error={error} />
        <button
          type="submit"
          disabled={busy}
          className="btn-solid w-full bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="border-t border-stone-200 pt-5 text-sm text-stone-500">
          Already registered?{' '}
          <Link to="/login?as=employee" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700">
            Sign in
          </Link>
        </p>
        <ServerStatus />
      </form>
    </AuthLayout>
  )
}
