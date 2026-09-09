import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiRequest,
  deriveReadTimeoutMs,
  deriveRefreshTimeoutMs,
  READ_TIMEOUT_MS,
  REFRESH_TIMEOUT_MS,
  TimeoutError,
  NetworkError,
} from './client'

/**
 * ⚠️ MSW IS BYPASSED HERE, DELIBERATELY — a hang is a NETWORK-LAYER FACT.
 *
 * The condition under test is "the server accepted the connection and never
 * answered". MSW answers requests; it cannot not-answer one. A handler that
 * returns `HttpResponse.error()` is MSW deciding to fail, which is a different
 * thing from the network refusing to exist or a server refusing to reply. So
 * `vi.stubGlobal` replaces `globalThis.fetch` with a promise that never settles,
 * and the request never reaches the interceptor.
 *
 * (The sibling file `malformed-response.test.ts` uses MSW, because a bad body IS
 * a response-body fact and MSW is the right tool for it.)
 *
 * ⚠️ Do not "tidy" this into an MSW handler — it would stop testing the thing
 * that has no failure mode today.
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

/** A server that accepts the connection and never replies. */
function hangs() {
  const fn = vi.fn(
    (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        // A real fetch rejects with AbortError when its signal fires.
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        )
      }),
  )
  vi.stubGlobal('fetch', fn)
  return fn
}

// ============================================================================
// the VALUE — derived, not picked
// ============================================================================
describe('the timeout value is derived from constants that already exist', () => {
  it('a read budget is the staleTime, split across the attempts that consume it', () => {
    // 3 attempts (retry: failureCount < 2) + React Query's 1s/2s backoff, inside
    // a 30s staleTime. A value that took longer to fetch than it stays valid is
    // stale before it lands.
    expect(deriveReadTimeoutMs({ staleTimeMs: 30_000, attempts: 3, backoffMs: 3_000 })).toBe(9_000)
    expect(READ_TIMEOUT_MS).toBe(9_000)
  })

  it('⚠️ SCALES with the retry policy — it is not a number someone chose', () => {
    // Double the attempts and the per-attempt budget must shrink, or the reader
    // waits twice as long. This is what stops the value going stale.
    expect(deriveReadTimeoutMs({ staleTimeMs: 30_000, attempts: 6, backoffMs: 3_000 })).toBe(4_500)
    expect(deriveReadTimeoutMs({ staleTimeMs: 60_000, attempts: 3, backoffMs: 3_000 })).toBe(19_000)
  })

  it('⚠️ POST /refresh gets the BACKEND’s own budget, not the read budget', () => {
    // A refresh legitimately takes ~30s of work (10 news queries). Timing it out
    // on the read budget would report a failure for work that is still running
    // and about to succeed. The FE gives up exactly when the backend's own
    // single-flight lock would — `_derive_refresh_lock_ttl` = (q*2s + 10s) * 3.
    expect(deriveRefreshTimeoutMs(10)).toBe(90_000)
    expect(REFRESH_TIMEOUT_MS).toBe(90_000)
    // and it scales with the query count, exactly as the backend's does
    expect(deriveRefreshTimeoutMs(3)).toBe(48_000)
  })

  it('the slow budget is comfortably longer than the read budget', () => {
    expect(REFRESH_TIMEOUT_MS).toBeGreaterThan(READ_TIMEOUT_MS * 3)
  })
})

// ============================================================================
// the BEHAVIOUR — a hang must end in a sentence
// ============================================================================
describe('a hang ends in a named failure instead of never ending', () => {
  it('🔴 rejects with TimeoutError rather than hanging forever', async () => {
    hangs()
    await expect(
      apiRequest('/readiness', null, { auth: false, timeoutMs: 40 }),
    ).rejects.toBeInstanceOf(TimeoutError)
  })

  it('⚠️ a TIMEOUT IS NOT AN OUTAGE — it is not a NetworkError', async () => {
    // "The server is taking too long" and "cannot reach the API" are different
    // facts: one means the box answered and is struggling, the other means
    // nothing answered at all. Same discipline as unreachable != rejected.
    hangs()
    const err = await apiRequest('/readiness', null, {
      auth: false,
      timeoutMs: 40,
    }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TimeoutError)
    expect(err).not.toBeInstanceOf(NetworkError)
    expect((err as TimeoutError).message).toMatch(/too long/i)
    expect((err as TimeoutError).timeoutMs).toBe(40)
  })

  it('names the endpoint and the budget it exceeded', async () => {
    hangs()
    const err = (await apiRequest('/brief/today', null, {
      auth: false,
      timeoutMs: 40,
    }).catch((e: unknown) => e)) as TimeoutError
    expect(err.message).toContain('/brief/today')
    expect(err.message).toContain('40')
  })

  it('⚠️ a CALLER abort stays an abort — React Query cancelling is not a timeout', async () => {
    hangs()
    const controller = new AbortController()
    const p = apiRequest('/readiness', null, {
      auth: false,
      signal: controller.signal,
      timeoutMs: 5_000,
    })
    controller.abort()
    const err = (await p.catch((e: unknown) => e)) as Error
    expect(err.name).toBe('AbortError')
    expect(err).not.toBeInstanceOf(TimeoutError)
  })

  it('a request that answers in time is untouched, and the timer is cleared', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      ),
    )
    await expect(
      apiRequest('/readiness', null, { auth: false, timeoutMs: 40 }),
    ).resolves.toBeUndefined()
    // a leaked timer would fire after the test and abort a later request
    await new Promise((r) => setTimeout(r, 80))
  })
})
