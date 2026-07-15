/**
 * MSW fixtures — the shapes the FE builds against until FIN-156/157 land.
 *
 * `readinessFixture` is the REAL production /readiness payload, copied verbatim
 * from CONTEXT.md (2026-07-15): 8 sources, real notes, can_generate: true. The
 * FE maps over `sources` — it NEVER hardcodes the list (CLAUDE.md law 5).
 *
 * The /auth/* payloads are PROVISIONAL (FFE-008): FININT's own auth (FIN-157)
 * is not built yet, so this is a designed-not-observed shape. Keep it in sync
 * with contracts/provisional/auth.ts.
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

// --- spine refresh / kite (PROVISIONAL — FIN-156) --------------------------

export const refreshSpineFixture = {
  ok: true,
  refreshed: ['macro', 'cot', 'news', 'token_status'],
  reason: null,
}

export const kiteLoginUrlFixture = {
  url: 'https://kite.zerodha.com/connect/login?v=3&api_key=mock_api_key',
}

export const kiteRefreshFixture = {
  ok: true,
  reason: null,
  source: 'kite',
}
