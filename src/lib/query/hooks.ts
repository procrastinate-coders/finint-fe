import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  generate,
  getBriefToday,
  getGenerateStatus,
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
  generateStatus: (runId: string) => ['generate', 'status', runId] as const,
  briefToday: ['brief', 'today'] as const,
}

/** A generate/status run is finished when it reaches one of these. */
export function isTerminalStatus(status: string | undefined): boolean {
  return status === 'done' || status === 'error'
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

/**
 * POST /generate — PAID (~$0.11/run). The mutation resolves fast; the run then
 * proceeds in the BACKGROUND. It returns either a fresh run (`status:"running"`,
 * `run_id`) to poll, or `status:"already_complete"` with the brief served from
 * store ($0). We DON'T invalidate readiness here — `can_generate` stays true by
 * design even after a run (the BE serves from store).
 */
export function useGenerate() {
  return useMutation({ mutationFn: () => generate() })
}

/**
 * GET /generate/status?run_id — poll the 4-step progress while the run is live,
 * and STOP the instant it reaches a terminal state (done|error). No eternal
 * spinner: `refetchInterval` returns false once terminal, so a finished run is
 * read exactly once more and then left alone.
 */
export function useGenerateStatus(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.generateStatus(runId ?? ''),
    queryFn: ({ signal }) => getGenerateStatus(runId as string, signal),
    enabled: enabled && !!runId,
    refetchInterval: (query) =>
      isTerminalStatus(query.state.data?.status) ? false : 2500,
  })
}

/**
 * GET /brief/today → the served brief. FIN-161 reads it ONLY after a confirmed
 * terminal run, to surface the honesty flags (meta.guard_failed /
 * fabricated_claims) at handoff (law 4) — NOT to decide landing (that's FIN-172).
 */
export function useBriefToday(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.briefToday,
    queryFn: ({ signal }) => getBriefToday(signal),
    enabled,
    staleTime: 60 * 1000,
  })
}
