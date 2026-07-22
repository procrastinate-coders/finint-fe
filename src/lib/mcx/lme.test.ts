import { describe, expect, it } from 'vitest'
import type { MacroRow } from '@/lib/api/contracts'
import { LME_INDICATOR_BY_INSTRUMENT, lmeRefFor } from './lme'

// The five LME rows exactly as the live API ships them (confirmed 2026-07-22 from
// GET /readiness → evidence.macro): source METALS_DEV, value only, NO d/d field.
function row(indicator: string, value: number | null): MacroRow {
  return {
    indicator,
    value,
    source: 'METALS_DEV',
    as_of: '2026-07-22',
    carried_forward: false,
  }
}
const LIVE_MACRO: MacroRow[] = [
  row('LME_COPPER_3M', 13836.0),
  row('LME_ZINC_3M', 3566.0),
  row('LME_ALUMINIUM_3M', 3170.5),
  row('LME_LEAD_3M', 1888.5),
  row('LME_NICKEL_3M', 17160.0),
  // a non-LME macro row must never be picked up as a metal reference
  row('USDINR', 96.47),
]

describe('lmeRefFor — the per-metal LME 3M join (FIN-142)', () => {
  it('maps every base metal to ITS OWN indicator (British ALUMINIUM spelling)', () => {
    expect(LME_INDICATOR_BY_INSTRUMENT).toEqual({
      COPPER: 'LME_COPPER_3M',
      ZINC: 'LME_ZINC_3M',
      ALUMINIUM: 'LME_ALUMINIUM_3M',
      LEAD: 'LME_LEAD_3M',
      NICKEL: 'LME_NICKEL_3M',
    })
  })

  it('COPPER resolves copper’s value (13836), NOT zinc’s — the mapping is per-metal', () => {
    expect(lmeRefFor('COPPER', LIVE_MACRO)?.value).toBe(13836.0)
    expect(lmeRefFor('ZINC', LIVE_MACRO)?.value).toBe(3566.0)
    expect(lmeRefFor('ALUMINIUM', LIVE_MACRO)?.value).toBe(3170.5)
    expect(lmeRefFor('LEAD', LIVE_MACRO)?.value).toBe(1888.5)
    expect(lmeRefFor('NICKEL', LIVE_MACRO)?.value).toBe(17160.0)
    // and it carries the provenance date, not a fabricated one
    expect(lmeRefFor('COPPER', LIVE_MACRO)?.asOf).toBe('2026-07-22')
  })

  it('FAIL-CLOSED: a metal with no LME row → null (no fabricated level)', () => {
    const noAlu = LIVE_MACRO.filter((m) => m.indicator !== 'LME_ALUMINIUM_3M')
    expect(lmeRefFor('ALUMINIUM', noAlu)).toBeNull()
  })

  it('FAIL-CLOSED: a present LME row with a null value → null (metals.dev down)', () => {
    const nulled = [row('LME_LEAD_3M', null)]
    expect(lmeRefFor('LEAD', nulled)).toBeNull()
  })

  it('a non-base-metal instrument (GOLD) has no LME reference', () => {
    expect(lmeRefFor('GOLD', LIVE_MACRO)).toBeNull()
  })

  it('null / empty macro → null, never throws', () => {
    expect(lmeRefFor('COPPER', null)).toBeNull()
    expect(lmeRefFor('COPPER', [])).toBeNull()
  })
})
