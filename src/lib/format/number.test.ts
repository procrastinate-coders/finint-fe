import { describe, expect, it } from 'vitest'
import {
  DASH,
  formatInr,
  formatNumber,
  formatPct,
  formatSignedNumber,
} from './number'

// The MINUS SIGN (U+2212) — NOT a hyphen-minus. Negatives read as typographic
// minus so a dropped sign is visible (CLAUDE.md §3 formatting rules).
const MINUS = '−'

describe('formatInr — Indian grouping (₹1,47,889), Father reads lakhs', () => {
  it('groups by the Indian system (lakh/crore), not thousands', () => {
    expect(formatInr(147889)).toBe('₹1,47,889')
    expect(formatInr(238086)).toBe('₹2,38,086')
    expect(formatInr(7702)).toBe('₹7,702')
    expect(formatInr(100)).toBe('₹100')
    expect(formatInr(12345678)).toBe('₹1,23,45,678')
  })

  it('renders zero as ₹0, never blank', () => {
    expect(formatInr(0)).toBe('₹0')
  })

  it('uses a typographic minus for negatives', () => {
    expect(formatInr(-506)).toBe(`${MINUS}₹506`)
  })

  it('honours an explicit decimals option', () => {
    expect(formatInr(147889.5, { decimals: 2 })).toBe('₹1,47,889.50')
  })

  it('renders null / undefined / NaN as the em-dash, NEVER 0 (law 1)', () => {
    expect(formatInr(null)).toBe(DASH)
    expect(formatInr(undefined)).toBe(DASH)
    expect(formatInr(Number.NaN)).toBe(DASH)
    expect(DASH).toBe('—')
  })
})

describe('formatPct — explicit sign, never rounded to hide a move', () => {
  it('always shows a sign; default 2dp', () => {
    expect(formatPct(1.638)).toBe('+1.64%')
    expect(formatPct(-0.905)).toBe(`${MINUS}0.91%`)
  })

  it('supports 3dp for implied-open precision (+1.638% / −0.905%)', () => {
    expect(formatPct(1.638, { decimals: 3 })).toBe('+1.638%')
    expect(formatPct(-0.905, { decimals: 3 })).toBe(`${MINUS}0.905%`)
  })

  it('renders a true zero without a sign', () => {
    expect(formatPct(0)).toBe('0.00%')
  })

  it('renders null as the em-dash', () => {
    expect(formatPct(null)).toBe(DASH)
    expect(formatPct(undefined)).toBe(DASH)
  })
})

describe('formatSignedNumber — OI change etc. (oi_change: -506)', () => {
  it('shows an explicit sign and Indian grouping', () => {
    expect(formatSignedNumber(-506)).toBe(`${MINUS}506`)
    expect(formatSignedNumber(1240)).toBe('+1,240')
    expect(formatSignedNumber(1234567)).toBe('+12,34,567')
  })

  it('renders zero without a sign, and null as the em-dash', () => {
    expect(formatSignedNumber(0)).toBe('0')
    expect(formatSignedNumber(null)).toBe(DASH)
  })
})

describe('formatNumber — plain Indian-grouped count', () => {
  it('groups without a currency symbol', () => {
    expect(formatNumber(1240)).toBe('1,240')
    expect(formatNumber(1234567)).toBe('12,34,567')
  })

  it('renders null as the em-dash', () => {
    expect(formatNumber(null)).toBe(DASH)
  })
})
