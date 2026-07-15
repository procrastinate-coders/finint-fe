import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { server } from '@/test/mocks/server'
import { tokenStore } from '@/lib/auth/session'
import {
  ApiError,
  apiRequest,
  ensureAccessToken,
  setUnauthorizedHandler,
} from './client'

const pingSchema = z.object({ ok: z.boolean() })

function seedSession(accessToken: string) {
  tokenStore.setSession({
    accessToken,
    expiresAt: '2026-07-15T21:20:00+05:30',
    refreshToken: 'seed-refresh',
  })
}

// A refresh 200 body — a NEW access token only (refresh not rotated), with the
// required token_type. Matches AccessTokenResponse.
const refreshBody = (accessToken: string) => ({
  access_token: accessToken,
  expires_at: '2026-07-15T21:35:00+05:30',
  token_type: 'bearer',
})

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
        return HttpResponse.json(refreshBody('fresh-token'))
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
        HttpResponse.json(refreshBody('fresh-token')),
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

describe('ensureAccessToken — the rehydrate gate (no re-login on reload)', () => {
  it('returns true without a network call when an access token is in memory', async () => {
    seedSession('live-token')
    let refreshCalls = 0
    server.use(
      http.post('*/auth/refresh', () => {
        refreshCalls += 1
        return HttpResponse.json(refreshBody('x'))
      }),
    )
    await expect(ensureAccessToken()).resolves.toBe(true)
    expect(refreshCalls).toBe(0)
  })

  it('mints an access token from the refresh token (the hard-reload case)', async () => {
    // Simulate a reload: refresh token in storage, NO access token in memory.
    tokenStore.setSession({
      accessToken: 'boot',
      expiresAt: 'x',
      refreshToken: 'good-refresh',
    })
    tokenStore.setAccessToken('', '') // wipe the in-memory access token
    // setAccessToken('') leaves a falsy token, so ensureAccessToken must refresh.
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json(refreshBody('rehydrated')),
      ),
    )
    await expect(ensureAccessToken()).resolves.toBe(true)
    expect(tokenStore.getAccessToken()).toBe('rehydrated')
  })

  it('returns false when there is no session to restore', async () => {
    tokenStore.clear()
    await expect(ensureAccessToken()).resolves.toBe(false)
  })

  it('returns false and clears when the refresh token is rejected', async () => {
    tokenStore.setSession({
      accessToken: '',
      expiresAt: '',
      refreshToken: 'expired-refresh',
    })
    server.use(
      http.post('*/auth/refresh', () =>
        HttpResponse.json(
          { detail: 'invalid or expired refresh token' },
          { status: 401 },
        ),
      ),
    )
    await expect(ensureAccessToken()).resolves.toBe(false)
    expect(tokenStore.isAuthenticated()).toBe(false)
  })
})
