import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'
import { ROLE_LABELS } from '../constants'

const OPTIONS = [
  {
    role: 'employee',
    title: 'Login as Employee',
    text: 'Raise IT tickets and follow their progress.',
    icon: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.1a7.5 7.5 0 0 1 15 0',
    active: 'border-sky-500 bg-sky-50 ring-sky-500',
  },
  {
    role: 'technician',
    title: 'Login as Technician',
    text: 'Work on the tickets assigned to you.',
    icon: 'M11.42 15.17 17.25 21A2.65 2.65 0 0 0 21 17.25l-5.88-5.88M11.42 15.17l2.5-3.03c.31-.38.73-.62 1.2-.76.55-.16 1.16-.18 1.73-.13a4.5 4.5 0 0 0 4.46-6.24l-3.28 3.28a3 3 0 0 1-2.25-2.25l3.28-3.28a4.5 4.5 0 0 0-6.24 4.46c.07.85-.06 1.79-.72 2.33l-.09.07m3.1 3.65-4.66 5.66a2.55 2.55 0 1 1-3.58-3.58l5.66-4.66',
    active: 'border-orange-500 bg-orange-50 ring-orange-500',
  },
  {
    role: 'admin',
    title: 'Login as Admin',
    text: 'Oversee all tickets, staff and accounts.',
    icon: 'M9 12.75 11.25 15 15 9.75m-3-7.04A11.96 11.96 0 0 1 3.6 6 12 12 0 0 0 3 9.75c0 5.6 3.82 10.3 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29Z',
    active: 'border-violet-500 bg-violet-50 ring-violet-500',
  },
]

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-3xl">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Smart Help Desk</h1>
          <p className="mt-1 text-sm text-slate-500">IT support ticketing with AI troubleshooting suggestions</p>
          <div className="mt-3">
            <ServerStatus />
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Choose how to sign in">
          {OPTIONS.map((o) => {
            const selected = o.role === role
            return (
              <button
                key={o.role}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => choose(o.role)}
                className={`flex items-start gap-3 rounded-lg border bg-white p-4 text-left transition ${
                  selected ? `${o.active} ring-1` : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={selected ? 'text-slate-900' : 'text-slate-400'}>
                  <Icon path={o.icon} />
                </span>
                <span>
                  <span className="block font-medium text-slate-900">{o.title}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{o.text}</span>
                </span>
              </button>
            )
          })}
        </div>

        <form onSubmit={onSubmit} className="mx-auto mt-6 max-w-md space-y-4 rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">{ROLE_LABELS[role]} sign in</h2>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorBox error={error} />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {busy ? 'Signing in…' : `Sign in as ${ROLE_LABELS[role]}`}
          </button>
          {role === 'employee' ? (
            <p className="text-center text-sm text-slate-500">
              New here?{' '}
              <Link to="/register" className="font-medium text-slate-900 underline">
                Create an employee account
              </Link>
            </p>
          ) : (
            <p className="text-center text-xs text-slate-400">
              {ROLE_LABELS[role]} accounts are created by the help desk. Contact your admin if you cannot sign in.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
