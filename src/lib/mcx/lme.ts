import type { MacroRow } from '@/lib/api/contracts'

/**
 * FIN-142 — the base metals that carry an LME 3M reference LEVEL, each mapped to
 * its `macro_daily` indicator (source `METALS_DEV`). This MIRRORS the backend
 * registry `LME_METALS` in `../finint/src/live/lme.py`: British "ALUMINIUM" for
 * BOTH the MCX `instrument_id` and the indicator (metals.dev's raw `lme_aluminum`
 * (US spelling) is a backend-internal fetch key that never reaches the FE — the
 * API returns `LME_ALUMINIUM_3M`, confirmed live 2026-07-22).
 *
 * This is an explicit 5-metal map, not a dynamic list, so it does NOT fall under
 * law 5 (which is about the registry-driven readiness `sources`). It mirrors a
 * fixed backend constant; if the backend ever adds a base metal, add it here.
 */
export const LME_INDICATOR_BY_INSTRUMENT: Record<string, string> = {
  COPPER: 'LME_COPPER_3M',
  ZINC: 'LME_ZINC_3M',
  ALUMINIUM: 'LME_ALUMINIUM_3M',
  LEAD: 'LME_LEAD_3M',
  NICKEL: 'LME_NICKEL_3M',
}

export interface LmeRef {
  /** The LME 3M reference level in USD/tonne (a context PRICE, not an implied open). */
  value: number
  /** The session date the metals.dev level is as-of (for provenance). */
  asOf: string | null
}

/**
 * The LME 3M reference LEVEL for a base metal, joined from the readiness evidence
 * macro rows by indicator. It is a reference PRICE (USD/tonne) — CONTEXT only,
 * never an implied open and never a predicted pre-open move.
 *
 * FAIL-CLOSED (law 1, mirroring the backend): returns `null` when the instrument
 * is not a base metal, has no LME macro row, or the row's `value` is null (when
 * metals.dev is down the backend OMITS the row — the card then shows what it
 * shows today, never a fabricated level).
 */
export function lmeRefFor(
  instrumentId: string,
  macro: MacroRow[] | null | undefined,
): LmeRef | null {
  const indicator = LME_INDICATOR_BY_INSTRUMENT[instrumentId]
  if (!indicator || !macro) return null
  const row = macro.find((m) => m.indicator === indicator)
  if (!row || row.value == null) return null
  return { value: row.value, asOf: row.as_of ?? null }
}
