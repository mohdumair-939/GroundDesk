import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'
import { Spinner } from '../components/ui'

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
        <div className="mb-7">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Create your account</h2>
          <p className="mt-1.5 text-sm text-slate-500">Employee accounts only. Use your work email; each email has one account and one role.</p>
        </div>
        <div>
          <label htmlFor="reg-name" className="label">
            Full name
          </label>
          <input id="reg-name" required minLength={2} value={form.name} onChange={set('name')} className="field mt-1.5" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="reg-email" className="label">
            Work email
          </label>
          <input
            id="reg-email"
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            className="field mt-1.5"
            autoComplete="email"
            placeholder="name@company.com"
          />
        </div>
        <PasswordInput label="Password" required value={form.password} onChange={set('password')} autoComplete="new-password" hint="At least 8 characters." />
        <PasswordInput label="Confirm password" required value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
        <ErrorBox error={error} />
        <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full">
          {busy ? (
            <>
              <Spinner /> Creating account…
            </>
          ) : (
            'Create account'
          )}
        </button>
        <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login?as=employee" className="link">
            Sign in
          </Link>
          <div className="mt-4">
            <ServerStatus />
          </div>
        </div>
      </form>
    </AuthLayout>
  )
}
