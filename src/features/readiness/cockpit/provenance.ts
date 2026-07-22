/**
 * The "what this means / where it comes from" layer (Bento Cockpit). A first-time
 * user understands the board when the screen explains, in plain words, what a
 * positioning state IS and which source produced it — descriptive facts only,
 * NEVER a buy/sell read (law 2).
 *
 * OI-state / COT domain knowledge now lives in `@/lib/mcx/oi-state` (shared with
 * the brief surface, FIN-162); re-exported here so the cockpit's local imports
 * (`./provenance`) keep working unchanged.
 */
export { oiStateInfo, cotMeaning } from '@/lib/mcx/oi-state'
export type { OiStateInfo } from '@/lib/mcx/oi-state'

/** Human segment labels for the board's card groups. */
export const SEGMENT_LABEL: Record<string, string> = {
  bullion: 'Bullion',
  energy: 'Energy',
  base_metals: 'Base metals',
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
    case 'lme': // FIN-142: LME source produces the cards' LME 3M reference line
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
