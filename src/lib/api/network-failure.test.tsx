import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkAccess, ensureAccessToken, NetworkError } from '@/lib/api/client'
import { tokenStore } from '@/lib/auth/session'

/**
 * ⚠️ THE TEST THAT WOULD HAVE CAUGHT THE OUTAGE OF 2026-09-09.
 *
 * A dead DNS resolver made `fetch` REJECT. `ensureAccessToken()` let the
 * TypeError escape, `_authenticated.beforeLoad` threw, no route caught it, and
 * every route — root included — rendered TanStack Router's default
 * "Something went wrong!" with the real cause hidden behind a toggle.
 *
 * ⚠️ 190 TESTS COULD NOT SEE IT, AND THE REASON IS STRUCTURAL: `setup.ts` starts
 * MSW for every test, and MSW answers requests. It can return a 500, but it
 * cannot make `fetch` REJECT — and rejection is the failure that took the app
 * down. A handler returning `HttpResponse.error()` is still MSW deciding to fail;
 * a dead resolver is the network refusing to exist.
 *
 * ⚠️ This half tests the SEAM. The screen it produces is tested in
 * `src/app/network-failure.test.tsx` — law 11 forbids lib/ importing app/,
 * and that rule is right even for a test: a lib test that mounts the whole
 * app is not a lib test.
 *
 * ⚠️ SO THE STUB MUST BYPASS MSW, NOT BE CONFIGURED THROUGH IT. `vi.stubGlobal`
 * replaces `globalThis.fetch` outright, so the request never reaches MSW's
 * interceptor. If these tests are ever "tidied" into MSW handlers they stop
 * testing the thing that broke.
 */
const REFRESH_KEY = 'finint.refresh_token'

/** A dead resolver: fetch rejects before any response exists. */
function deadNetwork() {
  const fn = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
  vi.stubGlobal('fetch', fn)
  return fn
}

/** The server answering, and rejecting the credential. Not the same thing. */
function serverSaysNo(status = 401) {
  const fn = vi.fn(() =>
    Promise.resolve(
      new Response(JSON.stringify({ detail: 'invalid refresh token' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    ),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  tokenStore.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
  sessionStorage.clear()
  tokenStore.clear()
})

// ============================================================================
// 1. the seam itself
// ============================================================================
describe('a dead network is not an auth failure', () => {
  it('🔴 ensureAccessToken() RETURNS FALSE rather than throwing', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    await expect(ensureAccessToken()).resolves.toBe(false)
  })

  it('🔴 names the reason as UNREACHABLE, never as a missing session', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    await expect(checkAccess()).resolves.toEqual({
      ok: false,
      reason: 'unreachable',
    })
  })

  it('⚠️ does NOT destroy the session — the token was never rejected', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    await ensureAccessToken()
    expect(tokenStore.getRefreshToken()).toBe('a-perfectly-good-refresh-token')
  })

  it('a REJECTED credential is a different case, and does clear the session', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-stale-refresh-token')
    serverSaysNo(401)
    await expect(checkAccess()).resolves.toEqual({
      ok: false,
      reason: 'rejected',
    })
    expect(tokenStore.getRefreshToken()).toBeNull()
  })

  it('no session at all is its own case', async () => {
    deadNetwork()
    await expect(checkAccess()).resolves.toEqual({
      ok: false,
      reason: 'no-session',
    })
  })

  it('an ABORTED request stays an abort — a cancel is not an outage', async () => {
    // React Query aborts in-flight requests on unmount. Reporting that as
    // "cannot reach the API" would cry outage over ordinary navigation.
    localStorage.setItem(REFRESH_KEY, 'r')
    const err = new DOMException('The operation was aborted.', 'AbortError')
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(err)),
    )
    await expect(checkAccess()).rejects.toBe(err)
  })

  it('a network failure surfaces as a NAMED error, not a raw TypeError', async () => {
    localStorage.setItem(REFRESH_KEY, 'r')
    deadNetwork()
    const { getMe } = await import('@/lib/api/endpoints')
    await expect(getMe()).rejects.toBeInstanceOf(NetworkError)
  })
})
