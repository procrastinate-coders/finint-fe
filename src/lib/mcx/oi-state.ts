/**
 * MCX positioning domain knowledge — shared by the readiness cockpit AND the
 * brief surface (one source of truth so the two never drift). OI state is
 * Father's CORE read in his own language (NEW_LONGS / SHORT_COVERING /
 * NEW_SHORTS / LONG_LIQUIDATION). Descriptive facts only — "price ↑ with OI ↑"
 * describes the move that happened; it NEVER endorses a direction (law 2/8).
 */
export interface OiStateInfo {
  label: string
  meaning: string
  /** New positions entering (vs unwinding). A state, not a recommendation. */
  building: boolean
  /** The observed move — descriptive facts (law 2/8), never a recommendation. */
  price: 'up' | 'down'
  oi: 'up' | 'down'
}

const OI_STATE: Record<string, OiStateInfo> = {
  NEW_LONGS: {
    label: 'New longs',
    meaning: 'price ↑ with open interest ↑ — new long positions building',
    building: true,
    price: 'up',
    oi: 'up',
  },
  SHORT_COVERING: {
    label: 'Short covering',
    meaning: 'price ↑ with open interest ↓ — shorts closing out (unwinding)',
    building: false,
    price: 'up',
    oi: 'down',
  },
  NEW_SHORTS: {
    label: 'New shorts',
    meaning: 'price ↓ with open interest ↑ — new short positions building',
    building: true,
    price: 'down',
    oi: 'up',
  },
  LONG_LIQUIDATION: {
    label: 'Long liquidation',
    meaning: 'price ↓ with open interest ↓ — longs closing out (unwinding)',
    building: false,
    price: 'down',
    oi: 'down',
  },
}

export function oiStateInfo(
  state: string | null | undefined,
): OiStateInfo | null {
  return state ? (OI_STATE[state] ?? null) : null
}

/** A COT percentile is a crowding STATE, described plainly — not a signal. */
export function cotMeaning(pctile: number | null | undefined): string {
  if (pctile == null) return 'no CFTC COT for LME metals (by design)'
  const p = pctile * 100
  if (p >= 85)
    return `${Math.round(p)}th percentile — positioning near an extreme (crowded)`
  if (p <= 20)
    return `${Math.round(p)}th percentile — light, uncrowded positioning`
  return `${Math.round(p)}th percentile — mid-range positioning`
}
