import { describe, expect, it } from 'vitest'
import { render, within } from '@testing-library/react'
import { servedBrief } from '@/lib/api/contracts'
import { BriefRenderer } from './BriefRenderer'

/**
 * FIN-216 — the session-gap fields + the ranking factors reach the reader. Parsed
 * through the REAL zod, mounted through the REAL component tree (the FIN-198
 * guard). A true T-1 comparison stays clean; only the exceptions speak.
 */
const ai = (label: string) => ({
  what_changed: 'x', narrative: 'y',
  positioning: {
    oi_state: 'longs_building', cot_stance_label: label, cot_percentile: 0.4,
    cot_confidence: null, divergence_flag: false, divergence_note: null,
  },
  cross_instrument_note: null, watch: 'w', why: 'z', guard_failed: false,
})

const raw = {
  date: '2026-09-06', label: 'Saturday, 6 September', market_open: '9:00 AM IST',
  generated_at: '2026-09-06T03:30:00Z', schema_version: 'v1',
  sources: [{ key: 'kite', status: 'green', note: 'Fresh' }],
  market: {
    session_read: 'A positioning-led morning.',
    regime: { is_new: false, regime_change: false, headline: 'Steady.' },
    backdrop: { usd_inr: null, dxy: null, risk_tone: { value: 'neutral' } },
    catalysts: [], cross_instrument: [],
  },
  scan: [
    { rank: 1, instrument: 'NATURALGAS', name: 'Natural Gas', tier: 'A', implied_open_pct: 1.2, oi_state: 'longs_building', cot_percentile: 0.42, cot_confidence: null, total_oi: 34072, oi_change: 1200, atr: 12, atr_avg: 10, factors: {} },
    { rank: 2, instrument: 'LEAD', name: 'Lead', tier: 'B', implied_open_pct: null, oi_state: 'shorts_building', cot_percentile: 0.66, cot_confidence: null, total_oi: 763, oi_change: -20, atr: null, atr_avg: null, factors: {} },
  ],
  instruments: [
    {
      instrument: 'NATURALGAS', name: 'Natural Gas', tier: 'A', data_tier: 'A',
      implied_open: { implied_open_pct: 1.2, intl_change_pct: 0.8, usdinr_change_pct: 0.1 },
      oi_state: 'longs_building', cot_percentile: 0.42, cot_confidence: null,
      atr: 12, atr_avg: 10, total_oi: 34072, oi_change: 1200,
      levels: { support: [270], resistance: [285] },
      // an exception on BOTH comparisons
      factors: { gap: 0.9, oi: 0.5, level: 0.3, vol: 0.2, cot: 0.7 },
      oi_gap_sessions: 4, prior_close_sessions: 4,
      lme_context: null, eia_context: null,
      liquid_contract: 'NATURALGAS26SEPFUT', liquid_contract_expiry: '2026-09-25',
      ai_read: ai('crowded long'),
    },
    {
      instrument: 'LEAD', name: 'Lead', tier: 'B', data_tier: 'B',
      implied_open: null, oi_state: 'shorts_building', cot_percentile: 0.66,
      cot_confidence: 'correlation to price unverified',
      atr: null, atr_avg: null, total_oi: 763, oi_change: -20,
      levels: { support: [], resistance: [] },
      // the ZINC-style anomaly: a card earned on OI + vol with NO gap (Tier-B)
      factors: { gap: null, oi: 1.0, level: 0.782, vol: 0.973, cot: 0.5 },
      oi_gap_sessions: 1, prior_close_sessions: null, // a CLEAN T-1 — must stay unmarked
      lme_context: 'LME LEAD 3M 1,995 USD/t', eia_context: null,
      liquid_contract: 'LEAD26SEPFUT', liquid_contract_expiry: '2026-09-30',
      ai_read: ai('building shorts'),
    },
  ],
  meta: { deep_set: ['NATURALGAS', 'LEAD'], guard_failed: false, fabricated_claims: 0 },
}

const brief = servedBrief.parse(raw)
const card = (sym: string): HTMLElement => {
  const el = document.getElementById(`ins-${sym.toLowerCase()}`)
  if (!el) throw new Error(`no card for ${sym}`)
  return el
}

describe('FIN-216 — multi-session comparisons speak; a true T-1 stays clean', () => {
  it('marks the OI comparison as a multi-session net change (not overnight)', () => {
    render(<BriefRenderer brief={brief} />)
    expect(
      within(card('NATURALGAS')).getByText(/over 4 sessions — not overnight/i),
    ).toBeInTheDocument()
  })

  it('marks the implied-open anchor when the prior close is >1 session old', () => {
    render(<BriefRenderer brief={brief} />)
    expect(
      within(card('NATURALGAS')).getByText(/close 4 sessions old — not yesterday/i),
    ).toBeInTheDocument()
  })

  it('a CLEAN T-1 comparison (1 session) is NOT marked — only exceptions speak', () => {
    render(<BriefRenderer brief={brief} />)
    // LEAD's oi_gap is 1 → no "overnight" qualifier; prior_close is null → none either
    expect(
      within(card('LEAD')).queryByText(/not overnight/i),
    ).not.toBeInTheDocument()
    expect(
      within(card('LEAD')).queryByText(/sessions old/i),
    ).not.toBeInTheDocument()
  })

  it('surfaces the ranking basis — raw factor scores', () => {
    render(<BriefRenderer brief={brief} />)
    const gas = within(card('NATURALGAS'))
    expect(gas.getByText('Rank basis')).toBeInTheDocument()
    expect(gas.getByText('gap')).toBeInTheDocument()
    expect(gas.getByText('0.90')).toBeInTheDocument() // gap score
  })

  it('a null factor reads as an explicit absence, never a 0 (the ZINC anomaly)', () => {
    render(<BriefRenderer brief={brief} />)
    const lead = within(card('LEAD'))
    expect(lead.getByText('Rank basis')).toBeInTheDocument()
    // oi earned it (1.00); gap is absent → the gap row shows "—", not "0.00"
    expect(lead.getByText('1.00')).toBeInTheDocument()
    const gapRow = lead.getByText('gap').closest('div')
    expect(gapRow?.textContent).toContain('—')
    expect(lead.queryByText('0.00')).not.toBeInTheDocument()
  })
})
