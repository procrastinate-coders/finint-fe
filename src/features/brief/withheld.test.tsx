import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Prose } from './Withheld'
import { isWithheld } from './sentinel'

describe('isWithheld — the guard sentinel is a STATE, never prose', () => {
  it('detects the exact backend sentinel', () => {
    expect(isWithheld('(withheld — failed substance check)')).toBe(true)
  })

  it('is robust to dash variants + surrounding whitespace', () => {
    expect(isWithheld('  (withheld - failed substance check) ')).toBe(true)
    expect(isWithheld('(withheld – failed substance check)')).toBe(true)
  })

  it('real prose is NOT withheld', () => {
    expect(isWithheld('Risk-off; rupee weak.')).toBe(false)
    expect(
      isWithheld('The disinflationary signal is weighing on silver.'),
    ).toBe(false)
    expect(isWithheld(null)).toBe(false)
    expect(isWithheld(undefined)).toBe(false)
    expect(isWithheld('')).toBe(false)
  })
})

describe('Prose — never prints the literal withheld string', () => {
  it('renders the held-back STATE, not the sentinel', () => {
    render(<Prose value="(withheld — failed substance check)" />)
    // the raw sentinel phrase must NOT appear as prose
    expect(
      screen.queryByText(/failed substance check/i),
    ).not.toBeInTheDocument()
    // our honest state IS shown
    expect(screen.getByText(/guard caught something/i)).toBeInTheDocument()
  })

  it('renders real prose verbatim', () => {
    render(<Prose value="Risk-off; rupee weak." />)
    expect(screen.getByText('Risk-off; rupee weak.')).toBeInTheDocument()
  })

  it('null → the "—" fallback (law 5), never blank', () => {
    render(<Prose value={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
