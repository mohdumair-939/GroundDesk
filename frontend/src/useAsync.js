import { useCallback, useEffect, useState } from 'react'

// Runs an async loader on mount and whenever `deps` change; exposes reload().
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  const reload = useCallback(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    run()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState((s) => ({ ...s, error, loading: false })))
    return () => {
      cancelled = true
    }
  }, [run])

  useEffect(() => reload(), [reload])

  const setData = useCallback((data) => setState((s) => ({ ...s, data })), [])

  return { ...state, reload, setData }
}
