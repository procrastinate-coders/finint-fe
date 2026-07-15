import { describe, expect, it } from 'vitest'
import { istClock, istDate, istDateTime, istTime, DASH } from './time'

describe('IST time formatting — every operator-facing time is IST', () => {
  it('istTime renders HH:MM in IST regardless of the input offset', () => {
    // 16:50 IST, expressed with the +05:30 offset.
    expect(istTime('2026-07-15T16:50:00+05:30')).toBe('16:50')
    // Same instant expressed in UTC (11:20Z) must still read 16:50 IST.
    expect(istTime('2026-07-15T11:20:00Z')).toBe('16:50')
  })

  it('istClock renders HH:MM:SS in IST for the live header clock', () => {
    expect(istClock(new Date('2026-07-15T11:20:05Z'))).toBe('16:50:05')
  })

  it('istDate renders a short date (COT as-of, brief date)', () => {
    expect(istDate('2026-07-10')).toBe('10 Jul 2026')
  })

  it('istDateTime pairs the date and the time', () => {
    expect(istDateTime('2026-07-15T11:20:00Z')).toBe('15 Jul, 16:50')
  })

  it('renders null / empty / invalid as the em-dash (law 1)', () => {
    expect(istTime(null)).toBe(DASH)
    expect(istTime('')).toBe(DASH)
    expect(istTime('not-a-date')).toBe(DASH)
    expect(istDate(null)).toBe(DASH)
    expect(istDateTime(undefined)).toBe(DASH)
  })
})
