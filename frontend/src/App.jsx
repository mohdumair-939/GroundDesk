import { Compass } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth'
import AppShell from './components/AppShell'
import { Empty, Loading } from './components/States'
import Login from './pages/Login'
import Register from './pages/Register'

// Pages load on first visit, so each role only downloads the screens it uses.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))
const NewTicket = lazy(() => import('./pages/NewTicket'))
const TechnicianView = lazy(() => import('./pages/TechnicianView'))
const TicketDetail = lazy(() => import('./pages/TicketDetail'))
const TicketList = lazy(() => import('./pages/TicketList'))
const Users = lazy(() => import('./pages/Users'))

function NotFound() {
  return (
    <Empty
      icon={Compass}
      title="Page not found"
      action={
        <Link to="/" className="btn btn-primary">
          Go to home
        </Link>
      }
    >
      The page you opened does not exist or you do not have access to it.
    </Empty>
  )
}

function RoleRoutes({ role }) {
  return (
    <Routes>
      <Route path="/" element={role === 'technician' ? <TechnicianView /> : role === 'admin' ? <Dashboard /> : <TicketList />} />
      {role === 'admin' && <Route path="/tickets" element={<TicketList />} />}
      <Route path="/tickets/:id" element={<TicketDetail />} />
      {role === 'employee' && <Route path="/new" element={<NewTicket />} />}
      {role === 'admin' && <Route path="/users" element={<Users />} />}
      {role === 'admin' && <Route path="/knowledge" element={<KnowledgeBase />} />}
      <Route path="/login" element={<Navigate to="/" replace />} />
      <Route path="/register" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const { user } = useAuth()

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
    <AppShell>
      <Suspense fallback={<Loading label="Loading page" />}>
        <RoleRoutes role={user.role} />
      </Suspense>
    </AppShell>
  )
}
