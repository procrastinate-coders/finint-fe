import type { ReadinessSource } from '@/lib/api/contracts'

/**
 * On-land auto-refresh is STALE-GATED, never unconditional (FFE-006). Getting
 * this wrong kills the GNews quota: the free tier is 100 req/day and each
 * `refresh_spine` burns ~6 queries — ~16 refreshes exhaust the DAY and the real
 * morning brief fails. React StrictMode double-mounts in dev; the backend's
 * Redis single-flight guard is a BACKSTOP, not our design.
 *
 * THE RULE (FIN-170): refresh on-land iff some source is REFRESHABLE VIA POST
 * /refresh **and** (it's RED **or** it's CRITICAL and not green).
 *
 * "Refreshable via /refresh" is DERIVED from the backend flag `action === 'refresh'`
 * — the single source of truth for what `refresh_spine` covers (comex/usdinr/dxy ·
 * COT · news). We no longer hardcode that key list here: FIN-170 fixed the backend to
 * stamp the flag from `refresh_spine`'s coverage, so trusting it keeps the FE from
 * drifting (the very bug we're fixing). This naturally excludes:
 *  - `kite` (action `kite_refresh`) → the manual login modal; a refresh won't fix it,
 *  - `board` / `macro_continuity` (action `null`) → a backfill / structural FRED lag,
 *  - any unknown source the backend does NOT mark refreshable.
 *
 * The critical-AND-not-green arm is the FIN-160 hole: a CRITICAL AMBER source (USD/INR
 * on 2026-07-16) already BLOCKS generate, yet the old red-only rule left it stranded —
 * blocked, no button, no auto-fix. A non-critical amber still never fires (quota safe).
 */
function isRefreshable(s: ReadinessSource): boolean {
  return s.action === 'refresh'
}

export function shouldRefreshOnLand(sources: ReadinessSource[]): boolean {
  return sources.some(
    (s) =>
      isRefreshable(s) &&
      (s.status === 'red' || (s.critical && s.status !== 'green')),
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
