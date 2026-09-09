import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  apiRequest,
  deriveReadTimeoutMs,
  deriveRefreshTimeoutMs,
  deriveWorstCaseWaitMs,
  READ_TIMEOUT_MS,
  REFRESH_TIMEOUT_MS,
  TimeoutError,
  NetworkError,
} from './client'
import { createQueryClient } from '@/lib/query/client'

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
  it('ONE attempt is budgeted against the staleTime it must land inside', () => {
    // ⚠️ THE CORRECTED PREMISE (2026-09-09). The first version charged the whole
    // retry sequence to the freshness window and produced 9s — which cancelled a
    // real 10.49s /readiness and took the app down for a morning. staleTime says
    // how long a value we HOLD stays worth keeping; a fetch that outlives it
    // lands on something the app already wants to refetch.
    expect(deriveReadTimeoutMs({ staleTimeMs: 30_000 })).toBe(30_000)
    expect(READ_TIMEOUT_MS).toBe(30_000)
  })

  it('SCALES with the staleTime — it is not a number someone chose', () => {
    expect(deriveReadTimeoutMs({ staleTimeMs: 60_000 })).toBe(60_000)
    expect(deriveReadTimeoutMs({ staleTimeMs: 15_000 })).toBe(15_000)
  })

  it('clears the MEASURED failure by a real margin', () => {
    // /readiness: 18,250 bytes, 10.49s from the laptop on 2026-09-09. 10.5s is
    // what the link did that day, not a floor — so the margin is asserted, and
    // shrinking staleTime cannot silently re-create the outage.
    const MEASURED_WORST_READ_MS = 10_490
    expect(READ_TIMEOUT_MS).toBeGreaterThanOrEqual(MEASURED_WORST_READ_MS * 2)
  })

  it('the retry policy MULTIPLIES it, so a timeout is not retried', () => {
    // Unhandled this would be 3 x 30s + 3s = 93s of skeleton before the error
    // screen — worse than the 30s it replaced.
    expect(
      deriveWorstCaseWaitMs({
        perAttemptMs: READ_TIMEOUT_MS,
        attempts: 3,
        backoffMs: 3_000,
      }),
    ).toBe(93_000)
    const client = createQueryClient()
    const retry = client.getDefaultOptions().queries?.retry as (
      n: number,
      e: Error,
    ) => boolean
    expect(retry(0, new TimeoutError('/readiness', READ_TIMEOUT_MS))).toBe(false)
    expect(retry(0, new Error('flaky'))).toBe(true)
  })

  it('POST /refresh keeps the BACKEND own budget, untouched', () => {
    expect(deriveRefreshTimeoutMs(10)).toBe(90_000)
    expect(REFRESH_TIMEOUT_MS).toBe(90_000)
    expect(deriveRefreshTimeoutMs(3)).toBe(48_000)
  })

  it('the slow budget is still longer than the read budget', () => {
    expect(REFRESH_TIMEOUT_MS).toBeGreaterThan(READ_TIMEOUT_MS)
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
