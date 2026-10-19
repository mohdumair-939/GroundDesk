import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useAuth } from './auth'
import { ROLE_LABELS } from './constants'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import NewTicket from './pages/NewTicket'
import Register from './pages/Register'
import TechnicianView from './pages/TechnicianView'
import TicketDetail from './pages/TicketDetail'
import TicketList from './pages/TicketList'
import Users from './pages/Users'

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`

const NAV = {
  employee: [
    ['/', 'My tickets'],
    ['/new', 'New ticket'],
  ],
  technician: [['/', 'My queue']],
  admin: [
    ['/', 'Dashboard'],
    ['/tickets', 'All tickets'],
    ['/users', 'Users'],
  ],
}

const ROLE_CHIP = {
  employee: 'bg-sky-50 text-sky-700 ring-sky-200',
  technician: 'bg-orange-50 text-orange-700 ring-orange-200',
  admin: 'bg-violet-50 text-violet-700 ring-violet-200',
}

function RoleRoutes({ role }) {
  return (
    <Routes>
      <Route
        path="/"
        element={role === 'technician' ? <TechnicianView /> : role === 'admin' ? <Dashboard /> : <TicketList />}
      />
      {role === 'admin' && <Route path="/tickets" element={<TicketList />} />}
      <Route path="/tickets/:id" element={<TicketDetail />} />
      {role === 'employee' && <Route path="/new" element={<NewTicket />} />}
      {role === 'admin' && <Route path="/users" element={<Users />} />}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="*" element={<p className="text-slate-500">Page not found.</p>} />
    </Routes>
  )
}

function App() {
  const { user, logout } = useAuth()

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            GroundDesk
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            {NAV[user.role].map(([to, label]) => (
              <NavLink key={to} to={to} end className={navClass}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-slate-700 sm:inline">{user.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_CHIP[user.role]}`}>
              {ROLE_LABELS[user.role]}
            </span>
            <button onClick={logout} className="rounded-md px-2 py-1 text-slate-600 hover:bg-slate-100">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <RoleRoutes role={user.role} />
      </main>
    </div>
  )
}

export default App
