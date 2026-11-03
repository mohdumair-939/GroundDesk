import { useState } from 'react'
import { Navigate, NavLink, Route, Routes } from 'react-router'
import { useAuth } from './auth'
import Logo from './components/Logo'
import { ROLE_COLORS } from './colors'
import { ROLE_LABELS } from './constants'
import Dashboard from './pages/Dashboard'
import KnowledgeBase from './pages/KnowledgeBase'
import Login from './pages/Login'
import NewTicket from './pages/NewTicket'
import Register from './pages/Register'
import TechnicianView from './pages/TechnicianView'
import TicketDetail from './pages/TicketDetail'
import TicketList from './pages/TicketList'
import Users from './pages/Users'

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z',
  tickets: 'M4 5h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4V5Zm6 0v14',
  plus: 'M12 5v14M5 12h14',
  queue: 'M4 6h16M4 12h16M4 18h10',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Zm0 14a2 2 0 0 1 2-2h13',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  signout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11',
}

export function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[name]} />
    </svg>
  )
}

const NAV = {
  employee: [
    ['/', 'My tickets', 'tickets'],
    ['/new', 'New ticket', 'plus'],
  ],
  technician: [['/', 'My queue', 'queue']],
  admin: [
    ['/', 'Dashboard', 'dashboard'],
    ['/tickets', 'All tickets', 'tickets'],
    ['/knowledge', 'Knowledge base', 'book'],
    ['/users', 'Users', 'users'],
  ],
}

const desktopLink = ({ isActive }) =>
  `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
  }`

const mobileLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-3 text-[15px] font-medium transition-colors ${
    isActive ? 'bg-brand-50 text-brand-800' : 'text-stone-700 hover:bg-stone-100'
  }`

function Avatar({ user, size = 'h-8 w-8 text-sm' }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${size} ${ROLE_COLORS[user.role].avatar}`} aria-hidden="true">
      {user.name.trim().charAt(0).toUpperCase()}
    </span>
  )
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
      {role === 'admin' && <Route path="/knowledge" element={<KnowledgeBase />} />}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route
        path="*"
        element={
          <div className="card px-6 py-12 text-center">
            <p className="text-sm font-medium text-stone-900">Page not found</p>
            <p className="mt-1 text-sm text-stone-500">The page you opened does not exist or you do not have access to it.</p>
            <NavLink to="/" className="btn-primary mt-5 inline-flex px-4 py-2 text-sm font-medium">
              Go to home
            </NavLink>
          </div>
        }
      />
    </Routes>
  )
}

function App() {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  const nav = NAV[user.role]
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" onClick={closeMenu} className="flex shrink-0 items-center gap-2.5 rounded-md">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight text-stone-900">GroundDesk</span>
          </NavLink>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {nav.map(([to, label, icon]) => (
              <NavLink key={to} to={to} end className={desktopLink}>
                <Icon name={icon} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            <Avatar user={user} />
            <span className="leading-tight">
              <span className="block max-w-40 truncate text-sm font-medium text-stone-800">{user.name}</span>
              <span className="block text-xs text-stone-500">{ROLE_LABELS[user.role]}</span>
            </span>
            <span className="mx-1 h-6 w-px bg-stone-200" aria-hidden="true" />
            <button onClick={logout} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900">
              <Icon name="signout" />
              Sign out
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((open) => !open)}
            className="-mr-2 ml-auto inline-flex h-10 w-10 items-center justify-center rounded-md text-stone-700 transition-colors hover:bg-stone-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>

        {menuOpen && (
          <div id="mobile-menu" className="border-t border-stone-200 bg-white px-4 pt-3 pb-4 shadow-lg md:hidden">
            <nav className="space-y-1" aria-label="Main">
              {nav.map(([to, label, icon]) => (
                <NavLink key={to} to={to} end onClick={closeMenu} className={mobileLink}>
                  <Icon name={icon} className="h-5 w-5" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-3 border-t border-stone-200 px-3 pt-4">
              <Avatar user={user} size="h-10 w-10 text-base" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-medium text-stone-900">{user.name}</span>
                <span className="block truncate text-sm text-stone-500">
                  {ROLE_LABELS[user.role]} · {user.email}
                </span>
              </span>
            </div>
            <button
              onClick={() => {
                closeMenu()
                logout()
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2.5 text-[15px] font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <Icon name="signout" className="h-5 w-5" />
              Sign out
            </button>
          </div>
        )}
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <RoleRoutes role={user.role} />
      </main>
    </div>
  )
}

export default App
