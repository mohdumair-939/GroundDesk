// Base URL of the FastAPI backend, set via VITE_API_URL in .env (or Vercel env vars).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8010').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, fieldErrors = {}) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
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
    response = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Could not reach the server. It may be waking up — try again in a moment.', 0)
  }

  const data = await response.json().catch(() => null)
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
