import { http, HttpResponse } from 'msw'
import {
  briefTodayDegradedFixture,
  generateRunFixture,
  generateStatusDoneFixture,
  generateStatusRunningFixture,
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

// Poll counter for the stateful generate/status mock (running → done).
let generateStatusPolls = 0

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

  // --- spine refresh + kite (FIN-156, real shapes) ------------------------
  http.post(`${H}/refresh`, () => HttpResponse.json(refreshSpineFixture)),
  http.get(`${H}/kite/login-url`, () => HttpResponse.json(kiteLoginUrlFixture)),
  http.post(`${H}/kite/refresh`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      request_token?: string
    } | null
    // The backend never 500s here — a bad token is an honest {ok:false} whose
    // `source` is still the (red) kite dot OBJECT, not a string.
    if (!body?.request_token) {
      return HttpResponse.json({
        ok: false,
        reason: 'missing request_token',
        source: {
          ...kiteRefreshFixture.source,
          status: 'red',
          note: 'Token expired / absent — daily login required',
        },
      })
    }
    return HttpResponse.json(kiteRefreshFixture)
  }),

  // --- generate (FIN-161; real shapes) ------------------------------------
  // A fresh run that PROGRESSES: the status poll returns `running` for the first
  // few reads, then `done` — so `npm run dev:mock` shows the real 4-step screen
  // advancing, not a frozen frame. POST resets the counter for a repeat run.
  http.post(`${H}/generate`, () => {
    generateStatusPolls = 0
    return HttpResponse.json(generateRunFixture)
  }),
  http.get(`${H}/generate/status`, () => {
    generateStatusPolls += 1
    return HttpResponse.json(
      generateStatusPolls <= 3
        ? generateStatusRunningFixture
        : generateStatusDoneFixture,
    )
  }),

  // --- brief (FIN-161 reads today's for the honesty flags at handoff) ------
  // A real, VALID ServedBrief — degraded (guard_failed, withheld reads) so the
  // law-4 honesty banner is exercised in dev:mock. /brief/:date + /briefs stay
  // minimal (parsed as unknown until FIN-162 wires them).
  http.get(`${H}/brief/today`, () =>
    HttpResponse.json(briefTodayDegradedFixture),
  ),
  http.get(`${H}/brief/:date`, ({ params }) =>
    HttpResponse.json({ ...briefTodayDegradedFixture, date: String(params.date) }),
  ),
  http.get(`${H}/briefs`, () =>
    HttpResponse.json([
      {
        date: '2026-07-16',
        label: 'Thursday, 16 Jul 2026',
        generated_at: '2026-07-16T03:35:00+00:00',
        guard_failed: true,
      },
    ]),
  ),
]
