import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'

const inputClass = 'mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm'

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
        <div>
          <h1 className="text-xl font-semibold">Create an employee account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Use your work email. Each email can have only one account and one role.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input required minLength={2} value={form.name} onChange={set('name')} className={inputClass} autoComplete="name" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email</span>
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
        <ServerStatus />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login?as=employee" className="font-medium text-slate-900 underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
