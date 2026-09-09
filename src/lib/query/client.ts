import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError, TimeoutError } from '@/lib/api/client'

/**
 * One QueryClient per app. FININT is a PRE-OPEN read, not a live feed (FFE-007
 * — no WebSocket, no tick stream), so defaults are calm: a modest staleTime and
 * NO refetch-on-focus. The terminal-401 redirect is handled in the api client
 * (setUnauthorizedHandler); QueryCache.onError is where a global toast can hook
 * in later.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // ⚠️ NEVER RETRY A TIMEOUT. One attempt already spent the whole
          // freshness window; two more spend 60 further seconds to learn the
          // same thing, and the reader stares at a skeleton for 93s instead of
          // 30s before anything names the failure. Raising the per-attempt
          // budget (2026-09-09) made this matter — the retry policy MULTIPLIES
          // the budget, so the two must be changed together.
          if (error instanceof TimeoutError) return false
          // Never retry auth/client errors; the api client already handles 401.
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false
          }
          return failureCount < 2
        },
      },
    },
  })
}
