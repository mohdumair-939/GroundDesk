import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHealth, listTickets, login, register } from './api'

const json = (status, body) => ({ ok: status < 400, status, json: async () => body })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('API error handling', () => {
  it('reports a network failure (no HTTP response) as status 0, naming the server', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await getHealth().catch((e) => e)
    expect(err.status).toBe(0)
    expect(err.message).toMatch(/Cannot connect to the server at/)
  })

  it('keeps HTTP errors separate from network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { detail: 'Incorrect email or password' })))
    const err = await login('a@b.c', 'x', 'admin').catch((e) => e)
    expect(err.status).toBe(401)
    expect(err.message).toBe('Incorrect email or password')
  })

  it('explains server errors (5xx) as server problems, not connection problems', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(500, null)))
    const err = await register('N', 'n@example.com', 'secret123').catch((e) => e)
    expect(err.status).toBe(500)
    expect(err.message).toMatch(/server ran into a problem \(HTTP 500\)/)
  })

  it('maps 422 validation details to fields', async () => {
    const detail = [{ loc: ['body', 'password'], msg: 'String should have at least 8 characters' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(422, { detail })))
    const err = await register('N', 'n@example.com', 'x').catch((e) => e)
    expect(err.status).toBe(422)
    expect(err.fieldErrors).toEqual({ password: 'String should have at least 8 characters' })
  })

  it('retries reads and sign-in after a network failure (server waking up)', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(json(200, []))
    vi.stubGlobal('fetch', fetch)
    const pending = listTickets()
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual([])
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('retries reads when the proxy says the backend is still starting (503)', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn().mockResolvedValueOnce(json(503, null)).mockResolvedValue(json(200, { status: 'ok' }))
    vi.stubGlobal('fetch', fetch)
    const pending = listTickets()
    await vi.runAllTimersAsync()
    await expect(pending).resolves.toEqual({ status: 'ok' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry registration, so an account is never created twice', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetch)
    await register('N', 'n@example.com', 'secret123').catch(() => {})
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
