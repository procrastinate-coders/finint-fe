import type { MacroRow } from '@/lib/api/contracts'
import { formatNumber, formatSignedNumber } from '@/lib/format'

/**
 * FIN-188 — the two energy instruments that carry an EIA weekly inventory line,
 * each mapped to its `macro_daily` indicator (source EIA). Mirrors the backend
 * `EIA_SERIES` map in `../finint/src/live/eia.py`. Only these two.
 */
export const EIA_INDICATOR_BY_INSTRUMENT: Record<string, string> = {
  CRUDEOIL: 'EIA_CRUDE_STOCKS',
  NATURALGAS: 'EIA_NATGAS_STORAGE',
}

export interface EiaRef {
  /** Which series — selects the crude-vs-natgas unit + label. */
  indicator: string
  /** The inventory level, in the series' NATIVE unit (MBBL crude / BCF natgas). */
  value: number
  /** The backend-computed week-over-week delta (native unit); null with no prior week. */
  wow: number | null
  /** The backend's direction word ("draw" / "build" / "flat"); null when no wow. */
  direction: string | null
  /** The EIA report week-ending date (provenance). */
  asOf: string | null
}

/**
 * The EIA inventory reference for CRUDEOIL / NATURALGAS, joined from the readiness
 * evidence macro rows (FIN-188). The WoW + direction are BACKEND-computed and
 * served (`MacroRow.wow` / `.wow_direction`) — the FE never diffs weeks itself.
 *
 * FAIL-CLOSED (law 1, mirroring the backend): null when the instrument isn't one
 * of the two energy series, has no EIA row, or the row's value is null (EIA down →
 * the backend OMITS the row; the card shows what it shows today, never a made-up
 * number).
 */
export function eiaRefFor(
  instrumentId: string,
  macro: MacroRow[] | null | undefined,
): EiaRef | null {
  const indicator = EIA_INDICATOR_BY_INSTRUMENT[instrumentId]
  if (!indicator || !macro) return null
  const row = macro.find((m) => m.indicator === indicator)
  if (!row || row.value == null) return null
  return {
    indicator,
    value: row.value,
    wow: row.wow ?? null,
    direction: row.wow_direction ?? null,
    asOf: row.as_of ?? null,
  }
}

export interface EiaLine {
  label: string
  level: string
  /** The signed WoW string, or null when the backend served no delta (no prior week). */
  wow: string | null
  /** "draw" / "build" / "flat" — the backend's word, shown neutrally (never a pick). */
  direction: string | null
}

/**
 * Format an EIA reference — a RELEASED FACT, never a forecast. Reporting units:
 * crude in MILLIONS of barrels (the backend ships MBBL = thousands, so ÷1000 is a
 * display unit conversion — the same scale the backend's own grounding line uses,
 * not FE analysis); natgas in Bcf as-shipped. The WoW keeps its sign, never
 * rounded to hide a small move. `draw`/`build` is the backend's word (descriptive
 * of the inventory move, never a buy/sell read — law 2/8). A null `wow` renders
 * the level alone (fail-closed on the delta).
 */
export function formatEia(ref: EiaRef): EiaLine {
  if (ref.indicator === 'EIA_CRUDE_STOCKS') {
    return {
      label: 'EIA crude stocks',
      level: `${formatNumber(ref.value / 1000, { decimals: 1 })}M bbl`,
      wow:
        ref.wow == null
          ? null
          : `${formatSignedNumber(ref.wow / 1000, { decimals: 2 })}M bbl w/w`,
      direction: ref.direction,
    }
  }
  return {
    label: 'EIA natgas storage',
    level: `${formatNumber(ref.value, { decimals: 0 })} Bcf`,
    wow:
      ref.wow == null
        ? null
        : `${formatSignedNumber(ref.wow, { decimals: 0 })} Bcf w/w`,
    direction: ref.direction,
  }
}
