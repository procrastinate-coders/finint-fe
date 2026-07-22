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

function renderTile(rows: BoardRow[], macro: MacroRow[] = LME_MACRO) {
  return render(
    <BoardTile rows={rows} macro={macro} hoveredSource={null} delayMs={0} />,
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
