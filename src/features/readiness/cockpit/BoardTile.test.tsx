import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { BoardRow, MacroRow } from '@/lib/api/contracts'
import { BoardTile } from './BoardTile'

// Minimal board row builder — only the fields the card reads.
function boardRow(over: Partial<BoardRow> = {}): BoardRow {
  return {
    instrument_id: 'ZINC',
    segment: 'base_metals',
    data_tier: 'B',
    contract: 'ZINC26AUG',
    close: 377.0,
    as_of: '2026-07-22',
    oi: 3456,
    oi_change: 120,
    oi_state: 'longs_building',
    cot_percentile: null,
    cot_as_of: null,
    is_fresh: true,
    age_days: 0,
    ...over,
  }
}
function macroRow(indicator: string, value: number | null): MacroRow {
  return { indicator, value, source: 'METALS_DEV', as_of: '2026-07-22', carried_forward: false }
}

// The live LME macro block (confirmed 2026-07-22 from evidence.macro).
const LME_MACRO: MacroRow[] = [
  macroRow('LME_COPPER_3M', 13836.0),
  macroRow('LME_ZINC_3M', 3566.0),
  macroRow('LME_ALUMINIUM_3M', 3170.5),
  macroRow('LME_LEAD_3M', 1888.5),
  macroRow('LME_NICKEL_3M', 17160.0),
  macroRow('USDINR', 96.47),
]

function renderTile(
  rows: BoardRow[],
  macro: MacroRow[] = LME_MACRO,
  hoveredSource: string | null = null,
) {
  return render(
    <BoardTile
      rows={rows}
      macro={macro}
      hoveredSource={hoveredSource}
      delayMs={0}
    />,
  )
}

// The card for an instrument = the <button> whose accessible name starts with the id.
function cardFor(instrumentId: string): HTMLElement {
  const heading = screen.getByText(instrumentId)
  const card = heading.closest('button')
  if (!card) throw new Error(`no card for ${instrumentId}`)
  return card
}

describe('BoardTile — LME 3M reference tied to each base-metal card (FIN-142)', () => {
  it('renders the "LME 3M" line with the level tied to that instrument (ZINC → 3,566)', () => {
    renderTile([boardRow({ instrument_id: 'ZINC' })])
    const card = cardFor('ZINC')
    expect(within(card).getByText('LME 3M')).toBeInTheDocument()
    expect(within(card).getByText(/3,566/)).toBeInTheDocument()
    expect(within(card).getByText('USD/t')).toBeInTheDocument()
  })

  it('COPPER shows LME_COPPER_3M (13,836), NOT zinc’s value — per-metal mapping', () => {
    renderTile([
      boardRow({ instrument_id: 'COPPER', data_tier: 'A', cot_percentile: 0.81 }),
      boardRow({ instrument_id: 'ZINC', data_tier: 'B' }),
    ])
    const copper = cardFor('COPPER')
    expect(within(copper).getByText(/13,836/)).toBeInTheDocument()
    // copper's card must NOT show zinc's level
    expect(within(copper).queryByText(/3,566/)).not.toBeInTheDocument()
    // and each metal carries its own
    expect(within(cardFor('ZINC')).getByText(/3,566/)).toBeInTheDocument()
  })

  it('a base metal with NO LME value does NOT fabricate a line (fail-closed)', () => {
    // LEAD present as a board card, but its LME row is missing from macro.
    const noLead = LME_MACRO.filter((m) => m.indicator !== 'LME_LEAD_3M')
    renderTile([boardRow({ instrument_id: 'LEAD' })], noLead)
    const card = cardFor('LEAD')
    expect(within(card).queryByText('LME 3M')).not.toBeInTheDocument()
    expect(within(card).queryByText('USD/t')).not.toBeInTheDocument()
    // it renders as today — the honest COT "no int'l reference" line stays
    expect(within(card).getByText(/no int'l reference/i)).toBeInTheDocument()
  })

  it('hovering the LME source LIGHTS each metal’s LME line (lineage, like other sources)', () => {
    const lmeRow = (id: string) =>
      within(cardFor(id)).getByText('LME 3M').closest('div') as HTMLElement

    // not hovered → no highlight
    const { unmount } = renderTile([boardRow({ instrument_id: 'ZINC' })], LME_MACRO, null)
    expect(lmeRow('ZINC').className).not.toContain('bg-apex-blue-tint')
    unmount()

    // hovering the `lme` source → the LME line lights up
    renderTile([boardRow({ instrument_id: 'ZINC' })], LME_MACRO, 'lme')
    expect(lmeRow('ZINC').className).toContain('bg-apex-blue-tint')
  })

  it('presents the LME line as a reference LEVEL, never an implied-open % or a signed move', () => {
    renderTile([boardRow({ instrument_id: 'ALUMINIUM' })])
    const card = cardFor('ALUMINIUM')
    // the half-value is kept, never rounded away
    expect(within(card).getByText(/3,170\.5/)).toBeInTheDocument()
    // Scope the assertion to the LME line itself (the card's Δ OI legitimately
    // carries a sign): the LME reference must have NO % and NO +/− — it is a
    // level, not an implied-open move.
    const lmeRow = within(card).getByText('LME 3M').closest('div') as HTMLElement
    expect(lmeRow.textContent).toMatch(/3,170\.5\s*USD\/t/)
    expect(lmeRow.textContent).not.toMatch(/%/)
    expect(lmeRow.textContent).not.toMatch(/[+−]/)
  })
})

// --- FIN-188: EIA inventory line on the energy cards -----------------------

function energyRow(over: Partial<BoardRow> = {}): BoardRow {
  return boardRow({
    instrument_id: 'CRUDEOIL',
    segment: 'energy',
    data_tier: 'A',
    contract: 'CRUDEOIL26AUG',
    close: 8237.0,
    oi_state: 'shorts_covering',
    cot_percentile: 0.42,
    ...over,
  })
}
function eiaRow(
  indicator: string,
  value: number | null,
  wow: number | null = null,
  wow_direction: string | null = null,
): MacroRow {
  return { indicator, value, wow, wow_direction, source: 'EIA', as_of: '2026-07-10', carried_forward: false }
}
// Live EIA block (confirmed 2026-07-22).
const EIA_MACRO: MacroRow[] = [
  eiaRow('EIA_CRUDE_STOCKS', 409665, -1692, 'draw'),
  eiaRow('EIA_NATGAS_STORAGE', 3024, 41, 'build'),
]

describe('BoardTile — EIA inventory line tied to the energy cards (FIN-188)', () => {
  it('CRUDEOIL renders the crude line (level + WoW + draw); NATURALGAS renders natgas', () => {
    renderTile(
      [
        energyRow({ instrument_id: 'CRUDEOIL' }),
        energyRow({ instrument_id: 'NATURALGAS', contract: 'NATURALGAS26AUG' }),
      ],
      EIA_MACRO,
    )
    const crude = cardFor('CRUDEOIL')
    expect(within(crude).getByText('EIA crude stocks')).toBeInTheDocument()
    expect(within(crude).getByText(/409\.7M bbl/)).toBeInTheDocument()
    expect(within(crude).getByText(/−1\.69M bbl w\/w/)).toBeInTheDocument()
    expect(within(crude).getByText('draw')).toBeInTheDocument()

    const gas = cardFor('NATURALGAS')
    expect(within(gas).getByText('EIA natgas storage')).toBeInTheDocument()
    expect(within(gas).getByText(/3,024 Bcf/)).toBeInTheDocument()
    expect(within(gas).getByText(/\+41 Bcf w\/w/)).toBeInTheDocument()
    expect(within(gas).getByText('build')).toBeInTheDocument()
  })

  it('the mapping is per-instrument — CRUDEOIL shows crude stocks, never natgas storage', () => {
    renderTile(
      [
        energyRow({ instrument_id: 'CRUDEOIL' }),
        energyRow({ instrument_id: 'NATURALGAS', contract: 'NATURALGAS26AUG' }),
      ],
      EIA_MACRO,
    )
    const crude = cardFor('CRUDEOIL')
    expect(within(crude).queryByText('EIA natgas storage')).not.toBeInTheDocument()
    expect(within(crude).queryByText(/3,024 Bcf/)).not.toBeInTheDocument()
  })

  it('draw vs build is taken from the backend wow_direction word', () => {
    // same crude card, but a BUILD this week
    renderTile(
      [energyRow({ instrument_id: 'CRUDEOIL' })],
      [eiaRow('EIA_CRUDE_STOCKS', 411357, 1692, 'build')],
    )
    const crude = cardFor('CRUDEOIL')
    expect(within(crude).getByText('build')).toBeInTheDocument()
    expect(within(crude).queryByText('draw')).not.toBeInTheDocument()
    expect(within(crude).getByText(/\+1\.69M bbl w\/w/)).toBeInTheDocument()
  })

  it('no EIA row for the instrument → NO line fabricated (fail-closed)', () => {
    // crude present as a card, but its EIA row is missing from macro.
    renderTile(
      [energyRow({ instrument_id: 'CRUDEOIL' })],
      [eiaRow('EIA_NATGAS_STORAGE', 3024, 41, 'build')],
    )
    const crude = cardFor('CRUDEOIL')
    expect(within(crude).queryByText('EIA crude stocks')).not.toBeInTheDocument()
    expect(within(crude).queryByText(/M bbl/)).not.toBeInTheDocument()
  })

  it('ONLY CRUDEOIL/NATURALGAS get the EIA line — other cards are unaffected', () => {
    // a base metal + gold rendered alongside; neither gets an EIA line.
    renderTile(
      [
        energyRow({ instrument_id: 'CRUDEOIL' }),
        boardRow({ instrument_id: 'GOLD', segment: 'bullion', data_tier: 'A', cot_percentile: 0.7 }),
      ],
      EIA_MACRO,
    )
    expect(
      within(cardFor('CRUDEOIL')).getByText('EIA crude stocks'),
    ).toBeInTheDocument()
    expect(
      within(cardFor('GOLD')).queryByText(/EIA/),
    ).not.toBeInTheDocument()
  })

  it('hovering the EIA source LIGHTS the inventory line (lineage, like other sources)', () => {
    const eiaLineRow = () =>
      within(cardFor('CRUDEOIL'))
        .getByText('EIA crude stocks')
        .closest('div')?.parentElement as HTMLElement

    const { unmount } = renderTile(
      [energyRow({ instrument_id: 'CRUDEOIL' })],
      EIA_MACRO,
      null,
    )
    expect(eiaLineRow().className).not.toContain('bg-apex-blue-tint')
    unmount()

    renderTile([energyRow({ instrument_id: 'CRUDEOIL' })], EIA_MACRO, 'eia')
    expect(eiaLineRow().className).toContain('bg-apex-blue-tint')
  })
})
