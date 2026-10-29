import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'
import { ROLE_COLORS } from '../colors'
import { ROLE_LABELS } from '../constants'

const OPTIONS = [
  { role: 'employee', text: 'Raise IT tickets and follow their progress.' },
  { role: 'technician', text: 'Work on the tickets assigned to you.' },
  { role: 'admin', text: 'Oversee all tickets, staff and accounts.' },
]

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const role = OPTIONS.some((o) => o.role === params.get('as')) ? params.get('as') : 'employee'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function choose(next) {
    setParams({ as: next }, { replace: true })
    setError(null)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email.trim(), password, role)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <AuthLayout role={role}>
      <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Sign in</h2>
      <p className="mt-1.5 text-sm text-stone-500">{OPTIONS.find((o) => o.role === role).text}</p>

      <div
        className="mt-6 grid grid-cols-3 gap-1 rounded-lg border border-stone-200 bg-stone-100 p-1"
        role="radiogroup"
        aria-label="Choose how to sign in"
      >
        {OPTIONS.map((o) => {
          const selected = o.role === role
          return (
            <button
              key={o.role}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => choose(o.role)}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition-colors ${
                selected ? `bg-white ${ROLE_COLORS[o.role].ink} shadow-[0_1px_2px_rgb(28_25_23/0.1)] ring-1 ring-stone-200` : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {ROLE_LABELS[o.role]}
            </button>
          )
        })}
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium text-stone-700">Work email</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-1.5 block w-full px-3 py-2 text-sm"
            placeholder="name@company.com"
          />
        </label>
        <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorBox error={error} />
        <button type="submit" disabled={busy} className={`btn-solid w-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${ROLE_COLORS[role].button}`}>
          {busy ? 'Signing in…' : `Continue as ${ROLE_LABELS[role].toLowerCase()}`}
        </button>
      </form>

      <div className="mt-6 border-t border-stone-200 pt-5 text-sm">
        {role === 'employee' ? (
          <p className="text-stone-500">
            New here?{' '}
            <Link to="/register" className="font-medium text-brand-700 underline decoration-brand-200 underline-offset-4 hover:decoration-brand-700">
              Create an employee account
            </Link>
          </p>
        ) : (
          <p className="text-stone-500">
            {ROLE_LABELS[role]} accounts are created by the help desk. Contact your admin if you cannot sign in.
          </p>
        )}
        <div className="mt-4">
          <ServerStatus />
        </div>
      </div>
    </AuthLayout>
  )
}
