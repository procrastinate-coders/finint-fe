import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { servedBrief } from '@/lib/api/contracts'
import { BriefRenderer } from './BriefRenderer'

/**
 * FIN-213 — every field the payload now carries must reach the reader. Parsed
 * through the REAL zod and rendered through the REAL component tree (not mocked
 * components) so this catches the FIN-198 failure: a served field nobody renders.
 */
const raw = {
  date: '2026-09-05',
  label: 'Friday, 5 September',
  market_open: '9:00 AM IST',
  generated_at: '2026-09-05T03:30:00Z',
  schema_version: 'v1',
  sources: [
    { key: 'kite', status: 'red', note: 'Token expired — daily login required' },
    {
      key: 'eia',
      status: 'amber',
      note: 'As-of 2026-08-21 — a new EIA release is due (stale) · weakest: EIA_NATGAS_STORAGE',
    },
    { key: 'lme_cotr', status: 'amber', note: 'As-of 2026-08-21 — a new LME COTR is due (stale)' },
    { key: 'macro_continuity', status: 'green', note: 'stored prev is prior-session (consecutive)' },
  ],
  market: {
    session_read: 'A positioning-led morning.',
    regime: { is_new: false, regime_change: false, headline: 'Steady.' },
    backdrop: { usd_inr: null, dxy: null, risk_tone: { value: 'neutral' } },
    catalysts: [],
    cross_instrument: [],
  },
  scan: [
    {
      rank: 1, instrument: 'NATURALGAS', name: 'Natural Gas', tier: 'A',
      implied_open_pct: 1.2, oi_state: 'longs_building', cot_percentile: 0.42,
      cot_confidence: null, total_oi: 34072, oi_change: 1200, atr: 12, atr_avg: 10, factors: {},
    },
    {
      rank: 2, instrument: 'LEAD', name: 'Lead', tier: 'B',
      implied_open_pct: null, oi_state: 'shorts_building', cot_percentile: 0.66,
      cot_confidence: 'correlation to price unverified', total_oi: 763, oi_change: -20,
      atr: null, atr_avg: null, factors: {},
    },
  ],
  instruments: [
    {
      instrument: 'NATURALGAS', name: 'Natural Gas', tier: 'A', data_tier: 'A',
      implied_open: { implied_open_pct: 1.2, intl_change_pct: 0.8, usdinr_change_pct: 0.1 },
      oi_state: 'longs_building', cot_percentile: 0.42, cot_confidence: null,
      atr: 12, atr_avg: 10, total_oi: 34072, oi_change: 1200,
      levels: { support: [270], resistance: [285] }, factors: {},
      eia_context: 'EIA natgas storage 3,024 Bcf, +41 Bcf w/w (build) — as-of 2026-08-21',
      lme_context: null,
      liquid_contract: 'NATURALGAS26SEPFUT', liquid_contract_expiry: '2026-09-25',
      ai_read: {
        what_changed: 'Storage build eased.', narrative: 'The read.',
        positioning: {
          oi_state: 'longs_building', cot_stance_label: 'crowded long',
          cot_percentile: 0.42, cot_confidence: null, divergence_flag: false, divergence_note: null,
        },
        cross_instrument_note: null, watch: 'w', why: 'z', guard_failed: false,
      },
    },
    {
      instrument: 'LEAD', name: 'Lead', tier: 'B', data_tier: 'B',
      implied_open: null, oi_state: 'shorts_building', cot_percentile: 0.66,
      cot_confidence: 'correlation to price unverified',
      atr: null, atr_avg: null, total_oi: 763, oi_change: -20,
      levels: { support: [], resistance: [] }, factors: {},
      lme_context: 'LME LEAD 3M 1,995 USD/t', eia_context: null,
      liquid_contract: 'LEAD26SEPFUT', liquid_contract_expiry: '2026-09-30',
      ai_read: {
        what_changed: 'Shorts built.', narrative: 'The read.',
        positioning: {
          oi_state: 'shorts_building', cot_stance_label: 'building shorts',
          cot_percentile: 0.66, cot_confidence: 'correlation to price unverified',
          divergence_flag: false, divergence_note: null,
        },
        cross_instrument_note: null, watch: 'w', why: 'z', guard_failed: false,
      },
    },
  ],
  meta: { deep_set: ['NATURALGAS', 'LEAD'], guard_failed: false, fabricated_claims: 0 },
}

const brief = servedBrief.parse(raw)
// Scope by the card's anchor id (ins-<sym>) — the symbol also appears in the
// nav + scan, so a text lookup would be ambiguous.
const card = (sym: string): HTMLElement => {
  const el = document.getElementById(`ins-${sym.toLowerCase()}`)
  if (!el) throw new Error(`no card for ${sym}`)
  return el
}

describe('FIN-213 — every served field reaches the reader', () => {
  it('item 1 — NAMES the liquid contract + expiry on each card', () => {
    render(<BriefRenderer brief={brief} />)
    expect(within(card('LEAD')).getByText('LEAD26SEPFUT')).toBeInTheDocument()
    expect(within(card('LEAD')).getByText(/expires/i)).toBeInTheDocument()
    expect(within(card('NATURALGAS')).getByText('NATURALGAS26SEPFUT')).toBeInTheDocument()
  })

  it('item 2 — the cot_confidence caveat is welded to the percentile; verified names carry none', () => {
    render(<BriefRenderer brief={brief} />)
    const lead = within(card('LEAD'))
    expect(lead.getByText('66th')).toBeInTheDocument()
    expect(lead.getByText(/correlation to price unverified/i)).toBeInTheDocument()
    // Tier-A verified (cot_confidence null) shows the percentile with NO caveat
    const gas = within(card('NATURALGAS'))
    expect(gas.getByText('42nd')).toBeInTheDocument()
    expect(gas.queryByText(/correlation to price unverified/i)).not.toBeInTheDocument()
  })

  it('item 3 — OI magnitude reaches the reader (763 vs 34,072) + the signed change', () => {
    render(<BriefRenderer brief={brief} />)
    expect(within(card('LEAD')).getByText(/763 lots/)).toBeInTheDocument()
    expect(within(card('NATURALGAS')).getByText(/34,072 lots/)).toBeInTheDocument()
    // the board's OI column carries the magnitude across all rows too
    expect(screen.getAllByText('34,072').length).toBeGreaterThan(0)
  })

  it('item 6 — ATR shows its own baseline; fail-closed when the series is unavailable', () => {
    render(<BriefRenderer brief={brief} />)
    expect(within(card('NATURALGAS')).getByText(/avg 10/)).toBeInTheDocument()
    // LEAD's atr is null (continuous unavailable) → no fabricated ATR block
    expect(within(card('LEAD')).queryByText(/ATR · daily range/i)).not.toBeInTheDocument()
  })

  it('item 7 — LME context framed as NOT an implied open; EIA as a released fact', () => {
    render(<BriefRenderer brief={brief} />)
    const lead = within(card('LEAD'))
    expect(lead.getByText(/LME LEAD 3M 1,995 USD\/t/)).toBeInTheDocument()
    expect(lead.getByText(/not an implied open/i)).toBeInTheDocument()
    const gas = within(card('NATURALGAS'))
    expect(gas.getByText(/EIA natgas storage/)).toBeInTheDocument()
    expect(gas.getByText(/a fact, not a forecast/i)).toBeInTheDocument()
  })

  it('cot_stance_label (renamed from cot_stance) renders — not a silent blank', () => {
    render(<BriefRenderer brief={brief} />)
    expect(within(card('NATURALGAS')).getByText('crowded long')).toBeInTheDocument()
    expect(within(card('LEAD')).getByText('building shorts')).toBeInTheDocument()
  })

  it('items 4/5 — the full source set renders, verbatim notes, weakest-link name survives', () => {
    render(<BriefRenderer brief={brief} />)
    const sec = document.getElementById('sources')
    expect(sec).not.toBeNull()
    const src = within(sec as HTMLElement)
    // the weakest-link name is preserved untouched in the note
    expect(src.getByText(/weakest: EIA_NATGAS_STORAGE/)).toBeInTheDocument()
    // an unevaluable / low-signal source stays visible (never omitted)
    expect(src.getByText('macro continuity')).toBeInTheDocument()
    expect(src.getByText('lme cotr')).toBeInTheDocument()
  })
})
