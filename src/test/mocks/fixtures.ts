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
      human_refreshable: false,
      action: null,
      blocks_on_red: false,
    },
    {
      key: 'usdinr',
      label: 'USD/INR',
      status: 'green',
      note: 'Fresh · 17h ago',
      critical: true,
      human_refreshable: false,
      action: null,
      blocks_on_red: false,
    },
    {
      key: 'dxy',
      label: 'DXY',
      status: 'green',
      note: 'Fresh · 3d ago',
      critical: false,
      human_refreshable: false,
      action: null,
      blocks_on_red: false,
    },
    {
      key: 'cot',
      label: 'CFTC COT',
      status: 'green',
      note: 'As-of 2026-07-10 — next release Fri',
      critical: false,
      human_refreshable: false,
      action: null,
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
      action: 'news_refresh',
      blocks_on_red: false,
    },
  ],
  can_generate: true,
  blocked_reason: null,
  fresh_count: '7/8',
}

// --- readiness variants (for tests) ---------------------------------------

// Every source amber — the trap state. macro_continuity is structurally amber;
// a naive "not green → refresh" would fire on every mount. Must trigger ZERO
// refresh (FFE-006).
export const readinessAllAmberFixture = {
  ...readinessFixture,
  sources: readinessFixture.sources.map((s) => ({ ...s, status: 'amber' })),
  can_generate: false,
  blocked_reason: 'Some sources are stale',
  fresh_count: '0/8',
}

// The real COLD board (from docs/api/samples/readiness.json): everything red,
// board (blocks_on_red) red → can_generate false + blocked_reason.
export const readinessColdFixture = {
  sources: readinessFixture.sources.map((s) => {
    if (s.key === 'board') {
      return {
        ...s,
        status: 'red',
        note: 'missing/stale movers: GOLD stale 13d; SILVER stale 13d — refresh',
        human_refreshable: true,
        action: 'refresh',
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
