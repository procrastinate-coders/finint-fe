/**
 * The "what this means / where it comes from" layer (Bento Cockpit). A first-time
 * user understands the board when the screen explains, in plain words, what a
 * positioning state IS and which source produced it — descriptive facts only,
 * NEVER a buy/sell read (law 2). "price ↑ with OI ↑" describes the move that
 * happened; it does not endorse it.
 */

export interface OiStateInfo {
  label: string
  meaning: string
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

/** Human segment labels for the board's card groups. */
export const SEGMENT_LABEL: Record<string, string> = {
  bullion: 'Bullion',
  energy: 'Energy',
  base_metals: 'Base metals',
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
  if (p >= 85) return `${Math.round(p)}th percentile — positioning near an extreme (crowded)`
  if (p <= 20) return `${Math.round(p)}th percentile — light, uncrowded positioning`
  return `${Math.round(p)}th percentile — mid-range positioning`
}

/**
 * Coarse source → evidence-tile map, for the lineage highlight: hovering a
 * source lights up the tile(s) it produces, so "where the board comes from" is
 * felt, not diagrammed.
 */
export type EvidenceTile = 'board' | 'macro' | 'news'

export function sourceFeeds(key: string): EvidenceTile | null {
  switch (key) {
    case 'kite':
    case 'cot':
    case 'board':
      return 'board'
    case 'comex':
    case 'usdinr':
    case 'dxy':
    case 'macro_continuity':
      return 'macro'
    case 'news':
      return 'news'
    default:
      return null
  }
}
