import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getKiteLoginUrl,
  getMe,
  getReadiness,
  kiteRefresh,
  refreshSpine,
} from '@/lib/api/endpoints'

// Stable query keys. Screens hang their hooks here as they land — keep stable.
export const queryKeys = {
  me: ['auth', 'me'] as const,
  readiness: ['readiness'] as const,
  kiteLoginUrl: ['kite', 'login-url'] as const,
}

/** The current user (Father) — rehydrates the shell from GET /auth/me. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => getMe(signal),
  })
}

/**
 * The readiness gate. The highest-value $0 read — it proves the system is honest.
 * Consumers map over `data.sources` (law 5) and NEVER hardcode the list.
 */
export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: ({ signal }) => getReadiness(signal),
  })
}

/**
 * POST /refresh — trigger `refresh_spine` (macro + COT + news + token status).
 * On success, re-read /readiness so the dots reflect the new state. The caller
 * inspects the returned RefreshResponse to render the honest per-source truth
 * (refreshed / already_running / a partial with a named failed source) — this
 * mutation deliberately does NOT flatten a partial into a toast.
 */
export function useRefreshSpine() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => refreshSpine(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.readiness })
    },
  })
}

/**
 * GET /kite/login-url — the Kite connect URL (api_key stays on the backend).
 * Fetched on demand (the modal opens it), never eagerly.
 */
export function useKiteLoginUrl(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.kiteLoginUrl,
    queryFn: ({ signal }) => getKiteLoginUrl(signal),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * POST /kite/refresh — exchange the pasted request_token for the daily token.
 * Returns `{ ok, reason?, source }` where `source` is the refreshed kite dot
 * (a full source object). On success, re-read /readiness.
 */
export function useKiteRefresh() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestToken: string) => kiteRefresh(requestToken),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.readiness })
    },
  })
}
