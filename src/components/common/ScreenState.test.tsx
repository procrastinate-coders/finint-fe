import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ApiError, apiRequest, NetworkError, TimeoutError } from '@/lib/api/client'
import { createQueryClient } from '@/lib/query/client'
import { ScreenError } from './ScreenState'

/**
 * ⚠️ THE PATH FATHER ACTUALLY HITS. A failed query surfaces through
 * `useQuery().isError` and renders ScreenError — it never reaches the router's
 * errorComponent, so RootErrorScreen's wording does not cover it. On 2026-09-09
 * every data endpoint timed out and this component said "Check the backend
 * connection", which is the wrong place to look when the server answered slowly.
 */
describe('ScreenError names which failure it was', () => {
  it('🔴 a TIMEOUT says the server is slow, not that the connection is broken', () => {
    render(<ScreenError error={new TimeoutError('/readiness', 30_000)} />)
    expect(screen.getByText(/taking too long/i)).toBeInTheDocument()
    expect(screen.getByText(/\/readiness/)).toBeInTheDocument()
    expect(screen.getByText(/30s/)).toBeInTheDocument()
    expect(screen.getByText(/up, but slow/i)).toBeInTheDocument()
    // ...and NOT the old generic line that pointed at the wrong thing
    expect(document.body.textContent).not.toMatch(/check the backend connection/i)
  })

  it('an UNREACHABLE api reads differently again', () => {
    render(<ScreenError error={new NetworkError(new TypeError('Failed to fetch'))} />)
    expect(screen.getByText(/cannot reach the api/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/taking too long/i)
  })

  it('an ApiError still carries the backend own words', () => {
    render(<ScreenError error={new ApiError(503, 'upstream unavailable')} />)
    expect(screen.getByText(/upstream unavailable/)).toBeInTheDocument()
  })

  it('anything else still gets the plain line', () => {
    render(<ScreenError error={new Error('boom')} />)
    expect(screen.getByText(/could not load this screen/i)).toBeInTheDocument()
  })
})
// ============================================================================
// ⚠️ A HANG MUST END IN A SENTENCE, NOT MORE SKELETON
// ============================================================================
describe('the whole chain, from a hung socket to words on the screen', () => {
  it('🔴 hang -> TimeoutError -> not retried -> a named message', async () => {
    // The 2026-09-09 outage end to end, deterministically. Driven through the
    // real apiRequest, the real retry predicate and the real ScreenError rather
    // than through React Query's timers, which would test its plumbing and not
    // this code. The remaining glue — a failed query rendering ScreenError — is
    // long-standing behaviour covered by the screen tests.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_u: string, init?: RequestInit) =>
          new Promise<Response>((_res, rej) =>
            init?.signal?.addEventListener('abort', () =>
              rej(new DOMException('aborted', 'AbortError')),
            ),
          ),
      ),
    )
    const error = await apiRequest('/readiness', null, {
      auth: false,
      timeoutMs: 40,
    }).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(TimeoutError)

    const retry = createQueryClient().getDefaultOptions().queries?.retry as (
      n: number,
      e: Error,
    ) => boolean
    expect(retry(0, error as Error)).toBe(false) // no 3x wait to learn the same thing

    render(<ScreenError error={error} />)
    expect(screen.getByText(/taking too long/i)).toBeInTheDocument()
    expect(screen.getByText(/up, but slow/i)).toBeInTheDocument()
    // never the endless skeleton, never the wrong diagnosis
    expect(document.body.textContent).not.toMatch(/check the backend connection/i)
  })
})
