import { useQuery } from '@tanstack/react-query'
import { getMe, getReadiness } from '@/lib/api/endpoints'

// Stable query keys. FIN-149's screens (readiness panel, generate, brief) hang
// their hooks here as they land — keep the keys stable.
export const queryKeys = {
  me: ['auth', 'me'] as const,
  readiness: ['readiness'] as const,
}

/** The current user (Father) — rehydrates the shell from GET /auth/me. */
export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => getMe(signal),
  })
}

/**
 * The 8-source readiness gate. The highest-value $0 read — it proves the system
 * is honest. Consumers map over `data.sources` (law 5) and NEVER hardcode it.
 */
export function useReadiness() {
  return useQuery({
    queryKey: queryKeys.readiness,
    queryFn: ({ signal }) => getReadiness(signal),
  })
}
