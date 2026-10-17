// Base URL of the FastAPI backend, set via VITE_API_URL in .env (or Vercel env vars).
export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8010').replace(/\/$/, '')

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed (HTTP ${response.status})`)
  }
  return response.json()
}
