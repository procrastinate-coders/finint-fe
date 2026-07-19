/**
 * MSW fixtures — real captured shapes (they match the generated contracts +
 * `../finint/docs/api/samples/`). `readinessFixture` is a warm production
 * /readiness payload; the FE maps over `sources` and NEVER hardcodes the list
 * (CLAUDE.md law 5). Variants below cover the states the DoD exercises.
 */

// --- auth (FIN-157, real shapes — captured from the live API) --------------

// GET /auth/me → id is a NUMBER; there is no `name` field.
export const meFixture = {
  id: 1,
  email: 'udit@finint.local',
  is_active: true,
  created_at: '2026-07-15T15:55:58Z',
}

// POST /auth/login → tokens ONLY (no user), with token_type.
export const loginFixture = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: '2026-07-15T16:10:58Z',
  token_type: 'bearer',
}

// POST /auth/refresh → a NEW access token only — the refresh token is NOT rotated.
export const refreshFixture = {
  access_token: 'mock-access-token-refreshed',
  expires_at: '2026-07-15T16:25:58Z',
  token_type: 'bearer',
}

// --- readiness (VERBATIM from CONTEXT.md, 2026-07-15) ----------------------

export const readinessFixture = {
  sources: [
    {
      key: 'kite',
      label: 'Kite (price/OI)',
      status: 'green',
      note: 'Fresh · ~12h left (expires 6 AM IST)',
      critical: true,
      human_refreshable: true,
      action: 'kite_refresh',
      blocks_on_red: false,
    },
    {
      key: 'comex',
      label: 'COMEX (overnight)',
      status: 'green',
      note: 'Fresh · 2h ago',
      critical: true,
      human_refreshable: true,
      action: 'refresh',
      blocks_on_red: false,
    },
    {
      key: 'usdinr',
      label: 'USD/INR',
      status: 'green',
      note: 'Fresh · 17h ago',
      critical: true,
      human_refreshable: true,
      action: 'refresh',
      blocks_on_red: false,
    },
    {
      key: 'dxy',
      label: 'DXY',
      status: 'green',
      note: 'Fresh · 3d ago',
      critical: false,
      human_refreshable: true,
      action: 'refresh',
      blocks_on_red: false,
    },
    {
      key: 'cot',
      label: 'CFTC COT',
      status: 'green',
      note: 'As-of 2026-07-10 — next release Fri',
      critical: false,
      human_refreshable: true,
      action: 'refresh',
      blocks_on_red: false,
    },
    {
      key: 'macro_continuity',
      label: 'Macro prev-continuity',
      status: 'amber',
      note: 'stored prev gapped (COMEX 13d) — overnight leg sourced LIVE, not blocking',
      critical: false,
      human_refreshable: false,
      action: null,
      blocks_on_red: false,
    },
    {
      key: 'board',
      label: 'Board completeness',
      status: 'green',
      note: 'all 9 mains have recent price+OI',
      critical: false,
      human_refreshable: false,
      action: null,
      blocks_on_red: true,
    },
    {
      key: 'news',
      label: 'News (GNews)',
      status: 'green',
      note: '18 stored articles · fetched 16:50 IST',
      critical: true,
      human_refreshable: true,
      action: 'refresh',
      blocks_on_red: false,
    },
  ],
  can_generate: true,
  blocked_reason: null,
  fresh_count: '7/8',
  // FIN-172: default = NO brief yet → the Generate path (existing tests rely on this).
  brief: {
    exists: false,
    date: '2026-07-16',
    generated_at: null,
    is_complete: false,
    guard_failed: false,
    positioning_only: false,
  },
}

// --- readiness variants (for tests) ---------------------------------------

// FIN-172 CTA matrix: a COMPLETE brief exists → "View brief", NOT Generate. And
// it is DEGRADED (guard_failed) — today's real, representative case; must still
// flag, never hide behind a clean CTA.
export const readinessBriefCompleteFixture = {
  ...readinessFixture,
  brief: {
    exists: true,
    date: '2026-07-16',
    generated_at: '2026-07-16T14:04:08Z',
    is_complete: true,
    guard_failed: true,
    positioning_only: false,
  },
}

// FIN-172: an INCOMPLETE brief exists (positioning-only) → BOTH "View brief" AND
// Generate (~$0.12 re-run to improve once news returns).
export const readinessBriefIncompleteFixture = {
  ...readinessFixture,
  brief: {
    exists: true,
    date: '2026-07-16',
    generated_at: '2026-07-16T14:04:08Z',
    is_complete: false,
    guard_failed: false,
    positioning_only: true,
  },
}

// Every source amber AND non-critical — the trap state. macro_continuity is
// structurally amber; a naive "not green → refresh" would fire on every mount. Must
// trigger ZERO refresh (FFE-006). Non-critical is the point: a CRITICAL amber SHOULD
// fire (FIN-170) — that's the readinessCriticalAmberFixture below, not this quota guard.
export const readinessAllAmberFixture = {
  ...readinessFixture,
  sources: readinessFixture.sources.map((s) => ({
    ...s,
    status: 'amber',
    critical: false,
  })),
  can_generate: false,
  blocked_reason: 'Some sources are stale',
  fresh_count: '0/8',
}

// FIN-170: USD/INR amber AND critical — blocks generate AND is refreshable via POST
// /refresh. The 2026-07-16 case that stranded the board with no button, no auto-fix.
// On land this must fire EXACTLY ONE refresh; the row must show a Refresh CTA.
export const readinessCriticalAmberFixture = {
  ...readinessFixture,
  sources: readinessFixture.sources.map((s) =>
    s.key === 'usdinr'
      ? { ...s, status: 'amber', note: 'Stale · 41h ago' }
      : s,
  ),
  can_generate: false,
  blocked_reason: 'USD/INR unavailable — Stale · 41h ago (refresh to generate)',
  fresh_count: '6/8',
}

// The real COLD board (from docs/api/samples/readiness.json): everything red,
// board (blocks_on_red) red → can_generate false + blocked_reason.
export const readinessColdFixture = {
  sources: readinessFixture.sources.map((s) => {
    if (s.key === 'board') {
      // FIN-170: board is NOT refreshable — a stale main needs a price/OI backfill,
      // which POST /refresh does not do. No FE action. A manual /refresh (the only
      // trigger now — FIN-174) covers the RED macro sources (comex/usdinr,
      // action:'refresh'), not board.
      return {
        ...s,
        status: 'red',
        note: 'missing/stale movers: GOLD stale 13d; SILVER stale 13d — needs a price/OI backfill',
        human_refreshable: false,
        action: null,
      }
    }
    if (s.key === 'kite') {
      return {
        ...s,
        status: 'red',
        note: 'Token expired / absent — daily login required',
      }
    }
    return {
      ...s,
      status: s.key === 'macro_continuity' || s.key === 'cot' ? 'amber' : 'red',
    }
  }),
  can_generate: false,
  blocked_reason: 'Kite token expired — refresh to generate',
  fresh_count: '0/8',
}

// --- spine refresh / kite (FIN-156, real shapes) ---------------------------

// POST /refresh → status ∈ refreshed|already_running, guard ∈ redis|in_process.
export const refreshSpineFixture = {
  status: 'refreshed',
  guard: 'in_process',
  report: {
    date: '2026-07-15',
    macro: { ok: true, rows: 17, source: 'MACRO' },
    // "skipped" is SUCCESS — the stored weekly COT is current.
    cot: {
      ok: true,
      action: 'skipped',
      stored_pub: '2026-07-10',
      reason: 'stored weekly is current (no new Friday release)',
    },
    news: {
      ok: true,
      date: '2026-07-15',
      count: 18,
      queries_ok: 3,
      queries_total: 6,
    },
    token: { valid: true, ttl_hours: 9.4 },
  },
}

// A partial refresh — a 200 with ok:false INSIDE the report (comex failed).
export const refreshPartialFixture = {
  status: 'refreshed',
  guard: 'in_process',
  report: {
    date: '2026-07-15',
    macro: { ok: false, error: 'comex fetch timed out' },
    cot: { ok: true, action: 'skipped', stored_pub: '2026-07-10' },
    news: { ok: true, count: 18 },
    token: { valid: false, ttl_hours: -0.0 },
  },
}

// A concurrent refresh already in flight (Redis single-flight guard).
export const refreshAlreadyRunningFixture = {
  status: 'already_running',
  guard: 'redis',
  started_at: '2026-07-15T15:04:11Z',
  report: null,
}

export const kiteLoginUrlFixture = {
  url: 'https://kite.zerodha.com/connect/login?v=3&api_key=mock_api_key',
}

// POST /kite/refresh → {ok, reason?, source} where `source` is the REFRESHED
// kite dot — a full source OBJECT, not a string (verified against api_schemas.py:
// KiteRefreshResponse.source: SourceHealthModel).
export const kiteRefreshFixture = {
  ok: true,
  reason: null,
  source: {
    key: 'kite',
    label: 'Kite (price/OI)',
    status: 'green',
    note: 'Fresh · ~12h left (expires 6 AM IST)',
    critical: true,
    human_refreshable: true,
    action: 'kite_refresh',
    blocks_on_red: false,
  },
}

// --- generate (FIN-161) — real shapes from ../finint/docs/api/samples --------

// POST /generate → a fresh run kicked off in the BACKGROUND (generate_run.json).
export const generateRunFixture = {
  run_id: 'aa967a32a185',
  status: 'running',
  started: true,
  positioning_only: false,
}

// POST /generate → positioning-only run (news yielded nothing overnight — the
// COMMON honest case after FIN-145's freshness filter, not an edge/failure).
export const generateRunPositioningOnlyFixture = {
  run_id: 'bb17c0de0001',
  status: 'running',
  started: true,
  positioning_only: true,
}

// A minimal-but-VALID ServedBrief (matches the generated schema). `guardFailed`
// toggles the degraded case — today's real run: done + brief_ready + guard_failed.
function makeBrief(guardFailed: boolean) {
  return {
    date: '2026-07-16',
    label: 'Thursday, 16 Jul 2026',
    market_open: '09:00 IST',
    generated_at: '2026-07-16T03:35:00+00:00',
    schema_version: 'v1',
    market: {
      session_read: 'Positioning-led; rupee firm.',
      regime: {
        is_new: false,
        regime_change: false,
        headline: 'No regime change overnight.',
        body: null,
      },
      backdrop: {
        usd_inr: { value: 96.15, change_pct: 0.12, note: 'YAHOO_V8' },
        dxy: { value: 120.5, change_pct: -0.05, note: 'ICE DXY' },
        risk_tone: { value: 'mixed', note: 'cross-currents' },
      },
      catalysts: [],
      cross_instrument: [],
    },
    instruments: [
      {
        instrument: 'GOLD',
        name: 'Gold',
        tier: 'A',
        data_tier: 'A',
        implied_open: null,
        oi_state: 'NEW_SHORTS',
        cot_percentile: 0.06,
        atr: 1800,
        levels: { support: [140000], resistance: [148000] },
        factors: { gap: null, oi: 0.5, level: 0.2, vol: 0.1 },
        ai_read: {
          what_changed: 'Flat to open.',
          narrative: 'Crowded short; no fresh catalyst.',
          positioning: null,
          cross_instrument_note: null,
          watch: 'Holds above 140000.',
          why: 'Positioning-led.',
          guard_failed: guardFailed, // GOLD read withheld on the degraded run
        },
      },
    ],
    meta: {
      deep_set: ['GOLD', 'SILVER'],
      guard_failed: guardFailed,
      fabricated_claims: 0,
    },
  }
}

// POST /generate → today's brief already exists → served from store, $0, ZERO
// LLM calls (generate_already_complete.json). Degraded (guard_failed) — the real
// 2026-07-16 case: it SUCCEEDED AND IS DEGRADED; both are true.
export const generateAlreadyCompleteFixture = {
  status: 'already_complete',
  brief: makeBrief(true),
}

export const briefTodayDegradedFixture = makeBrief(true)
export const briefTodayCleanFixture = makeBrief(false)

const genSteps = (writeState: string, writeDetail: string | null) => [
  { key: 'fetch', state: 'done', detail: 'Kite · COMEX · USD/INR · DXY · COT' },
  { key: 'scan', state: 'done', detail: '9 instruments · gap·OI·levels·vol' },
  { key: 'news', state: 'done', detail: '2 items → 2 catalysts' },
  { key: 'write', state: writeState, detail: writeDetail },
]

const genCost = (costUsd: number) => ({
  total_tokens: 17136,
  input_tokens: 12035,
  output_tokens: 5101,
  cost_usd: costUsd,
  ceiling: 250000,
  web_search_calls: 0,
  retries: 0,
  stages: [
    {
      stage: 'pass1_news_read',
      input_tokens: 5000,
      output_tokens: 800,
      web_search_calls: 0,
      retries: 0,
      cost_usd: 0.0229,
    },
    {
      stage: 'instrument.SILVER',
      input_tokens: 5772,
      output_tokens: 3548,
      web_search_calls: 0,
      retries: 0,
      cost_usd: 0.070536,
    },
  ],
})

// GET /generate/status — mid-run: fetch/scan/news done, write RUNNING.
export const generateStatusRunningFixture = {
  run_id: 'aa967a32a185',
  date: '2026-07-16',
  status: 'running',
  steps: [
    { key: 'fetch', state: 'done', detail: 'Kite · COMEX · USD/INR · DXY · COT' },
    { key: 'scan', state: 'done', detail: '9 instruments · gap·OI·levels·vol' },
    { key: 'news', state: 'running', detail: null },
    { key: 'write', state: 'pending', detail: null },
  ],
  brief_ready: false,
  reason: null,
  cost: null,
}

// GET /generate/status — terminal DONE (generate_status.json shape, real cost).
export const generateStatusDoneFixture = {
  run_id: 'aa967a32a185',
  date: '2026-07-16',
  status: 'done',
  steps: genSteps('done', 'session read · backdrop · per-instrument'),
  brief_ready: true,
  reason: null,
  cost: genCost(0.11262),
}

// GET /generate/status — terminal ERROR (generate_status_error.json): a guard
// rejected trade language. brief_ready false, reason NAMED, cost REAL (a failed
// run still spent money — FIN-164).
export const generateStatusErrorFixture = {
  run_id: 'fb4022a999a2',
  date: '2026-07-16',
  status: 'error',
  steps: genSteps('error', null),
  brief_ready: false,
  reason: "instrument brief GOLD contains trade language: ['buy signal']",
  cost: genCost(0.114936),
}
