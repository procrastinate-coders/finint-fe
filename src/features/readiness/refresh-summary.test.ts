import { describe, expect, it } from 'vitest'
import type { RefreshSpineResponse } from '@/lib/api/contracts'
import { summarizeRefresh } from './refresh-summary'

const full = (
  over: Partial<RefreshSpineResponse['report'] & object> = {},
): RefreshSpineResponse => ({
  status: 'refreshed',
  guard: 'redis',
  report: {
    date: '2026-07-15',
    macro: { ok: true, rows: 17 },
    cot: { ok: true, action: 'refetched' },
    news: { ok: true, count: 18 },
    board: { ok: true, advanced: 9 },
    lme: { ok: true, stored: 5, as_of: '2026-07-15', usdinr: 96.47 },
    token: { valid: true, ttl_hours: 9.4 },
    ...over,
  },
})

describe('summarizeRefresh — honest per-source truth (never a generic failure)', () => {
  it('a clean refresh reports every source as ok', () => {
    const s = summarizeRefresh(full())
    expect(s.anyFailed).toBe(false)
    expect(s.lines.map((l) => l.ok)).toEqual([true, true, true, true])
  })

  it('⚠️ a PARTIAL refresh names the failed source, not a generic failure', () => {
    const s = summarizeRefresh(
      full({ macro: { ok: false, error: 'comex fetch timed out' } }),
    )
    expect(s.anyFailed).toBe(true)
    const macro = s.lines.find((l) => l.key === 'macro')!
    expect(macro.ok).toBe(false)
    expect(macro.detail).toContain('comex fetch timed out')
    // the other sources still report their honest success
    expect(s.lines.find((l) => l.key === 'news')!.ok).toBe(true)
  })

  it('COT "skipped" is SUCCESS (weekly cadence), never a failure', () => {
    const s = summarizeRefresh(
      full({ cot: { ok: true, action: 'skipped', stored_pub: '2026-07-10' } }),
    )
    const cot = s.lines.find((l) => l.key === 'cot')!
    expect(cot.ok).toBe(true)
    expect(cot.detail).toMatch(/current/i)
    expect(s.anyFailed).toBe(false)
  })

  it('an invalid token is a STATUS (→ modal), not a partial refresh failure', () => {
    const s = summarizeRefresh(
      full({ token: { valid: false, ttl_hours: -0.0 } }),
    )
    expect(s.tokenInvalid).toBe(true)
    expect(s.anyFailed).toBe(false) // token invalid does NOT make it a partial
    expect(s.lines.find((l) => l.key === 'token')!.detail).toMatch(/login/i)
  })

  it('already_running carries started_at and no report', () => {
    const s = summarizeRefresh({
      status: 'already_running',
      guard: 'redis',
      started_at: '2026-07-15T15:04:11Z',
      report: null,
    })
    expect(s.alreadyRunning).toBe(true)
    expect(s.startedAt).toBe('2026-07-15T15:04:11Z')
    expect(s.lines).toHaveLength(0)
  })
})
