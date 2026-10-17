// Where the API lives. In production the browser tries the Render backend directly first
// (VITE_API_URL) and falls back to /api on the same site, which vercel.json forwards to Render.
// The fallback rescues browsers or networks that block *.onrender.com; the direct path stays
// primary because it proved more reliable than the proxy hop. Local dev uses only VITE_API_URL.
const DIRECT = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8010')).replace(/\/$/, '')
const PROXY = '/api'
const ORIGIN = globalThis.location?.origin ?? 'http://localhost'
let bases = import.meta.env.PROD ? [DIRECT, PROXY].filter(Boolean) : [DIRECT]
export const API_URL = bases[0]

// For tests: set the list of API base URLs to try, in order.
export function setApiBases(list) {
  bases = [...list]
}

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

// The signed-in user's token, set by AuthProvider. A 401 calls onUnauthorized (sign out).
let authToken = null
let onUnauthorized = () => {}
export function setAuth(token, handler) {
  authToken = token
  if (handler) onUnauthorized = handler
}

// Turns FastAPI's 422 detail list into { field: message }.
function parseFieldErrors(detail) {
  if (!Array.isArray(detail)) return {}
  const errors = {}
  for (const item of detail) {
    const field = item.loc?.[item.loc.length - 1]
    if (field && !errors[field]) errors[field] = item.msg.replace(/^Value error, /, '')
  }
  return errors
}

const TIMEOUT_MS = 90_000 // a sleeping free-tier server can take ~1 minute to start
const RETRY_DELAYS_MS = [3_000, 8_000]
// A network failure faster than this means the request never reached the server (blocked,
// DNS, refused), so trying the other route is safe even for requests that create things.
const FAST_FAILURE_MS = 4_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function httpErrorMessage(status, detail) {
  if (typeof detail === 'string') return detail
  if (status === 502 || status === 503 || status === 504)
    return `The server is starting up or restarting (HTTP ${status}). Please try again in a moment.`
  if (status >= 500) return `The server ran into a problem (HTTP ${status}). Please try again in a moment.`
  if (status === 404) return 'Not found (HTTP 404).'
  if (status === 403) return 'You do not have access to this (HTTP 403).'
  return `Request failed (HTTP ${status}).`
}

// One fetch. Network failures (no HTTP response at all: offline, DNS, CORS block, server
// down or restarting) become status 0, kept separate from real HTTP errors (401/403/422/500…).
async function attempt(url, init) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const started = Date.now()
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    const host = new URL(url).host
    const error = new ApiError(
      err.name === 'AbortError'
        ? `The server at ${host} did not answer within ${TIMEOUT_MS / 1000} seconds. Please try again.`
        : `Cannot connect to the server at ${host}. It may be starting up (this can take up to a minute) — please try again.`,
      0,
    )
    error.fast = Date.now() - started < FAST_FAILURE_MS
    throw error
  } finally {
    clearTimeout(timer)
  }
}

// Tries each API route in order. Moves on to the next route after a network failure when that
// is safe (a repeatable request, or a failure so fast the request cannot have been processed),
// and remembers a route that worked so later requests start there.
async function fetchAnyRoute(path, search, init, repeatable) {
  let lastError
  for (const base of [...bases]) {
    const url = new URL(`${base}${path}`, ORIGIN)
    url.search = search
    try {
      const response = await attempt(url, init)
      if (base !== bases[0]) bases = [base, ...bases.filter((b) => b !== base)]
      return response
    } catch (err) {
      lastError = err
      if (!repeatable && !err.fast) break
    }
  }
  throw lastError
}

// retry: repeat after a network failure. Only for requests that are safe to repeat
// (reads and sign-in); a repeated "create" could otherwise run twice.
async function request(path, { method = 'GET', body, params, retry = method === 'GET' } = {}) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const headers = {}
  if (body) headers['Content-Type'] = 'application/json'
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  const init = { method, headers, body: body ? JSON.stringify(body) : undefined }
  const repeatable = retry || method === 'GET'

  let response
  for (let i = 0; ; i++) {
    const last = !retry || i >= RETRY_DELAYS_MS.length
    try {
      response = await fetchAnyRoute(path, search.toString(), init, repeatable)
    } catch (err) {
      if (last) throw err
      await sleep(RETRY_DELAYS_MS[i])
      continue
    }
    // 502/503/504: a proxy reached Render but the backend is still starting or redeploying.
    if (last || ![502, 503, 504].includes(response.status)) break
    await sleep(RETRY_DELAYS_MS[i])
  }

  const data = await response.json().catch(() => null)
  if (response.status === 401 && authToken) onUnauthorized()
  if (!response.ok) {
    const detail = data?.detail
    throw new ApiError(httpErrorMessage(response.status, detail), response.status, parseFieldErrors(detail))
  }
  return data
}

export const getHealth = () => request('/health', { retry: false })
export const listTickets = (params) => request('/tickets', { params })
export const getTicket = (id) => request(`/tickets/${id}`)
export const createTicket = (body) => request('/tickets', { method: 'POST', body })
export const updateStatus = (id, status, note) =>
  request(`/tickets/${id}/status`, { method: 'PATCH', body: { status, note: note || null } })
export const requestSuggestion = (id) => request(`/tickets/${id}/suggest`, { method: 'POST' })
export const sendFeedback = (id, resolved, comment) =>
  request(`/tickets/${id}/feedback`, { method: 'POST', body: { resolved, comment: comment || null } })
export const listTechnicians = () => request('/technicians')
export const listDepartments = () => request('/departments')
export const login = (email, password, role) =>
  request('/auth/login', { method: 'POST', body: { email, password, role }, retry: true })
export const register = (name, email, password) => request('/auth/register', { method: 'POST', body: { name, email, password } })
export const getMe = () => request('/auth/me')
export const sendClosure = (id, approved, comment) =>
  request(`/tickets/${id}/closure`, { method: 'POST', body: { approved, comment: comment || null } })
export const addNote = (id, note) => request(`/tickets/${id}/notes`, { method: 'POST', body: { note } })
export const adminUpdateTicket = (id, changes) => request(`/tickets/${id}`, { method: 'PATCH', body: changes })
export const reassignTicket = (id, technicianId, note) =>
  request(`/tickets/${id}/reassign`, { method: 'POST', body: { technician_id: Number(technicianId), note: note || null } })
export const reopenTicket = (id, note) => request(`/tickets/${id}/reopen`, { method: 'POST', body: { note } })
export const listUsers = (params) => request('/users', { params })
export const updateUser = (id, changes) => request(`/users/${id}`, { method: 'PATCH', body: changes })
