import { QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api/client'

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
