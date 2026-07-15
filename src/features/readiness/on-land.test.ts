import { afterEach, describe, expect, it } from 'vitest'
import type { ReadinessSource } from '@/lib/api/contracts'
import {
  hasAttemptedOnLandRefresh,
  markOnLandRefreshAttempted,
  resetOnLandRefresh,
  shouldRefreshOnLand,
} from './on-land'

// Minimal source builder — only the fields the rule reads.
function src(
  key: string,
  status: string,
  extra: Partial<ReadinessSource> = {},
): ReadinessSource {
  return {
    key,
    label: key,
    status,
    note: '',
    critical: false,
    human_refreshable: false,
    action: null,
    blocks_on_red: false,
    ...extra,
  }
}

// A board where the ONLY thing wrong is structural amber — the trap: a naive
// "any source not green → refresh" fires on every mount forever and burns the
// GNews quota. macro_continuity is PERMANENTLY amber by design.
const ALL_AMBER: ReadinessSource[] = [
  src('kite', 'amber'),
  src('comex', 'amber'),
  src('usdinr', 'amber'),
  src('dxy', 'amber'),
  src('cot', 'amber'),
  src('macro_continuity', 'amber'),
  src('board', 'amber'),
  src('news', 'amber'),
]

afterEach(() => resetOnLandRefresh())

describe('shouldRefreshOnLand — the GNews quota guard (FFE-006)', () => {
  it('⚠️ all-amber board triggers ZERO refresh (the quota test)', () => {
    expect(shouldRefreshOnLand(ALL_AMBER)).toBe(false)
  })

  it('never fires on amber alone, ever', () => {
    expect(shouldRefreshOnLand([src('news', 'amber')])).toBe(false)
    expect(shouldRefreshOnLand([src('cot', 'amber')])).toBe(false)
  })

  it('fires when a source that refresh_spine FIXES is red', () => {
    for (const key of ['news', 'comex', 'usdinr', 'dxy', 'cot']) {
      expect(shouldRefreshOnLand([src(key, 'red')])).toBe(true)
    }
  })

  it('NEVER fires for macro_continuity (structural FRED lag, non-blocking)', () => {
    expect(shouldRefreshOnLand([src('macro_continuity', 'red')])).toBe(false)
  })

  it('NEVER fires for kite red (needs the manual login modal, not a refresh)', () => {
    expect(shouldRefreshOnLand([src('kite', 'red')])).toBe(false)
  })

  it('NEVER fires for board red (needs a backfill, no FE refresh action)', () => {
    expect(shouldRefreshOnLand([src('board', 'red')])).toBe(false)
  })

  it('fires when a fixable source is red among others that are not', () => {
    const mixed = [
      src('kite', 'red'), // ignored
      src('board', 'red'), // ignored
      src('macro_continuity', 'amber'), // ignored
      src('news', 'red'), // ← the trigger
    ]
    expect(shouldRefreshOnLand(mixed)).toBe(true)
  })

  it('a brand-new source key never triggers auto-refresh (conservative)', () => {
    expect(shouldRefreshOnLand([src('some_new_source', 'red')])).toBe(false)
  })
})

describe('on-land once-guard (survives StrictMode double-mount; no loop)', () => {
  it('records the attempt so a red source cannot re-fire on every mount', () => {
    expect(hasAttemptedOnLandRefresh()).toBe(false)
    markOnLandRefreshAttempted()
    expect(hasAttemptedOnLandRefresh()).toBe(true)
  })

  it('reset clears the guard (used on logout / a fresh session)', () => {
    markOnLandRefreshAttempted()
    resetOnLandRefresh()
    expect(hasAttemptedOnLandRefresh()).toBe(false)
  })
})
