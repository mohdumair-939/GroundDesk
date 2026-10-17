import { NavLink, Route, Routes } from 'react-router'
import NewTicket from './pages/NewTicket'
import TechnicianView from './pages/TechnicianView'
import TicketDetail from './pages/TicketDetail'
import TicketList from './pages/TicketList'

const navClass = ({ isActive }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="text-lg font-semibold text-slate-900">
            Smart Help Desk
          </NavLink>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navClass}>
              Tickets
            </NavLink>
            <NavLink to="/new" className={navClass}>
              New ticket
            </NavLink>
            <NavLink to="/technician" className={navClass}>
              Technician
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<TicketList />} />
          <Route path="/new" element={<NewTicket />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/technician" element={<TechnicianView />} />
          <Route path="*" element={<p className="text-slate-500">Page not found.</p>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
