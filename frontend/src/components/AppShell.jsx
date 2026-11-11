import { AnimatePresence, motion } from 'motion/react'
import { BookOpen, ChevronDown, ChevronRight, LayoutDashboard, ListTodo, LogOut, Menu, Plus, Search, Ticket, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router'
import { useAuth } from '../auth'
import { ROLE_LABELS } from '../constants'
import Logo from './Logo'
import { Avatar } from './ui'
import { EASE } from '../motion'

const NAV = {
  employee: [
    { to: '/', label: 'My tickets', Icon: Ticket },
    { to: '/new', label: 'New ticket', Icon: Plus },
  ],
  technician: [{ to: '/', label: 'My queue', Icon: ListTodo }],
  admin: [
    { to: '/', label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/tickets', label: 'All tickets', Icon: Ticket },
    { to: '/knowledge', label: 'Knowledge base', Icon: BookOpen },
    { to: '/users', label: 'Users', Icon: Users },
  ],
}

function pageTitle(pathname, role) {
  if (pathname === '/') return NAV[role][0].label
  if (pathname.startsWith('/tickets/')) return 'Ticket details'
  return Object.values(NAV).flat().find((n) => n.to === pathname)?.label || 'Not found'
}

// Where the search box sends people: the ticket list each role can search.
const SEARCH_PATH = { admin: '/tickets', employee: '/' }

function NavItems({ items, onNavigate, idPrefix }) {
  return (
    <ul className="space-y-0.5">
      {items.map(({ to, label, Icon }) => (
        <li key={to}>
          <NavLink to={to} end onClick={onNavigate} className="group relative block rounded-lg focus-visible:outline-brand-400">
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={`${idPrefix}-active`}
                    className="absolute inset-0 rounded-lg bg-white/[0.08] ring-1 ring-white/10"
                    transition={{ duration: 0.3, ease: EASE }}
                  />
                )}
                <span
                  className={`relative flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'
                  }`}
                >
                  <Icon className={`h-[18px] w-[18px] ${isActive ? 'text-brand-300' : ''}`} aria-hidden="true" />
                  {label}
                  {isActive && <span className="sr-only">(current page)</span>}
                </span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

function SidebarContent({ user, logout, onNavigate, idPrefix }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pt-5 pb-6">
        <Logo />
        <span className="leading-tight">
          <span className="block text-[15px] font-semibold tracking-tight text-white">GroundDesk</span>
          <span className="block text-[11px] text-slate-400">IT service desk</span>
        </span>
      </Link>

      <nav aria-label="Main" className="scroll-thin flex-1 overflow-y-auto px-3">
        <p className="mb-2 px-3 text-[11px] font-medium tracking-[0.08em] text-slate-500 uppercase">{ROLE_LABELS[user.role]} workspace</p>
        <NavItems items={NAV[user.role]} onNavigate={onNavigate} idPrefix={idPrefix} />
      </nav>

      <div className="m-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.name} role={user.role} className="h-9 w-9 text-xs" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-medium text-white">{user.name}</span>
            <span className="block truncate text-xs text-slate-400">{user.email}</span>
          </span>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-[13px] font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-brand-400"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )
}

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-slate-100"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
      >
        <Avatar name={user.name} role={user.role} />
        <ChevronDown className={`hidden h-4 w-4 text-slate-500 transition-transform sm:block ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute right-0 z-40 mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-overlay"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className="mt-2 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <button
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4 text-slate-500" aria-hidden="true" />
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SearchBox({ role }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const input = useRef(null)

  // "/" focuses the search, as in most SaaS tools (ignored while typing in a field).
  useEffect(() => {
    function onKey(e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      input.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const term = q.trim()
        navigate(term ? `${SEARCH_PATH[role]}?q=${encodeURIComponent(term)}` : SEARCH_PATH[role])
        setQ('')
        input.current?.blur()
      }}
      className="relative hidden w-full max-w-xs md:block"
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
      <input
        ref={input}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={role === 'admin' ? 'Search tickets, people…' : 'Search your tickets…'}
        aria-label="Search tickets"
        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pr-9 pl-9 text-sm text-slate-900 transition-[border-color,box-shadow,background-color] placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] text-slate-400" aria-hidden="true">
        /
      </kbd>
    </form>
  )
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const [drawer, setDrawer] = useState(false)
  const title = pageTitle(pathname, user.role)
  const close = () => setDrawer(false)

  useEffect(() => {
    document.title = `${title} · GroundDesk`
  }, [title])

  // Escape closes the drawer; the page behind it does not scroll while it is open.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [drawer])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-raised"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 bg-navy-900 lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_0%_0%,rgb(99_102_241/0.16),transparent_60%)]" aria-hidden="true" />
        <div className="relative h-full">
          <SidebarContent user={user} logout={logout} idPrefix="desk" />
        </div>
      </aside>

      <AnimatePresence>
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={close}
              aria-hidden="true"
            />
            <motion.aside
              id="mobile-nav"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.3, ease: EASE }}
              className="absolute inset-y-0 left-0 w-[82%] max-w-[18rem] bg-navy-900 shadow-overlay"
            >
              <button
                onClick={close}
                autoFocus
                className="absolute top-5 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-brand-400"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent user={user} logout={logout} onNavigate={close} idPrefix="drawer" />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/70">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setDrawer(true)}
              className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation"
              aria-expanded={drawer}
              aria-controls="mobile-nav"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center lg:hidden" aria-label="GroundDesk home">
              <Logo className="h-7 w-7" />
            </Link>

            <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
              <span className="text-slate-400">GroundDesk</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
              <span className="truncate font-medium text-slate-800" aria-current="page">
                {title}
              </span>
            </nav>
            <span className="truncate text-sm font-medium text-slate-800 sm:hidden">{title}</span>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {SEARCH_PATH[user.role] && <SearchBox key={pathname} role={user.role} />}
              {user.role === 'employee' && pathname !== '/new' && (
                <Link to="/new" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  New ticket
                </Link>
              )}
              <UserMenu user={user} logout={logout} />
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
