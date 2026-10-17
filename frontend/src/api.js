// Base URL of the FastAPI backend, set via VITE_API_URL in .env (or Vercel env vars).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8010').replace(/\/$/, '')

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

async function request(path, { method = 'GET', body, params } = {}) {
  const url = new URL(`${API_URL}${path}`)
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value)
  }

  let response
  try {
    const headers = {}
    if (body) headers['Content-Type'] = 'application/json'
    if (authToken) headers.Authorization = `Bearer ${authToken}`
    response = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError('Could not reach the server. It may be waking up — try again in a moment.', 0)
  }

  const data = await response.json().catch(() => null)
  if (response.status === 401 && authToken) onUnauthorized()
  if (!response.ok) {
    const detail = data?.detail
    const message = typeof detail === 'string' ? detail : `Request failed (HTTP ${response.status})`
    throw new ApiError(message, response.status, parseFieldErrors(detail))
  }
  return data
}

export const getHealth = () => request('/health')
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
export const login = (email, password, role) => request('/auth/login', { method: 'POST', body: { email, password, role } })
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
