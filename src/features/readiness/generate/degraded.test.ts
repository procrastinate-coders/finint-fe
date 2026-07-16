import { describe, expect, it } from 'vitest'
import { servedBrief } from '@/lib/api/contracts'
import {
  briefTodayCleanFixture,
  briefTodayDegradedFixture,
} from '@/test/mocks/fixtures'
import { summarizeDegradation } from './degraded'

describe('summarizeDegradation — surface the honesty metrics (law 4)', () => {
  it('flags a degraded brief: guard_failed true + names the withheld instrument', () => {
    const brief = servedBrief.parse(briefTodayDegradedFixture)
    const s = summarizeDegradation(brief)
    expect(s.degraded).toBe(true)
    expect(s.guardFailed).toBe(true)
    expect(s.withheldInstruments).toContain('GOLD')
  })

  it('a clean brief is NOT degraded', () => {
    const brief = servedBrief.parse(briefTodayCleanFixture)
    const s = summarizeDegradation(brief)
    expect(s.degraded).toBe(false)
    expect(s.guardFailed).toBe(false)
    expect(s.withheldInstruments).toHaveLength(0)
  })

  it('fabricated_claims > 0 alone marks degraded — never hide a fabrication', () => {
    const brief = servedBrief.parse({
      ...briefTodayCleanFixture,
      meta: { ...briefTodayCleanFixture.meta, fabricated_claims: 2 },
    })
    const s = summarizeDegradation(brief)
    expect(s.degraded).toBe(true)
    expect(s.fabricatedClaims).toBe(2)
  })
})
