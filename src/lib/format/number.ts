/**
 * THE number formatter (FFE-002). This is where finint-fe deliberately diverges
 * from apex-admin's "money is rendered, never recomputed" law: FININT's API
 * ships raw numbers in a JSONB blob (`close: 147889.00`, `oi_change: -506`) with
 * NO `*_display` strings, so the FE formats them — but in ONE module. There is
 * NO ad-hoc `toFixed()` / `Intl.NumberFormat` anywhere else (lint-enforced).
 *
 * The rules (non-negotiable):
 *  - Indian grouping via `Intl.NumberFormat('en-IN')` → ₹1,47,889 (Father reads
 *    lakhs; international grouping makes the screen feel foreign to him).
 *  - Percentages carry an explicit sign, 2–3dp, never rounded to hide a move.
 *  - Negatives use the typographic MINUS (U+2212), never a hyphen.
 *  - `null` / `undefined` / `NaN` → "—" (law 1). NEVER 0, NEVER "N/A", NEVER blank.
 *
 * NOTE: FININT does NO money arithmetic. These functions only PRESENT a number
 * the backend already computed. If you find yourself doing math on a price, stop.
 */

/** The single "we don't know" glyph. A missing number is honest (law 1). */
export const DASH = '—'

/** Typographic minus (U+2212) — a dropped sign must be visible. */
const MINUS = '−'

const isMissing = (v: number | null | undefined): v is null | undefined =>
  v == null || !Number.isFinite(v)

// Cache one NumberFormat per fraction-digit count (Intl construction is costly).
const inrCache = new Map<number, Intl.NumberFormat>()
function grouped(decimals: number): Intl.NumberFormat {
  let fmt = inrCache.get(decimals)
  if (!fmt) {
    fmt = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
    inrCache.set(decimals, fmt)
  }
  return fmt
}

interface NumberOpts {
  /** fixed fraction digits (default 0) */
  decimals?: number
}

/**
 * Indian-grouped rupees: `147889` → `₹1,47,889`. `value` is already in RUPEES
 * (FININT ships rupee floats, not paise). null/NaN → "—".
 */
export function formatInr(
  value: number | null | undefined,
  { decimals = 0 }: NumberOpts = {},
): string {
  if (isMissing(value)) return DASH
  const neg = value < 0
  return `${neg ? MINUS : ''}₹${grouped(decimals).format(Math.abs(value))}`
}

/** Indian-grouped plain number (no ₹): OI, article counts, etc. null → "—". */
export function formatNumber(
  value: number | null | undefined,
  { decimals = 0 }: NumberOpts = {},
): string {
  if (isMissing(value)) return DASH
  const neg = value < 0
  return `${neg ? MINUS : ''}${grouped(decimals).format(Math.abs(value))}`
}

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/**
 * US dollars — the generate run's LLM cost (`cost_usd`). The ONE thing on the
 * screen that isn't rupees: the API bills in USD. 2–4 dp so `$0.1126` shows its
 * real precision, never rounded to hide what a run actually spent. null → "—".
 */
export function formatUsd(value: number | null | undefined): string {
  if (isMissing(value)) return DASH
  return usd.format(value)
}

/**
 * A signed number (OI change, net flow): `-506` → `−506`, `1240` → `+1,240`.
 * Zero shows no sign. null → "—".
 */
export function formatSignedNumber(
  value: number | null | undefined,
  { decimals = 0 }: NumberOpts = {},
): string {
  if (isMissing(value)) return DASH
  if (value === 0) return grouped(decimals).format(0)
  const sign = value > 0 ? '+' : MINUS
  return `${sign}${grouped(decimals).format(Math.abs(value))}`
}

/**
 * A percentage with an ALWAYS-explicit sign: `1.638` → `+1.64%` (default 2dp),
 * or `+1.638%` at 3dp for implied-open precision. Zero shows no sign. Negatives
 * use the typographic minus. null → "—". Never rounded to 0dp (that would hide a
 * small move).
 */
export function formatPct(
  value: number | null | undefined,
  { decimals = 2 }: NumberOpts = {},
): string {
  if (isMissing(value)) return DASH
  const magnitude = Math.abs(value).toFixed(decimals)
  const sign = value > 0 ? '+' : value < 0 ? MINUS : ''
  return `${sign}${magnitude}%`
}

/**
 * A COT percentile: the backend ships a 0–1 fraction (0.7381) → "74th". null →
 * "—" (Tier-B has no CFTC COT, by design — that is honest, not an error).
 */
export function formatPercentile(value: number | null | undefined): string {
  if (isMissing(value)) return DASH
  const n = Math.round(value * 100)
  const rem100 = n % 100
  const rem10 = n % 10
  const suffix =
    rem100 >= 11 && rem100 <= 13
      ? 'th'
      : rem10 === 1
        ? 'st'
        : rem10 === 2
          ? 'nd'
          : rem10 === 3
            ? 'rd'
            : 'th'
  return `${n}${suffix}`
}
