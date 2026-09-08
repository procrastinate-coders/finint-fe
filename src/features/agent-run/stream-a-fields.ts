import { z } from 'zod'
import type { AgentRunBoardRow } from '@/lib/api/contracts'

/**
 * FIN-228 Stream A board facts — term structure, the roll, import-parity premium,
 * levels and volatility.
 *
 * ⚠️ THE ENDPOINT DOES NOT SERVE THESE YET. `push_agent_run.BOARD_FIELDS` carries
 * nine keys; the four analysts collectively cite THIRTY-FOUR, and all of them are
 * already in the scan bundle. So these arrive on the board row's `.passthrough()`
 * the moment `BOARD_FIELDS` is extended, under exactly these names —
 * `board_from_scan` copies bundle keys verbatim — and this module is what reads
 * them until the generated contract covers them. Regenerate and DELETE it then.
 *
 * ⚠️ Until they are served, every one of these is absent, and absent renders as
 * an omission with a named reason — never a zero, never a dash standing in for a
 * value the board actually has.
 */
const num = z.union([z.number(), z.null()]).optional()
const str = z.union([z.string(), z.null()]).optional()

export const boardExtras = z
  .object({
    // term structure + the roll
    term_structure: str,
    near_next_spread: num,
    near_next_spread_change: num,
    spread_basis: str,
    next_oi_share: num,
    sessions_to_expiry: num,
    roll_basis: str,
    // import-parity premium
    premium_pct: num,
    premium_z: num,
    premium_window: num,
    premium_basis: str,
    // levels + volatility
    support_level: num,
    resistance_level: num,
    dist_to_support: num,
    dist_to_resistance: num,
    dist_to_support_atr: num,
    dist_to_resistance_atr: num,
    atr: num,
    atr_avg: num,
    cont_stale_sessions: num,
    // the cross-market legs
    intl_change_pct: num,
    usdinr_change_pct: num,
  })
  .passthrough()

export type BoardExtras = z.infer<typeof boardExtras>

export function extrasOf(row: AgentRunBoardRow | undefined): BoardExtras {
  if (!row) return {}
  const parsed = boardExtras.safeParse(row)
  return parsed.success ? parsed.data : {}
}

// ============================================================================
// ⚠️ THE PREMIUM Z NEVER TRAVELS WITHOUT ITS WINDOW
// ============================================================================
export type PremiumReading =
  | { kind: 'absent' }
  /** A z with no sample size behind it is withheld, and the page says why. */
  | { kind: 'z_unusable'; pct: number | null | undefined; z: number }
  | {
      kind: 'shown'
      pct: number | null | undefined
      z: number | null | undefined
      window: number | null | undefined
      basis: string | null | undefined
    }

/**
 * ⚠️ A Z-SCORE WITHOUT ITS SAMPLE SIZE IS FIN-215's DEFECT IN A NEW PLACE. This
 * premium z is 196 sessions against a 180 floor — close enough to the floor that
 * the window is part of the reading, not a footnote. So `premium_z` is rendered
 * ONLY when `premium_window` is present beside it; a z with no window is withheld
 * and named as withheld, never quietly printed as if the sample were established.
 * The percentage itself needs no window and is shown either way.
 */
export function premiumReading(x: BoardExtras): PremiumReading {
  const hasZ = x.premium_z != null
  const hasWindow = x.premium_window != null
  if (!hasZ && x.premium_pct == null) return { kind: 'absent' }
  if (hasZ && !hasWindow) {
    return { kind: 'z_unusable', pct: x.premium_pct, z: x.premium_z as number }
  }
  return {
    kind: 'shown',
    pct: x.premium_pct,
    z: x.premium_z,
    window: x.premium_window,
    basis: x.premium_basis,
  }
}

// ============================================================================
// The board-level ratio block (gold/silver, crude/natgas)
// ============================================================================

/**
 * ⚠️ NOT SERVED EITHER — `ratios` sits at the top of scan.json, beside `bundles`,
 * and the endpoint carries neither. Requested as a top-level `ratios` key.
 *
 * ⚠️ THE VALUE AND THE PERCENTILE ARE NOT THE SAME MEASUREMENT and must never be
 * printed as an undifferentiated pair. The value is today's ACTUAL contract over
 * today's ACTUAL contract; the percentile is over 250 back-adjusted CONTINUOUS
 * sessions — a different series, whose level differs slightly from the actuals.
 * The `basis` string says so in the backend's own words, so it is rendered
 * verbatim underneath rather than summarised into a label that would lose it.
 */
export const ratioBlock = z
  .object({
    numerator: str,
    denominator: str,
    value: num,
    percentile: num,
    window: num,
    unit_convention: str,
    basis: str,
  })
  .passthrough()

export const ratiosMap = z.record(z.string(), ratioBlock)

export type RatioBlock = z.infer<typeof ratioBlock>

/** Read `ratios` off the response's passthrough. Absent → an empty list. */
export function ratiosOf(data: unknown): Array<{ key: string; ratio: RatioBlock }> {
  if (!data || typeof data !== 'object') return []
  const raw = (data as Record<string, unknown>).ratios
  const parsed = ratiosMap.safeParse(raw)
  if (!parsed.success) return []
  return Object.entries(parsed.data).map(([key, ratio]) => ({ key, ratio }))
}
