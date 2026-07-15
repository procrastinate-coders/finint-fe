# CONTEXT.md — Session Handoff

*The living state of the build. Updated at the END of every session; read FIRST at the start of
the next. Never close a session with a stale CONTEXT.*

**Updated:** 2026-07-15 — **FIN-149 Phase 1 LANDED** (auth wired to the LIVE API + app shell).
Read this before starting FIN-160.

---

## WHERE WE ARE

**FIN-149 (auth wire + app shell) is done and PROVEN against the live API** — not just mocks.
Login → shell → hard-reload rehydrate → logout were all driven in a real browser against
`https://apifinint.apextrader.trade`, plus a scripted API proof and the 429 rate-limit path.

**Proven live (2026-07-15, `udit@finint.local`):**
- `POST /auth/login` → tokens ONLY (no user), `token_type` present. Identity comes from `GET /auth/me`.
- `GET /auth/me` → `{id:number, email, is_active, created_at}` (no `name`) — renders in the header.
- `POST /auth/refresh` → new access token, **NOT rotated** (no `refresh_token` in body) — the trap
  the ticket warned about; the contract does not expect one, so no mysterious logout.
- Hard reload rehydrates via `ensureAccessToken` (refresh → me), NO re-login. Access is memory-only.
- `POST /auth/logout` → revokes; the revoked refresh token then 401s; UI bounces to `/login`.
- 429 after 5 failed logins/IP (`retry-after: ~298`) → UI shows "Too many attempts", not the generic line.
- ONE `{detail}` error shape everywhere. CORS/OPTIONS preflight is unauthed + allows `localhost:5173`.
- typecheck + lint + **29 tests** green; build green; **no zodios/axios in the bundle**.

**Contracts are now GENERATED (FFE-004 satisfied; FFE-008 retired).** FIN-159 shipped a real
`openapi.json` with response models. `npm run gen:contracts` builds `contracts/_generated/schemas.ts`
(schemas-only — the zodios/axios client half is stripped) from `../finint/docs/api/openapi.json`.
The hand-authored `provisional/` schemas are **DELETED**. The only hand-authored contract left is
`contracts/error.ts` (the `{detail}` envelope isn't a reusable OpenAPI component). Added `ajv` as a
devDep so openapi-zod-client resolves.

**⚠️ NOT deployed** — the Vercel deploy was deferred this session (user choice). `vercel.json` is
ready; run `vercel --prod` when convenient (default `.vercel.app` domain). **`.env.local`**
(gitignored) currently has `VITE_API_MOCK=0`, so `npm run dev` hits the LIVE API (login required);
set `VITE_API_MOCK=1` to go back to mocks.

**The backend (shipped since the scaffold):**
- `https://apifinint.apextrader.trade` — FastAPI on EC2, **now guarded by FININT's own JWT**
  (FIN-157). The nginx basic auth is GONE. `/openapi.json` now sits behind the JWT (needs a Bearer).
- FIN-157 (own auth) + FIN-156 (`POST /refresh`, `GET /kite/login-url`) + FIN-159 (typed contracts
  + `docs/api/CONTRACT.md` + `samples/`) all landed. **Source of truth for shapes:**
  `../finint/docs/api/` (`CONTRACT.md`, `openapi.json`, `samples/`).

**Data state (backend):** all 9 MCX mains backfilled and current (verified 2026-07-15 against live
prices: GOLD ₹1,47,889 · SILVER ₹2,38,086 · CRUDEOIL ₹7,702 — all matched real MCX within noise).
The readiness gate returns **8 sources** and `can_generate: true`.

---

## WHAT'S NEXT (in order)

1. ~~**FIN-158 — scaffold**~~ ✅ **DONE**.
2. ~~**FIN-149 Phase 1 — auth wire + app shell + pages**~~ ✅ **DONE** (this session). Follow-up:
   run `vercel --prod` to deploy (deferred).
3. **FIN-160 — Readiness screen + Kite refresh modal** ($0, no LLM) ← **START HERE.** The
   highest-value screen: it proves the system is honest and exercises the whole stack for free. Map
   over `readiness.sources` (law 5). The real shape is in `../finint/docs/api/samples/readiness.json`
   (+ the verbatim JSON below). Kite modal: `GET /kite/login-url` → open → `?request_token` →
   `POST /kite/refresh` (the `/kite/callback` route is a placeholder ready to wire).
4. **FIN-161 — Generate + progress.** ⚠️ First real money (~$0.06/run). Real `/generate` response
   carries `started` + `positioning_only` (see `samples/generate_run.json`) — reconcile `GenerateResponse`.
5. **FIN-162 — The brief surface.** ⚠️ Build against the DEGRADED sample too, not just the complete
   fixture — the honest-degradation case is a core law. (Ask the backend which real brief samples exist.)
6. **Cutover:** add `finint.apextrader.trade` to the Vercel project → repoint DNS
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
  CORS bug. Hours lost chasing the wrong thing. ✅ VERIFIED live 2026-07-15: preflight → 200
  unauthed, `Allow-Origin: http://localhost:5173`, `Authorization` in `Allow-Headers`.
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
- **Contracts codegen — RESOLVED (FFE-004 satisfied, FFE-008 retired).** FIN-159 shipped a real
  typed `openapi.json`; `contracts/_generated/schemas.ts` is generated from it and `provisional/` is
  deleted. Re-run `npm run gen:contracts` whenever `../finint/docs/api/openapi.json` changes.
  ⚠️ Two known drifts to reconcile in later phases: real `/generate` carries `started` +
  `positioning_only` (FIN-161), and `KiteRefreshResponse.source` is an object not a string (FIN-160).
- **Not deployed yet.** No `vercel` deploy was run (deferred by choice); `vercel.json` is in place.
