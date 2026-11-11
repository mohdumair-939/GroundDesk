import { motion } from 'motion/react'
import { ArrowRight, Headset, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth'
import AuthLayout from '../components/AuthLayout'
import PasswordInput from '../components/PasswordInput'
import ServerStatus from '../components/ServerStatus'
import { ErrorBox } from '../components/States'
import { Spinner } from '../components/ui'
import { EASE } from '../motion'
import { ROLE_LABELS } from '../constants'

const OPTIONS = [
  { role: 'employee', Icon: UserRound, text: 'Raise IT tickets and follow their progress.' },
  { role: 'technician', Icon: Headset, text: 'Work on the tickets assigned to you.' },
  { role: 'admin', Icon: ShieldCheck, text: 'Oversee all tickets, staff and accounts.' },
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

  // Arrow keys move between the role options, as in a native radio group.
  function onRoleKey(e) {
    const i = OPTIONS.findIndex((o) => o.role === role)
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = OPTIONS[(i + step + OPTIONS.length) % OPTIONS.length].role
    choose(next)
    e.currentTarget.querySelector(`[data-role="${next}"]`)?.focus()
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
    <AuthLayout>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h2>
      <p className="mt-1.5 text-sm text-slate-500">Sign in to your GroundDesk workspace.</p>

      <div className="mt-7 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Choose how to sign in" onKeyDown={onRoleKey}>
        {OPTIONS.map(({ role: r, Icon }) => {
          const selected = r === role
          return (
            <button
              key={r}
              type="button"
              role="radio"
              data-role={r}
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => choose(r)}
              className={`relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                selected ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="role-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-[0_1px_2px_rgb(15_23_42/0.08),0_1px_3px_rgb(15_23_42/0.06)] ring-1 ring-slate-200/70"
                  transition={{ duration: 0.3, ease: EASE }}
                />
              )}
              <Icon className={`relative hidden h-4 w-4 sm:block ${selected ? 'text-brand-600' : ''}`} aria-hidden="true" />
              <span className="relative">{ROLE_LABELS[r]}</span>
            </button>
          )
        })}
      </div>
      <motion.p key={role} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2.5 text-xs text-slate-500" aria-live="polite">
        {OPTIONS.find((o) => o.role === role).text}
      </motion.p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="login-email" className="label">
            Work email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-1.5"
            placeholder="name@company.com"
          />
        </div>
        <PasswordInput label="Password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorBox error={error} />
        <button type="submit" disabled={busy} className="btn btn-primary btn-lg group w-full">
          {busy ? (
            <>
              <Spinner /> Signing in…
            </>
          ) : (
            <>
              Continue as {ROLE_LABELS[role].toLowerCase()}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-8 border-t border-slate-200 pt-6 text-sm">
        {role === 'employee' ? (
          <p className="text-slate-500">
            New here?{' '}
            <Link to="/register" className="link">
              Create an employee account
            </Link>
          </p>
        ) : (
          <p className="text-slate-500">{ROLE_LABELS[role]} accounts are created by the help desk. Contact your admin if you cannot sign in.</p>
        )}
        <div className="mt-4">
          <ServerStatus />
        </div>
      </div>
    </AuthLayout>
  )
}
