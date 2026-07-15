import type { ReadinessSource } from '@/lib/api/contracts'

/**
 * On-land auto-refresh is STALE-GATED, never unconditional (FFE-006). Getting
 * this wrong kills the GNews quota: the free tier is 100 req/day and each
 * `refresh_spine` burns ~6 queries — ~16 refreshes exhaust the DAY and the real
 * morning brief fails. React StrictMode double-mounts in dev; the backend's
 * Redis single-flight guard is a BACKSTOP, not our design.
 *
 * THE RULE, derived from what `refresh_spine` actually fixes (macro[comex/usdinr/
 * dxy] · COT · news · token-status): refresh ONLY IF one of those is RED.
 *  - NEVER on amber alone (macro_continuity is PERMANENTLY amber by design → a
 *    naive "not green → refresh" would fire on every mount, forever).
 *  - NEVER for kite red  → needs the manual login modal; a refresh won't fix it.
 *  - NEVER for board red → needs a backfill; there is no FE refresh action.
 *
 * These keys are a domain fact about what POST /refresh repairs — NOT the source
 * list (which is registry-driven and mapped over for rendering, law 5).
 */
const REFRESH_FIXABLE_KEYS = new Set(['news', 'comex', 'usdinr', 'dxy', 'cot'])

export function shouldRefreshOnLand(sources: ReadinessSource[]): boolean {
  return sources.some(
    (s) => REFRESH_FIXABLE_KEYS.has(s.key) && s.status === 'red',
  )
}

/**
 * Once-guard for the on-land fire. A module-level flag (not component state) so
 * it survives a StrictMode double-mount AND cannot re-fire if a source stays red
 * after the refresh (which would loop and storm the quota). Fire AT MOST ONCE
 * per tab session; a real page reload resets module state naturally, and logout
 * calls `resetOnLandRefresh()`.
 */
let attempted = false

export function hasAttemptedOnLandRefresh(): boolean {
  return attempted
}

export function markOnLandRefreshAttempted(): void {
  attempted = true
}

export function resetOnLandRefresh(): void {
  attempted = false
}
