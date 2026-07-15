# CONTEXT.md — Session Handoff

*The living state of the build. Updated at the END of every session; read FIRST at the start of
the next. Never close a session with a stale CONTEXT.*

**Updated:** 2026-07-15 — **FIN-158 scaffold LANDED.** Read this before starting FIN-149.

---

## WHERE WE ARE

**The scaffold is built and verified (FIN-158).** `npm run dev` boots on mocks; login → gate →
authed glass shell works end-to-end (verified in a real browser, no console errors); typecheck +
lint + tests (24) all green; `npm run build` succeeds; the layer-boundary lint rule was proven to
fire on a violation.

**What exists now:**
- Tooling: Vite 8 · React 19 · TS 6 · Tailwind v4 · TanStack Router/Query · Zod v4 · Vitest 4 +
  MSW 2 · ESLint 10 flat (layer boundary + FFE-002 number-format guard) · CI (typecheck→lint→test→build).
- The ported skin: `styles/tokens.css` (--apex-*, six-colour lock) + `src/index.css` (@theme + glass/aura)
  + `design-system/` (Glass, motion, monochrome FININT brand — FFE-009, preview gallery).
- `lib/format/` — THE formatter (₹1,47,889 Indian grouping, +1.638%/−0.905%, IST, null → "—").
- `lib/auth/session.ts` (memory access + `finint.refresh_token`) + `lib/api/client.ts`
  (**single-flight refresh**, tested) + `endpoints.ts` + provisional contracts.
- Login (email, generic error) + `_authenticated` gate + `/kite/callback` placeholder + Brief empty shell.
- MSW for every endpoint (readiness fixture = CONTEXT verbatim, 8 sources, `can_generate: true`).
- `vercel.json` SPA rewrite · `.env.example` · codegen script (`npm run gen:contracts`).

**Two decisions recorded this session:** FFE-008 (provisional hand-authored contracts until the
backend declares `response_model=`; codegen is wired but currently generates empty schemas) and
FFE-009 (monochrome wordmark-derived brand, no invented pictorial mark).

**⚠️ Mocks are ON by default in `npm run dev`** (set `VITE_API_MOCK=0` to hit the live backend).

**The backend is live and ahead of us:**
- `https://apifinint.apextrader.trade` — FastAPI on EC2, HTTPS (Let's Encrypt), **currently
  behind nginx basic auth** (user `naveen`). Basic auth comes off when FIN-157 (FININT's own JWT)
  ships — they cannot coexist, both use the `Authorization` header.
- Live contract: `https://apifinint.apextrader.trade/openapi.json` · Swagger at `/docs`
- **7 endpoints exist today:** `/readiness`, `/brief/today`, `/brief/{date}`, `/briefs`,
  `POST /kite/refresh`, `POST /generate`, `GET /generate/status`
- **NOT yet built (in flight):**
  - **FIN-156** — `POST /refresh` + `GET /kite/login-url` (+ concurrency guard) ← the FE blocker
  - **FIN-157** — FININT's own auth: users table, `/auth/login|refresh|logout|me`, JWT middleware, CORS

**⇒ Build against MSW mocks.** The FE does NOT wait on the backend. `VITE_API_MOCK=1` and mock
every endpoint including the ones that don't exist yet. Integrate when 156/157 land.

**Data state (backend):** all 9 MCX mains backfilled and current (verified 2026-07-15 against live
prices: GOLD ₹1,47,889 · SILVER ₹2,38,086 · CRUDEOIL ₹7,702 — all matched real MCX within noise).
The readiness gate returns **8 sources** and `can_generate: true`.

---

## WHAT'S NEXT (in order)

1. ~~**FIN-158 — scaffold**~~ ✅ **DONE** (this session). Only remaining follow-up: deploy to
   Vercel on the default `.vercel.app` domain (not done here — no deploy step run yet). And re-run
   `npm run gen:contracts` + flip the contracts barrel off `provisional/` the moment the backend
   declares `response_model=` (FFE-008).
2. **FIN-149 Phase 1 — Readiness screen** ($0, no LLM) ← **START HERE.** The highest-value screen: it proves the
   system is honest and exercises the whole stack for free.
3. **FIN-149 Phase 2 — Kite refresh modal.**
4. **FIN-149 Phase 3 — Generate + progress.** ⚠️ First real money (~$0.06/run).
5. **FIN-149 Phase 4 — The brief surface.**
6. **FIN-149 Phase 5 — History.**
7. **Cutover:** add `finint.apextrader.trade` to the Vercel project → repoint DNS
   (A→EC2 becomes CNAME→Vercel) → **then** flip the Kite redirect URL (LAST — one-way).

---

## THE REAL PRODUCTION SHAPE (code against this, not a guess)

`GET /readiness` — 2026-07-15, verbatim:
```json
{"sources":[
  {"key":"kite","label":"Kite (price/OI)","status":"green","note":"Fresh · ~12h left (expires 6 AM IST)","critical":true,"human_refreshable":true,"action":"kite_refresh","blocks_on_red":false},
  {"key":"comex","label":"COMEX (overnight)","status":"green","note":"Fresh · 2h ago","critical":true,"human_refreshable":false,"action":null,"blocks_on_red":false},
  {"key":"usdinr","label":"USD/INR","status":"green","note":"Fresh · 17h ago","critical":true,"human_refreshable":false,"action":null,"blocks_on_red":false},
  {"key":"dxy","label":"DXY","status":"green","note":"Fresh · 3d ago","critical":false,"human_refreshable":false,"action":null,"blocks_on_red":false},
  {"key":"cot","label":"CFTC COT","status":"green","note":"As-of 2026-07-10 — next release Fri","critical":false,"human_refreshable":false,"action":null,"blocks_on_red":false},
  {"key":"macro_continuity","label":"Macro prev-continuity","status":"amber","note":"stored prev gapped (COMEX 13d) — overnight leg sourced LIVE, not blocking","critical":false,"human_refreshable":false,"action":null,"blocks_on_red":false},
  {"key":"board","label":"Board completeness","status":"green","note":"all 9 mains have recent price+OI","critical":false,"human_refreshable":false,"action":null,"blocks_on_red":true},
  {"key":"news","label":"News (GNews)","status":"green","note":"18 stored articles · fetched 16:50 IST","critical":true,"human_refreshable":true,"action":"news_refresh","blocks_on_red":false}
],"can_generate":true,"blocked_reason":null,"fresh_count":"7/8"}
```

**Map over the array. Never hardcode the list.** It went 6 → 8 in two weeks and will grow again.
A hardcoded list is exactly how a GOLD-only board once passed as "ready" (the bug that FIN-153
fixed on 2026-07-15).

---

## KNOWN TRAPS (paid for in real hours — do not rediscover)

- **`vercel.json` SPA rewrite** or every deep link 404s, `/kite/callback` included. Silent failure.
- **Single-flight refresh** — two clients / two concurrent 401s → two `POST /auth/refresh` →
  clobbered tokens. One owner of the refresh promise. Non-negotiable.
- **OPTIONS preflight must not require auth** (backend, FIN-157) — browsers don't send
  `Authorization` on preflight. If it 401s, every cross-origin call fails and it LOOKS like a
  CORS bug. Hours lost chasing the wrong thing.
- **On-land refresh must be stale-gated** — GNews is 100/day, ~6 per refresh. StrictMode
  double-mounts. See FFE-006.
- **`/generate` takes minutes** (LLM calls). nginx `proxy_read_timeout` is already 300s. The FE
  must not assume a fast response — poll `/generate/status`, don't block on the POST.
- **Tier-B `implied_open: null` is CORRECT** (ZINC/ALUMINIUM/LEAD/NICKEL are LME-priced, no
  international reference). Render the gap. Not an error. Not a zero.
- **Kite redirect URL is `http://localhost:8080` today** and `scripts/generate_kite_token.py`
  depends on it. Kite allows ONE redirect URL. Changing it to `/kite/callback` breaks the CLI
  escape hatch — one-way door, do it LAST.

---

## OPEN QUESTIONS

- **Repo name confirmed:** `finint-fe`.
- **Vercel public shell** — anyone with the URL loads the app (no data without a token). Accepted
  as-is; revisit if it ever matters. (FFE-005 note.)
- **Design port scope — RESOLVED.** Ported: tokens + Glass material + motion + monochrome brand
  (FFE-009) + preview gallery. NOT ported (not needed yet): CommandPalette, TanStack Table, the
  data primitives beyond Skeleton/IstClock — those arrive with FIN-149's screens.
- **Contracts codegen — BLOCKED on the backend (FFE-008).** `npm run gen:contracts` is wired but
  the spec has no `response_model=` and no `/auth/*` yet, so it generates nothing usable. The app
  runs on hand-authored `provisional/*` schemas until FIN-156/157 type their responses. The `/auth`
  and spine/kite/generate provisional shapes are DESIGNED, not observed — expect a Zod-boundary
  mismatch (the intended failure) when the real backend lands, and reconcile then.
- **Not deployed yet.** No `vercel` deploy was run this session; `vercel.json` is in place for when it is.
