import { http, HttpResponse } from 'msw'
import {
  kiteLoginUrlFixture,
  kiteRefreshFixture,
  loginFixture,
  meFixture,
  readinessFixture,
  refreshFixture,
  refreshSpineFixture,
} from './fixtures'

// FININT runs on its own host with BARE paths (no /api prefix). Match any
// origin so the same handlers serve dev:mock (against the prod host) and the
// Node test server. Endpoints the backend has NOT built yet (/auth/*, /refresh,
// /kite/login-url) are mocked here too — the FE integrates when FIN-156/157 land.
const H = '*'

// Password sentinel that forces an auth failure, so tests can exercise the
// error path deterministically. Any other non-empty password succeeds, which
// keeps `npm run dev:mock` login frictionless.
const WRONG_PASSWORD = 'wrong-password'

// FININT's error envelope is FastAPI-style: `{ detail: string }`. The auth
// failure is INTENTIONALLY generic — it must not reveal whether the email or
// the password was wrong (task step 8 / backend design).
const invalidCredentials = () =>
  HttpResponse.json({ detail: 'invalid email or password' }, { status: 401 })

export const handlers = [
  // --- auth (FIN-157, real shapes) ----------------------------------------
  http.post(`${H}/auth/login`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      email?: string
      password?: string
    } | null
    const email = body?.email?.trim()
    const password = body?.password
    if (!email || !password || password === WRONG_PASSWORD) {
      return invalidCredentials()
    }
    // Tokens ONLY — no user (the user comes from GET /auth/me).
    return HttpResponse.json(loginFixture)
  }),
  http.post(`${H}/auth/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      refresh_token?: string
    } | null
    if (!body?.refresh_token) {
      return HttpResponse.json(
        { detail: 'invalid or expired refresh token' },
        { status: 401 },
      )
    }
    // A NEW access token only — the refresh token is NOT rotated.
    return HttpResponse.json(refreshFixture)
  }),
  http.post(`${H}/auth/logout`, () => HttpResponse.json({ ok: true })),
  http.get(`${H}/auth/me`, () => HttpResponse.json(meFixture)),

  // --- readiness (LIVE today) ---------------------------------------------
  http.get(`${H}/readiness`, () => HttpResponse.json(readinessFixture)),

  // --- spine refresh + kite (PROVISIONAL — FIN-156) -----------------------
  http.post(`${H}/refresh`, () => HttpResponse.json(refreshSpineFixture)),
  http.get(`${H}/kite/login-url`, () => HttpResponse.json(kiteLoginUrlFixture)),
  http.post(`${H}/kite/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      request_token?: string
    } | null
    // The backend never 500s here — a bad token is an honest {ok:false}.
    if (!body?.request_token) {
      return HttpResponse.json({
        ok: false,
        reason: 'missing request_token',
        source: 'kite',
      })
    }
    return HttpResponse.json(kiteRefreshFixture)
  }),

  // --- generate (LIVE, PAID) ----------------------------------------------
  http.post(`${H}/generate`, () =>
    HttpResponse.json({ run_id: 'mock-run', status: 'queued' }),
  ),
  http.get(`${H}/generate/status`, () =>
    HttpResponse.json({
      run_id: 'mock-run',
      status: 'running',
      step: 2,
      steps: [
        { key: 'scan', label: 'Deterministic scan', status: 'done' },
        { key: 'market', label: 'Market layer', status: 'running' },
        { key: 'instruments', label: 'Per-instrument read', status: 'pending' },
        { key: 'guards', label: 'Substance guards', status: 'pending' },
      ],
    }),
  ),

  // --- brief (PLACEHOLDER — the real shape lands with FIN-149) -------------
  // Minimal stubs so the endpoints resolve. The honesty meta (guard_failed /
  // fabricated_claims) is first-class UI (law 4) and is carried here already.
  http.get(`${H}/brief/today`, () =>
    HttpResponse.json({
      date: '2026-07-15',
      label: 'Today',
      generated_at: '2026-07-15T08:35:00+05:30',
      meta: { guard_failed: false, fabricated_claims: 0 },
    }),
  ),
  http.get(`${H}/brief/:date`, ({ params }) =>
    HttpResponse.json({
      date: String(params.date),
      label: String(params.date),
      generated_at: '2026-07-15T08:35:00+05:30',
      meta: { guard_failed: false, fabricated_claims: 0 },
    }),
  ),
  http.get(`${H}/briefs`, () =>
    HttpResponse.json([
      {
        date: '2026-07-15',
        label: 'Today',
        generated_at: '2026-07-15T08:35:00+05:30',
        guard_failed: false,
      },
    ]),
  ),
]
