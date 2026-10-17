import { useEffect, useState } from 'react'
import { API_URL, getHealth } from './api'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-800">
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Smart Help Desk</h1>
        <p className="mt-1 text-sm text-slate-500">IT support ticketing system</p>

        <h2 className="mt-6 text-sm font-medium uppercase tracking-wide text-slate-500">
          Backend status
        </h2>
        <p className="mt-1 text-xs text-slate-400">{API_URL}</p>

        {!health && !error && <p className="mt-3">Checking…</p>}

        {error && (
          <p className="mt-3 rounded bg-red-50 p-3 text-red-700">
            Could not reach the backend: {error}
          </p>
        )}

        {health && (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-500">API</dt>
            <dd className="font-medium">{health.status}</dd>
            <dt className="text-slate-500">Database</dt>
            <dd className="font-medium">{health.database}</dd>
            <dt className="text-slate-500">pgvector</dt>
            <dd className="font-medium">{health.pgvector}</dd>
          </dl>
        )}
      </div>
    </main>
  )
}

export default App
