import { describe, expect, it } from 'vitest'
import type { MacroRow } from '@/lib/api/contracts'
import {
  EIA_INDICATOR_BY_INSTRUMENT,
  eiaRefFor,
  formatEia,
} from './eia'

// The two EIA rows exactly as the live API ships them (confirmed 2026-07-22 from
// GET /readiness → evidence.macro): value + backend-computed wow + wow_direction.
function row(
  indicator: string,
  value: number | null,
  wow: number | null = null,
  wow_direction: string | null = null,
): MacroRow {
  return {
    indicator,
    value,
    wow,
    wow_direction,
    source: 'EIA',
    as_of: '2026-07-10',
    carried_forward: false,
  }
}
const LIVE_MACRO: MacroRow[] = [
  row('EIA_CRUDE_STOCKS', 409665, -1692, 'draw'),
  row('EIA_NATGAS_STORAGE', 3024, 41, 'build'),
  row('USDINR', 96.47), // a non-EIA row must never be picked up
]

describe('eiaRefFor — the per-instrument EIA join (FIN-188)', () => {
  it('maps only CRUDEOIL + NATURALGAS to their indicators', () => {
    expect(EIA_INDICATOR_BY_INSTRUMENT).toEqual({
      CRUDEOIL: 'EIA_CRUDE_STOCKS',
      NATURALGAS: 'EIA_NATGAS_STORAGE',
    })
  })

  it('CRUDEOIL resolves crude stocks (value + wow + direction), NOT natgas', () => {
    const ref = eiaRefFor('CRUDEOIL', LIVE_MACRO)
    expect(ref).toEqual({
      indicator: 'EIA_CRUDE_STOCKS',
      value: 409665,
      wow: -1692,
      direction: 'draw',
      asOf: '2026-07-10',
    })
    expect(eiaRefFor('NATURALGAS', LIVE_MACRO)?.value).toBe(3024)
    expect(eiaRefFor('NATURALGAS', LIVE_MACRO)?.direction).toBe('build')
  })

  it('FAIL-CLOSED: no EIA row → null; null value → null; non-energy → null', () => {
    expect(
      eiaRefFor('CRUDEOIL', [row('EIA_NATGAS_STORAGE', 3024, 41, 'build')]),
    ).toBeNull()
    expect(eiaRefFor('CRUDEOIL', [row('EIA_CRUDE_STOCKS', null)])).toBeNull()
    expect(eiaRefFor('GOLD', LIVE_MACRO)).toBeNull()
    expect(eiaRefFor('CRUDEOIL', null)).toBeNull()
  })

  it('a served row with no wow → the ref carries null wow/direction (no prior week)', () => {
    const ref = eiaRefFor('CRUDEOIL', [row('EIA_CRUDE_STOCKS', 409665)])
    expect(ref?.value).toBe(409665)
    expect(ref?.wow).toBeNull()
    expect(ref?.direction).toBeNull()
  })
})

describe('formatEia — released FACT, native→display units (FIN-188)', () => {
  it('crude: MBBL→M bbl level + signed M bbl w/w + draw', () => {
    const line = formatEia(eiaRefFor('CRUDEOIL', LIVE_MACRO)!)
    expect(line).toEqual({
      label: 'EIA crude stocks',
      level: '409.7M bbl',
      wow: '−1.69M bbl w/w', // U+2212 typographic minus
      direction: 'draw',
    })
  })

  it('natgas: Bcf level + signed Bcf w/w + build', () => {
    const line = formatEia(eiaRefFor('NATURALGAS', LIVE_MACRO)!)
    expect(line).toEqual({
      label: 'EIA natgas storage',
      level: '3,024 Bcf',
      wow: '+41 Bcf w/w',
      direction: 'build',
    })
  })

  it('a build vs a draw comes straight from the backend wow_direction word', () => {
    const buildCrude = formatEia(
      eiaRefFor('CRUDEOIL', [row('EIA_CRUDE_STOCKS', 410000, 2500, 'build')])!,
    )
    expect(buildCrude.direction).toBe('build')
    expect(buildCrude.wow).toBe('+2.50M bbl w/w')
  })

  it('no wow → level only, no w/w and no direction (fail-closed on the delta)', () => {
    const line = formatEia(eiaRefFor('CRUDEOIL', [row('EIA_CRUDE_STOCKS', 409665)])!)
    expect(line.level).toBe('409.7M bbl')
    expect(line.wow).toBeNull()
    expect(line.direction).toBeNull()
  })
})
