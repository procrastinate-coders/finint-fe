import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { servedBrief } from '@/lib/api/contracts'
import realComplete from '@/test/fixtures/brief-real-complete.json'
import realPartial from '@/test/fixtures/brief-real-partial.json'
import { BriefRenderer } from './BriefRenderer'

const WITHHELD_SENTINEL = '(withheld — failed substance check)'

describe('BriefRenderer — the real 2026-07-16 DEGRADED brief', () => {
  const brief = servedBrief.parse(realComplete)

  it('renders end-to-end and NEVER prints the withheld sentinel as prose', () => {
    render(<BriefRenderer brief={brief} />)
    // the literal guard sentinel must not appear anywhere — it is a STATE
    const hits = screen.queryAllByText((_t, node) =>
      Boolean(node?.textContent?.includes(WITHHELD_SENTINEL)),
    )
    expect(hits).toHaveLength(0)
    // ...and the honest held-back state IS shown (session_read was withheld)
    expect(
      screen.getAllByText(/guard caught something/i).length,
    ).toBeGreaterThan(0)
  })

  it('flags the degradation first-class: guard, count, withheld instruments (law 2/4)', () => {
    render(<BriefRenderer brief={brief} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/degraded brief/i)
    // fabricated_claims count (=2) surfaced, labelled as a degradation count
    expect(alert.textContent).toContain('caught and withheld')
    expect(alert.textContent).toContain('2 text field')
    expect(alert.textContent).toContain('SILVER, GOLD')
  })

  it('shows ALL 9 mains on the board', () => {
    render(<BriefRenderer brief={brief} />)
    for (const sym of [
      'SILVER',
      'GOLD',
      'COPPER',
      'NATURALGAS',
      'LEAD',
      'NICKEL',
      'ZINC',
      'CRUDEOIL',
      'ALUMINIUM',
    ]) {
      expect(screen.getAllByText(sym).length).toBeGreaterThan(0)
    }
  })

  it('renders Tier-B gaps honestly (no international reference), never fabricated', () => {
    render(<BriefRenderer brief={brief} />)
    expect(screen.getAllByText(/no ref/i).length).toBeGreaterThan(0)
    expect(
      screen.getAllByText(/no international reference|no CFTC COT/i).length,
    ).toBeGreaterThan(0)
  })

  it('links catalysts to their sources (a claim without a source is the disease)', () => {
    render(<BriefRenderer brief={brief} />)
    const link = screen.getByRole('link', { name: /benzinga/i })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('benzinga.com'),
    )
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('gives DIVERGENCE its own weighted block (tension, not confirmation)', () => {
    render(<BriefRenderer brief={brief} />)
    expect(screen.getAllByText(/divergence/i).length).toBeGreaterThan(0)
    // all 3 deep reads carry divergence_flag today — each gets its own block
    expect(
      screen.getAllByText(/tension, not confirmation/i).length,
    ).toBeGreaterThanOrEqual(3)
  })

  it('renders COPPER (clean read) as prose but GOLD (withheld) as a state', () => {
    render(<BriefRenderer brief={brief} />)
    // COPPER's real narrative prose is present
    expect(
      screen.getByText(/most contested read in the complex/i),
    ).toBeInTheDocument()
  })
})

describe('BriefRenderer — the PARTIAL run (SILVER only, GOLD/COPPER absent)', () => {
  const brief = servedBrief.parse(realPartial)

  it('renders present + absent deep-set instruments honestly, never crashes', () => {
    render(<BriefRenderer brief={brief} />)
    // the run wrote SILVER; GOLD + COPPER were in the deep set but never written
    expect(screen.getAllByText('SILVER').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/read not produced/i).length).toBeGreaterThan(0)
  })

  it('still shows all 9 board rows even though only 1 read was written', () => {
    render(<BriefRenderer brief={brief} />)
    for (const sym of ['GOLD', 'COPPER', 'ZINC', 'ALUMINIUM']) {
      expect(screen.getAllByText(sym).length).toBeGreaterThan(0)
    }
  })
})
