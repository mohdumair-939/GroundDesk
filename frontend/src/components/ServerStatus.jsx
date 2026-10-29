import { useEffect, useState } from 'react'
import { getHealth } from '../api'

// Shows whether the API is reachable before the user signs in. The free hosting tier sleeps
// when idle, so the first check can take up to a minute; keep retrying until it answers.
export default function ServerStatus() {
  const [state, setState] = useState('checking') // checking | ready | degraded | waking
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (state === 'ready') return
    let cancelled = false
    const timer = setTimeout(
      () => {
        getHealth()
          .then((h) => !cancelled && setState(h.status === 'ok' ? 'ready' : 'degraded'))
          .catch(() => !cancelled && setState('waking'))
          .finally(() => !cancelled && setTries((n) => n + 1))
      },
      tries === 0 ? 0 : 5000,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state, tries])

  const styles = {
    checking: ['bg-stone-300 animate-pulse', 'Connecting to the server…'],
    waking: ['bg-amber-400 animate-pulse', 'Server is starting up (can take up to a minute after a quiet period)…'],
    degraded: ['bg-red-500', 'Server is up but cannot reach its database. Please try again shortly.'],
    ready: ['bg-emerald-500', 'Server ready'],
  }
  const [dot, text] = styles[state]

  return (
    <p className="flex items-center gap-2 text-xs text-stone-500" role="status" aria-live="polite">
      <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      {text}
    </p>
  )
}
