import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppProviders } from '@/app/providers'
import { tokenStore } from '@/lib/auth/session'

/**
 * ⚠️ WHAT A DEAD NETWORK LOOKS LIKE TO THE READER — the other half of
 * `src/lib/api/network-failure.test.tsx`, which tests the seam. This half mounts
 * the REAL app the way `main.tsx` does, so it exercises the router guards, the
 * redirect and the screen together. That combination is what failed on
 * 2026-09-09: each piece was individually fine.
 *
 * ⚠️ THE STUB BYPASSES MSW ON PURPOSE. MSW answers requests; it cannot make
 * `fetch` REJECT, which is the failure that took the app down. `vi.stubGlobal`
 * replaces `globalThis.fetch` so the request never reaches the interceptor. Do
 * not "tidy" this into a handler — it would stop testing the thing that broke.
 */
const REFRESH_KEY = 'finint.refresh_token'

function deadNetwork() {
  const fn = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
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
// 2. what the reader sees — the whole point
// ============================================================================
describe('an unreachable API degrades to the login screen', () => {
  it('🔴 does NOT render "Something went wrong!" on the root route', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    render(<AppProviders />)
    await screen.findByText(/cannot reach the api/i, undefined, { timeout: 3000 })
    expect(document.body.textContent).not.toMatch(/Something went wrong/i)
  })

  it('🔴 lands on login and NAMES THE NETWORK as the cause', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    render(<AppProviders />)
    expect(
      await screen.findByText(/cannot reach the api/i, undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
    // the login form is there to use the moment the network returns
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('⚠️ does NOT claim the session expired — that is a lie the user acts on', async () => {
    // "Your session expired" sends someone to re-type a password that was never
    // wrong, against a server that cannot hear them.
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    render(<AppProviders />)
    await screen.findByText(/cannot reach the api/i, undefined, { timeout: 3000 })
    expect(document.body.textContent).not.toMatch(/session (has )?expired/i)
    expect(document.body.textContent).not.toMatch(/signed out|sign(ed)? you out/i)
    expect(document.body.textContent).not.toMatch(/invalid email or password/i)
  })

  it('says the session is intact, so nobody re-enters a password that was fine', async () => {
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    deadNetwork()
    render(<AppProviders />)
    await screen.findByText(/cannot reach the api/i, undefined, { timeout: 3000 })
    expect(document.body.textContent).toMatch(/still signed in|not been signed out/i)
  })
})

// ============================================================================
// 3. the loop this fix could easily have created
// ============================================================================
describe('the redirect must terminate', () => {
  it('⚠️ does not bounce between / and /login forever', async () => {
    // Keeping the refresh token on a network failure is correct — but it makes
    // isAuthenticated() true, so /login would send us straight back to / and the
    // two guards would chase each other. An infinite loop is WORSE than the bug
    // it replaced: the original at least stopped and said something.
    localStorage.setItem(REFRESH_KEY, 'a-perfectly-good-refresh-token')
    const fetchMock = deadNetwork()
    render(<AppProviders />)
    await screen.findByText(/cannot reach the api/i, undefined, { timeout: 3000 })
    const afterSettle = fetchMock.mock.calls.length
    await new Promise((r) => setTimeout(r, 400))
    // a loop would keep re-running beforeLoad, and each pass refreshes once
    expect(fetchMock.mock.calls.length).toBe(afterSettle)
    expect(afterSettle).toBeLessThan(5)
  })
})
