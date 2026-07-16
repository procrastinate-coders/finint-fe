import { afterEach, describe, expect, it } from 'vitest'
import type { ReadinessSource } from '@/lib/api/contracts'
import {
  hasAttemptedOnLandRefresh,
  markOnLandRefreshAttempted,
  resetOnLandRefresh,
  shouldRefreshOnLand,
} from './on-land'

// Minimal source builder — only the fields the rule reads. `action` defaults to null
// (not refreshable); a refreshable source carries action:'refresh' (the backend stamps it
// for exactly what POST /refresh covers — FIN-170).
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

// A board where the only thing wrong is amber, and NOTHING is critical — the trap: a naive
// "any source not green → refresh" fires on every mount forever and burns the GNews quota.
// The refreshable macro/cot/news carry action:'refresh' (realistic), yet must still fire ZERO.
const ALL_AMBER: ReadinessSource[] = [
  src('kite', 'amber', { action: 'kite_refresh' }),
  src('comex', 'amber', { action: 'refresh' }),
  src('usdinr', 'amber', { action: 'refresh' }),
  src('dxy', 'amber', { action: 'refresh' }),
  src('cot', 'amber', { action: 'refresh' }),
  src('macro_continuity', 'amber'),
  src('board', 'amber'),
  src('news', 'amber', { action: 'refresh' }),
]

afterEach(() => resetOnLandRefresh())

describe('shouldRefreshOnLand — refreshable RED or (critical AND not green) (FFE-006 / FIN-170)', () => {
  it('⚠️ all-amber, non-critical → ZERO refresh (the GNews quota guard)', () => {
    expect(shouldRefreshOnLand(ALL_AMBER)).toBe(false)
  })

  it('never fires on a NON-critical amber, refreshable or not — quota protected', () => {
    expect(shouldRefreshOnLand([src('news', 'amber', { action: 'refresh' })])).toBe(false)
    expect(shouldRefreshOnLand([src('cot', 'amber', { action: 'refresh' })])).toBe(false)
  })

  it('fires when a refreshable source is RED', () => {
    for (const key of ['news', 'comex', 'usdinr', 'dxy', 'cot']) {
      expect(shouldRefreshOnLand([src(key, 'red', { action: 'refresh' })])).toBe(true)
    }
  })

  it('⚠️ NOW fires on a CRITICAL AMBER refreshable source (the case that stranded the board 2026-07-16)', () => {
    // usdinr: amber + critical + action:'refresh' — blocked generate, but ONE /refresh fixes it.
    expect(
      shouldRefreshOnLand([src('usdinr', 'amber', { critical: true, action: 'refresh' })]),
    ).toBe(true)
  })

  it('does NOT fire on a critical source that is not refreshable via /refresh (kite → modal)', () => {
    // kite is critical and can be amber/red, but its action is kite_refresh — a refresh won't fix it.
    expect(shouldRefreshOnLand([src('kite', 'amber', { critical: true, action: 'kite_refresh' })])).toBe(false)
    expect(shouldRefreshOnLand([src('kite', 'red', { critical: true, action: 'kite_refresh' })])).toBe(false)
  })

  it('NEVER fires for macro_continuity (structural FRED lag, not refreshable)', () => {
    expect(shouldRefreshOnLand([src('macro_continuity', 'red')])).toBe(false)
    expect(shouldRefreshOnLand([src('macro_continuity', 'amber')])).toBe(false)
  })

  it('NEVER fires for board red (needs a backfill, no refresh action)', () => {
    expect(shouldRefreshOnLand([src('board', 'red')])).toBe(false)
  })

  it('fires on a refreshable red amid non-refreshable reds (kite/board ignored)', () => {
    const mixed = [
      src('kite', 'red', { critical: true, action: 'kite_refresh' }), // ignored (modal)
      src('board', 'red'), // ignored (backfill)
      src('macro_continuity', 'amber'), // ignored
      src('news', 'red', { action: 'refresh' }), // ← the trigger
    ]
    expect(shouldRefreshOnLand(mixed)).toBe(true)
  })

  it('a source with no refresh action never triggers; one the backend marks refreshable does', () => {
    expect(shouldRefreshOnLand([src('some_new_source', 'red')])).toBe(false) // action null
    expect(shouldRefreshOnLand([src('some_new_source', 'red', { action: 'refresh' })])).toBe(true)
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
