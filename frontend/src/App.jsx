import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useAuth } from './auth'
import Logo from './components/Logo'
import { ROLE_COLORS } from './colors'
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
  `-mb-px border-b-2 px-1 py-3.5 text-sm font-medium transition-colors ${
    isActive ? 'border-brand-700 text-stone-900' : 'border-transparent text-stone-500 hover:border-stone-300 hover:text-stone-800'
  }`

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
      <Route path="*" element={<p className="card p-8 text-center text-stone-500">Page not found.</p>} />
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
    <div className="min-h-screen">
      <div className="flex h-1" aria-hidden="true">
        <span className="flex-[3] bg-brand-700" />
        <span className="flex-1 bg-sky-500" />
        <span className="flex-1 bg-amber-400" />
        <span className="flex-1 bg-orange-500" />
        <span className="flex-1 bg-violet-500" />
      </div>
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-8 px-4">
          <NavLink to="/" className="flex items-center gap-2.5 py-3">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-stone-900">GroundDesk</span>
          </NavLink>
          <nav className="flex gap-6">
            {NAV[user.role].map(([to, label]) => (
              <NavLink key={to} to={to} end className={navClass}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 py-3 text-sm">
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${ROLE_COLORS[user.role].avatar}`} aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-medium text-stone-800">{user.name}</span>
              <span className="block text-xs text-stone-500">{ROLE_LABELS[user.role]}</span>
            </span>
            <span className="mx-1 hidden h-5 w-px bg-stone-200 sm:block" aria-hidden="true" />
            <button onClick={logout} className="rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <RoleRoutes role={user.role} />
      </main>
    </div>
  )
}

export default App
