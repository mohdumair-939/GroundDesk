import { useState } from 'react'
import { listUsers, updateUser } from '../api'
import { useAuth } from '../auth'
import PasswordInput from '../components/PasswordInput'
import { Empty, ErrorBox, Loading } from '../components/States'
import { ROLE_COLORS } from '../colors'
import { ROLE_LABELS, formatDate } from '../constants'
import { useAsync } from '../useAsync'

const select = 'field px-2.5 py-1.5 text-sm'

function PasswordReset({ onSave, onCancel, busy }) {
  const [password, setPassword] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSave(password)
      }}
      className="mt-2 flex flex-wrap items-end gap-2"
    >
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
      <button disabled={busy || password.length < 8} className="btn-primary px-3 py-1 text-sm font-medium disabled:opacity-50">
        Save
      </button>
      <button type="button" onClick={onCancel} className="rounded-md px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900">
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
        <h1 className="page-title">Users</h1>
        <p className="mt-1 text-sm text-stone-500">
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
      {message && <p className="mb-3 rounded-md border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-800">{message}</p>}
      {users.loading && !users.data && <Loading />}
      {users.data && users.data.length === 0 && <Empty>No users match.</Empty>}

      {users.data && users.data.length > 0 && (
        <ul className="divide-y divide-stone-200 overflow-hidden card">
          {users.data.map((u) => (
            <li key={u.id} className={`px-4 py-3 ${u.active ? '' : 'bg-stone-50'}`}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    u.active ? ROLE_COLORS[u.role].avatar : 'bg-stone-200 text-stone-500'
                  }`}
                  aria-hidden="true"
                >
                  {u.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${u.active ? '' : 'text-stone-400 line-through'}`}>{u.name}</p>
                  <p className="truncate text-xs text-stone-500">
                    {u.email} · since {formatDate(u.created_at)}
                  </p>
                </div>
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_COLORS[u.role].chip}`}>{ROLE_LABELS[u.role]}</span>
                {!u.active && <span className="text-xs text-red-600">Disabled</span>}
                <div className="flex gap-1">
                  <button
                    onClick={() => setResetId(resetId === u.id ? null : u.id)}
                    className="rounded-md px-2 py-1 text-sm font-medium text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900"
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
