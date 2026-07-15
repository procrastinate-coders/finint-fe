import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '@/test/mocks/server'
import { tokenStore } from '@/lib/auth/session'
import { ApiError, apiRequest, setUnauthorizedHandler } from './client'

const pingSchema = z.object({ ok: z.boolean() })

function seedSession(accessToken: string) {
  tokenStore.setSession({
    accessToken,
    expiresAt: '2026-07-15T21:20:00+05:30',
    refreshToken: 'seed-refresh',
    user: { id: 'usr', email: 'a@b.c', name: 'Naveen' },
  })
}

beforeEach(() => tokenStore.clear())
afterEach(() => {
  tokenStore.clear()
  setUnauthorizedHandler(null)
})

describe('api client — single-flight refresh (CLAUDE.md law 13)', () => {
  it('two concurrent 401s produce exactly ONE POST /auth/refresh', async () => {
    seedSession('stale-token')
    let refreshCalls = 0

    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json({
          access_token: 'fresh-token',
          expires_at: '2026-07-15T21:35:00+05:30',
        })
      }),
      http.get('*/ping', ({ request }) => {
        // Only the refreshed token is accepted; the stale one 401s.
        if (request.headers.get('Authorization') === 'Bearer fresh-token') {
          return HttpResponse.json({ ok: true })
        }
        return HttpResponse.json({ detail: 'token expired' }, { status: 401 })
      }),
    )

    const [a, b] = await Promise.all([
      apiRequest('/ping', pingSchema),
      apiRequest('/ping', pingSchema),
    ])

    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    // The whole point: NOT two racing refreshes clobbering each other's tokens.
    expect(refreshCalls).toBe(1)
    expect(tokenStore.getAccessToken()).toBe('fresh-token')
  })

  it('a 401 with a good refresh token retries once and succeeds', async () => {
    seedSession('stale-token')
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json({
          access_token: 'fresh-token',
          expires_at: '2026-07-15T21:35:00+05:30',
        }),
      ),
      http.get('*/ping', ({ request }) =>
        request.headers.get('Authorization') === 'Bearer fresh-token'
          ? HttpResponse.json({ ok: true })
          : HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
    )
    await expect(apiRequest('/ping', pingSchema)).resolves.toEqual({ ok: true })
  })

  it('terminal 401 (refresh rejected) clears the session and notifies → /login', async () => {
    seedSession('stale-token')
    let notified = false
    setUnauthorizedHandler(() => {
      notified = true
    })
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json({ detail: 'invalid refresh' }, { status: 401 }),
      ),
      http.get('*/ping', () =>
        HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
    )

    await expect(apiRequest('/ping', pingSchema)).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(tokenStore.isAuthenticated()).toBe(false)
    expect(notified).toBe(true)
  })

  it('auth:false requests never attach a bearer or trigger refresh', async () => {
    seedSession('stale-token')
    let sawAuthHeader = false
    server.use(
      http.get('*/public', ({ request }) => {
        sawAuthHeader = request.headers.has('Authorization')
        return HttpResponse.json({ ok: true })
      }),
    )
    await apiRequest('/public', pingSchema, { auth: false })
    expect(sawAuthHeader).toBe(false)
  })
})
