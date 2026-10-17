import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { login as apiLogin, register as apiRegister, setAuth } from './api'

const STORAGE_KEY = 'helpdesk.session'
const AuthContext = createContext(null)

function readSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return saved?.token && saved?.user ? saved : null
  } catch {
    return null
  }
}

function writeSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage unavailable (private mode): the session just lasts until the tab closes
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    const saved = readSession()
    setAuth(saved?.token ?? null)
    return saved
  })

  const logout = useCallback(() => {
    setAuth(null)
    writeSession(null)
    setSession(null)
  }, [])

  const start = useCallback(
    ({ access_token, user }) => {
      const next = { token: access_token, user }
      setAuth(access_token, logout)
      writeSession(next)
      setSession(next)
      return user
    },
    [logout],
  )

  // Expired or revoked tokens (401) sign the user out. (The token itself is set synchronously
  // above, so the first requests of child components already carry it.)
  useEffect(() => setAuth(session?.token ?? null, logout), [session, logout])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      login: async (email, password, role) => start(await apiLogin(email, password, role)),
      register: async (name, email, password) => start(await apiRegister(name, email, password)),
      logout,
    }),
    [session, start, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
