import { AnimatePresence, motion } from 'motion/react'
import { KeyRound, Search, UserCheck, UserX, Users as UsersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { listUsers, updateUser } from '../api'
import { useAuth } from '../auth'
import PasswordInput from '../components/PasswordInput'
import { Empty, ErrorBox, Loading } from '../components/States'
import { useToast } from '../components/Toast'
import { Avatar, PageHeader, Spinner } from '../components/ui'
import { EASE, fadeUp, stagger } from '../motion'
import { ROLE_COLORS } from '../colors'
import { ROLE_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

function PasswordReset({ onSave, onCancel, busy }) {
  const [password, setPassword] = useState('')
  return (
    <motion.form
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
      onSubmit={(e) => {
        e.preventDefault()
        onSave(password)
      }}
      className="overflow-hidden"
    >
      <div className="mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <PasswordInput
            label="New password"
            minLength={8}
            required
            autoComplete="new-password"
            placeholder="8+ characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button disabled={busy || password.length < 8} className="btn btn-primary flex-1 sm:flex-none">
            {busy && <Spinner />}
            Save
          </button>
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    </motion.form>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const toast = useToast()
  const [role, setRole] = useState('')
  const [query, setQuery] = useState('')
  const [q, setQ] = useState('')
  const users = useAsync(() => listUsers({ role, q }), [role, q])
  const [busyId, setBusyId] = useState(null)
  const [resetId, setResetId] = useState(null)
  const [error, setError] = useState(null)

  // Debounce the search so typing does not send a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setQ(query.trim()), 300)
    return () => clearTimeout(timer)
  }, [query])

  async function change(u, changes, done) {
    setBusyId(u.id)
    setError(null)
    try {
      await updateUser(u.id, changes)
      toast({ title: done })
      setResetId(null)
      users.reload()
    } catch (err) {
      setError(err)
      toast({ type: 'error', title: 'That did not go through', description: err.message })
    } finally {
      setBusyId(null)
    }
  }

  const list = users.data || []

  return (
    <section>
      <PageHeader
        title="Users"
        description="Every email has exactly one account and one role. Employees register themselves; technician and admin accounts are seeded by the help desk."
      />

      <div className="card mb-4 grid gap-2 p-3 sm:flex sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input type="search" placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} className="field pl-9" aria-label="Search users" />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="field sm:w-44" aria-label="Filter by role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {users.data && <span className="px-1 text-xs text-slate-500 sm:pl-2">{list.length} users</span>}
      </div>

      {(users.error || error) && (
        <div className="mb-4">
          <ErrorBox error={users.error || error} onRetry={users.error ? users.reload : undefined} />
        </div>
      )}
      {users.loading && !users.data && <Loading label="Loading users" />}
      {users.data && list.length === 0 && <Empty icon={UsersIcon} title="No users match" />}

      {list.length > 0 && (
        <motion.ul variants={stagger(0.03)} initial="hidden" animate="show" className={`card divide-y divide-slate-100 overflow-hidden transition-opacity ${users.loading ? 'opacity-60' : ''}`}>
          {list.map((u, i) => (
            <motion.li key={u.id} variants={i < 25 ? fadeUp : undefined} className={`px-4 py-3.5 transition-colors hover:bg-slate-50/60 sm:px-5 ${u.active ? '' : 'bg-slate-50/80'}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Avatar name={u.name} role={u.role} muted={!u.active} className="h-9 w-9 text-xs" />
                <div className="min-w-0 flex-1">
                  <p className={`flex items-center gap-2 text-sm font-medium ${u.active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                    <span className="truncate">{u.name}</span>
                    {u.id === me.id && <span className="rounded bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500 no-underline">You</span>}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {u.email} · since {formatDate(u.created_at)}
                  </p>
                </div>
                <span className={`pill ${ROLE_COLORS[u.role].chip}`}>{ROLE_LABELS[u.role]}</span>
                {!u.active && <span className="pill bg-red-50 text-red-700 ring-red-200">Disabled</span>}
                <div className="flex w-full gap-1 sm:w-auto">
                  <button
                    onClick={() => setResetId(resetId === u.id ? null : u.id)}
                    className="btn btn-ghost btn-sm flex-1 sm:flex-none"
                    aria-expanded={resetId === u.id}
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    Reset password
                  </button>
                  {u.id !== me.id && (
                    <button
                      onClick={() => change(u, { active: !u.active }, `${u.name} ${u.active ? 'disabled' : 'enabled'}`)}
                      disabled={busyId === u.id}
                      className={`btn btn-sm flex-1 sm:flex-none ${u.active ? 'btn-danger-ghost' : 'text-emerald-700 hover:bg-emerald-50'}`}
                    >
                      {u.active ? <UserX className="h-3.5 w-3.5" aria-hidden="true" /> : <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
                      {u.active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {resetId === u.id && (
                  <PasswordReset busy={busyId === u.id} onCancel={() => setResetId(null)} onSave={(password) => change(u, { password }, `Password for ${u.name} updated`)} />
                )}
              </AnimatePresence>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </section>
  )
}
