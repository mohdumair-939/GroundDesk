import { useState } from 'react'
import { listUsers, updateUser } from '../api'
import { useAuth } from '../auth'
import { Empty, ErrorBox, Loading } from '../components/States'
import { ROLE_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const select = 'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm'

function PasswordReset({ onSave, onCancel, busy }) {
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(password)
      }}
      className="mt-2 flex flex-wrap items-center gap-2"
    >
      <input
        type="password"
        minLength={8}
        required
        autoComplete="new-password"
        placeholder="New password (8+ characters)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
        aria-label="New password"
      />
      <button disabled={busy || password.length < 8} className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-60">
        Save
      </button>
      <button type="button" onClick={onCancel} className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100">
        Cancel
      </button>
    </form>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const [role, setRole] = useState('')
  const [q, setQ] = useState('')
  const users = useAsync(() => listUsers({ role, q }), [role, q])
  const [busyId, setBusyId] = useState(null)
  const [resetId, setResetId] = useState(null)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  async function change(u, changes, done) {
    setBusyId(u.id)
    setError(null)
    setMessage(null)
    try {
      await updateUser(u.id, changes)
      setMessage(done)
      setResetId(null)
      users.reload()
    } catch (err) {
      setError(err)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every email has exactly one account and one role. Employees register themselves; technician and admin accounts are
          seeded by the help desk.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className={`${select} min-w-0 flex-1 sm:max-w-xs`}
          aria-label="Search users"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className={select} aria-label="Role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <ErrorBox error={users.error || error} onRetry={users.error ? users.reload : undefined} />
      {message && <p className="mb-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {users.loading && !users.data && <Loading />}
      {users.data && users.data.length === 0 && <Empty>No users match.</Empty>}

      {users.data && users.data.length > 0 && (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {users.data.map((u) => (
            <li key={u.id} className={`px-4 py-3 ${u.active ? '' : 'bg-slate-50'}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${u.active ? '' : 'text-slate-400 line-through'}`}>{u.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {u.email} · since {formatDate(u.created_at)}
                  </p>
                </div>
                <span className="text-xs font-medium text-slate-600">{ROLE_LABELS[u.role]}</span>
                {!u.active && <span className="text-xs text-red-600">Disabled</span>}
                <div className="flex gap-1">
                  <button
                    onClick={() => setResetId(resetId === u.id ? null : u.id)}
                    className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Reset password
                  </button>
                  {u.id !== me.id && (
                    <button
                      onClick={() => change(u, { active: !u.active }, `${u.name} ${u.active ? 'disabled' : 'enabled'}.`)}
                      disabled={busyId === u.id}
                      className={`rounded-md px-2 py-1 text-sm font-medium disabled:opacity-60 ${
                        u.active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-700 hover:bg-emerald-50'
                      }`}
                    >
                      {u.active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </div>
              </div>
              {resetId === u.id && (
                <PasswordReset
                  busy={busyId === u.id}
                  onCancel={() => setResetId(null)}
                  onSave={(password) => change(u, { password }, `Password for ${u.name} updated.`)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
