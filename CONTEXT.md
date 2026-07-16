# CONTEXT.md — Session Handoff

*The living state of the build. Updated at the END of every session; read FIRST at the start of
the next. Never close a session with a stale CONTEXT.*

**Updated:** 2026-07-16 — **FIN-172-fe: ONE TAB + the CTA matrix.** `/readiness` now carries a
top-level `brief` STATUS block (`BriefStatus` = exists · date · generated_at · is_complete ·
guard_failed · positioning_only), and the FE drives the CTA off it:
- **complete brief** → **View brief**, NOT Generate (generating re-serves it for $0, so
  "Generate ≈$0.12" would be a false statement — copy says "$0 to open"). Verified live.
- **incomplete brief** (positioning-only / partial) → **BOTH** View brief AND "Re-generate · ≈$0.12"
  (it genuinely re-runs once news returns — FIN-154). The difference is made obvious.
- **no brief** → the original readiness gate + Generate.
The CTA lives in `DecisionBar` (driven by `data.brief`); `onViewBrief` navigates to `/brief/today`.
A degraded brief (`guard_failed`) is FLAGGED on the bar (never hidden). The EVIDENCE (cockpit board
/ macro / news) stays fully reachable — a brief existing doesn't strand Father from the numbers.
**ONE destination**: the home IS the "Morning brief" (route title + header renamed from "Readiness";
the cockpit is its "not yet" state). Sidebar dropped the separate **Brief** tab → now just **Morning
brief · History**. (Components was already removed in a prior change — not re-added despite the
ticket text.) MSW mocks all 3 brief shapes (`readinessBriefCompleteFixture` /
`readinessBriefIncompleteFixture` / base `readinessFixture` exists:false); dev:mock defaults to the
complete → View-brief state. All 3 CTA states unit-tested (`DecisionBar.test.tsx`). **95 tests green.**

**FIN-162 THE BRIEF SURFACE** — THE PRODUCT. The layered brief (market · 9-row scan · deep-set
reads) + history, rendered honestly against the REAL degraded 2026-07-16 brief. PROVEN live for $0.

⚠️ **No `<StrictMode>`** (removed 2026-07-16): its dev-only double-mount aborted every query's
in-flight request on the first cleanup (React Query passes an AbortSignal) → a "canceled" request
per call in dev, which also masked real cancellations while debugging. Our effects are guarded by
module-level once-guards + covered by tests, so the double-invoke check earned less than its noise.
Don't re-add it to "fix" a phantom bug — the cancellations were StrictMode, prod was always clean.
⚠️ **No dev `/dev/components` gallery** (removed 2026-07-16): the route + `design-system/preview/*`
+ all `*.preview.tsx` are gone; the sidebar is Readiness · Brief · History.

**FIN-162 (the brief surface + history) is done and PROVEN against the LIVE API for $0.**
THE PRODUCT — everything else exists to get Father here. One `BriefRenderer` serves today AND any
past date (history is the same surface, different date). Lives in `features/brief/*`.
- ⚠️ **WITHHELD FIELDS RENDER AS A STATE, NOT THE STRING** (the single most product-defining
  decision). When a guard fails closed the backend sets a field's VALUE to the literal
  "(withheld — failed substance check)". `features/brief/sentinel.ts` `isWithheld()` detects it
  (robust to dash variants); `Withheld.tsx` `<Prose>` renders it as a visible held-back STATE
  ("a substance guard caught something here and held it back") — NEVER the raw string in a
  paragraph. Verified: the literal sentinel is absent from the live DOM.
- ⚠️ **The real 2026-07-16 brief is DEGRADED and that is the representative case.** session_read
  AND regime.headline withheld; deep_set = [SILVER, GOLD, COPPER]; SILVER 1 field withheld, GOLD 3
  withheld (what_changed/narrative/why), COPPER clean; meta.guard_failed true, fabricated_claims 2.
  It SUCCEEDED AND IS DEGRADED — the honesty banner (law 2/4) says so up front: guard fired · "N
  text fields caught and withheld (degradation count)" · "reads withheld: SILVER, GOLD".
- **All 9 mains on the board**, ranked by HOW MUCH MOVED (not a recommendation — law 4). Non-deep
  rows show NUMBERS WITH NO NARRATIVE (correct, not empty). Tier-B (ZINC/ALU/LEAD/NICKEL) implied
  open "—" + COT "no ref" BY DESIGN (LME-priced), with a footnote — never fabricated, never hidden.
- **Deep-set cards** (numbers left, prose right — trader layout). OI state surfaced BIG (Father's
  core read). **DIVERGENCE gets its own weighted yellow block** ("tension, not confirmation") — the
  point of the instrument pass, not a flattened field. Every text field withheld-aware.
- **PARTIAL runs render honestly**: a deep_set name absent from `instruments` (the run died
  mid-write) → a "read not produced" placeholder card, never a crash, never a fabricated read.
  Proven live on 2026-07-15 (SILVER present + partly-withheld; GOLD/COPPER read-not-produced).
- **Catalysts LINK to their sources** (benzinga / financialexpress …) — a claim without a
  traceable source is the disease. Backdrop carries PROVENANCE per number. Regime-change flagged.
- **positioning_only** flagged when catalysts is empty (`isPositioningOnly`) — a common, honest read.
- **History**: `/history` (GET /briefs) lists past briefs (degraded badge) → `/brief/$date` (GET
  /brief/{date}) renders the same surface. Sidebar gains **Brief** + **History** nav.
- **DESIGN (redesigned on Father's review — the first pass was a cluttered full-width wall):** now a
  professional research NOTE — a single centered reading column (`max-w-[1160px]`, prose capped at
  ~70ch), one visual anchor per section (no label-soup, no nested cards), and consistent 8pt rhythm.
  INTERACTIONS: a sticky scroll-spy jump-nav (`BriefNav` + `useScrollSpy`, sticks at `top-[84px]`
  under the app header) — Market · Board · <instruments> with withheld dots; clicking a deep-set
  board row smooth-scrolls to that instrument's card; staggered motion-safe entrance (`Reveal`).
  Deep-read cards are a stat RAIL (OI state hero) + a readable prose column; divergence is a
  left-accent callout; the withheld state is ONE clean amber chip (was a box + duplicate chip).
  ⚠️ dev:mock serves the small `briefTodayDegradedFixture` (NOT the real JSON) — importing the
  9-instrument fixture JSON into the browser bundle trips MSW's module interception in dev:mock; the
  real samples are covered by tests + the LIVE API.
- **Screen-matched loading skeletons** (the generic grey-bars loader was replaced): `CockpitSkeleton`
  (readiness — decision bar + rail/board/news+macro grid), `BriefSkeleton` (reading column + lead
  card + board + deep-card silhouettes), `HistorySkeleton` — each mirrors its screen so loading→loaded
  doesn't jump. The old `ScreenLoading` is now unused.
- **History redesigned**: a designed list in a reading column — status-accented cards (orange
  left-rail + ShieldAlert for degraded, green + ShieldCheck for clean), a Degraded/Clean pill, hover
  "Read →", staggered entrance, and a proper empty state.
- **Shared domain util**: `lib/mcx/oi-state.ts` (oiStateInfo / cotMeaning) is now the ONE source of
  truth for OI-state meaning — cockpit + brief both import it (cockpit's `provenance.ts` re-exports).
  **Shared honesty**: `lib/brief/honesty.ts` (summarizeDegradation / isPositioningOnly) — generate
  flow + brief both use it.
- New: `formatUsd` was FIN-161; here `getBrief`/`getBriefs` are typed (ServedBrief / BriefListItem[]),
  `useBrief`/`useBriefs` added, `resolveJsonModule` enabled for the committed real-brief fixtures.
  ⚠️ **No buy/sell language** — grepped clean (OI states like "New longs" are Father's language,
  descriptive, NOT recommendations). **90 tests green**, typecheck + lint + build clean.
- ⚠️ **Branch note:** on `feat/fin-162-brief` off `main` (FIN-161 is on main). Push held.

**FIN-161 (generate flow) is on main.** The Generate button runs the real paid pipeline: confirm
(states the ~$0.11 cost) → 4-step progress (polled) → complete/error/409, with a degraded/
positioning-only brief flagged before handoff. PROVEN live for $0.

**FIN-161 (generate screen + 4-step progress) is done and PROVEN against the LIVE API for $0.**
- `POST /generate` is ASYNC — returns in ~120ms then runs ~3 min in the BACKGROUND. We NEVER block
  on it: the response is either a fresh run (`{run_id, status:"running", positioning_only}`) that we
  poll, or `{status:"already_complete", brief}` served from store ($0). `useGenerateStatus` polls
  `GET /generate/status?run_id` and STOPS the instant it's terminal (`refetchInterval`→false on
  done|error) — no eternal spinner (asserted; FIN-164's `write:running`-after-terminal is guarded by
  `ProgressSteps` rendering state verbatim).
- The flow is a glass modal (`features/readiness/generate/GenerateFlow.tsx`) whose phase is DERIVED
  from the mutation + poll (never stored in an effect, so it can't drift from API truth): **confirm**
  (cost stated before spend — law 1) · **running** (the 4 real steps fetch→scan→news→write with the
  API's live `detail`) · **complete** (flags degraded/positioning-only BEFORE the "View brief"
  handoff) · **error** (NAMES `reason` verbatim + shows the real `cost` — a failed run still spent) ·
  **blocked** (409 hard-critical red, fail-closed with its detail).
- **Degraded is flagged, never hidden (law 2/4).** `summarizeDegradation(brief)` surfaces
  `meta.guard_failed`, `fabricated_claims`, and the per-instrument `ai_read.guard_failed` withheld
  list. Shown on the completion modal AND on `/brief/today`. ⚠️ **Today's real brief (2026-07-16) IS
  degraded**: guard_failed true, **2 fabricated claims caught**, reads withheld for **SILVER + GOLD**,
  session_read itself withheld ("(withheld — failed substance check)"). It SUCCEEDED AND IS
  degraded — both true; the screen says so.
- **The live already_complete response** (captured 2026-07-16): `POST /generate → 200 (119ms)`,
  keys `{status, brief}`, `status:"already_complete"`, NO run_id, `brief.meta.guard_failed:true`,
  `fabricated_claims:2`. Matches the generated `GenerateResponse` exactly.
- `positioning_only`: after FIN-145's news filter this is the COMMON honest case (Tier-B is
  structurally zero-news). Designed with dignity — a real outcome, not a warning. (Today happens to
  have 2 fresh catalysts, so it's NOT positioning-only right now.)
- **"View brief" routes to `/brief/today`** — a MINIMAL FIN-162 STUB (`features/brief/BriefScreen`)
  that surfaces the honesty metrics at the top + session read. The full per-instrument brief screen
  is FIN-162's to build. Landing-routing (brief-exists detection) is FIN-172 — NOT hand-rolled here
  (no 404-vs-200 on `/brief/today`); we read the brief only after a confirmed-complete run.
- New: `formatUsd` (the ONE thing not in ₹ — the LLM cost, 2–4 dp so `$0.1126` shows real
  precision). Generate fixtures + 15 new tests (degraded · ProgressSteps consistency · the full
  flow). **75 tests green**, typecheck + lint + build clean.
- ⚠️ **Branch note:** the ticket said "branch off main", but FIN-161 depends on the cockpit's
  DecisionBar Generate button — on `feat/fin-161-generate` off `main` (which now HAS FIN-160/170/the
  cockpit committed). Push held.

**BENTO COCKPIT (FFE-010) — the readiness home** is the non-scroll evidence cockpit, productionized
against live `/readiness.evidence` (FIN-169), then design-polished (board = per-instrument cards,
collapsible sidebar, legible macro). Built on the FIN-160 spine (preserved).

**Design-polish pass (2026-07-16, on Father's review):**
- **Board is now per-instrument CARDS**, grouped by segment (Bullion / Energy / Base metals), one
  reflowing grid → NEVER a horizontal table-scroll (a hidden sideways-scroll is the UX we killed).
  Each card is info-rich: price + as-of/freshness dot, OI + ΔOI, positioning STATE + the observed
  px/OI move (two neutral arrows — descriptive, not a pick, law 2/8), and the COT crowding marker
  (Tier-B shows "no int'l reference", law 3). Hover still opens the plain-words focus footer. Fits
  a tall desktop without scroll; scrolls vertically only on short/narrow viewports (never sideways).
- **Sidebar collapse** — a persisted manual toggle (`localStorage finint.sidebar_collapsed`, state
  in `AppShell`). Below lg the rail is ALWAYS the 64px icon-rail (mobile has no room to expand);
  at lg+ the toggle decides. ⚠️ The trap fixed here: `pl-[260px]` with no responsive fallback
  squeezed the whole page to ~110px on mobile — the content padding is now `pl-[104px]` by default,
  `lg:pl-[260px]` only when expanded.
- **Macro tile** — even padded cells (no odd empty slot in a hairline-gap grid), readable labels
  (fg-secondary, not the near-invisible tertiary), and each value now carries its source + as-of.
- **Every response field is surfaced** — board (tier, segment, freshness, as-of, OI/ΔOI, oi_state,
  cot_percentile + cot_as_of on hover), macro (source, as-of, carried_forward), news (fetched_at +
  the full window rule on hover), sources (critical→"core", blocks_on_red→"gates generation").

---

## WHERE WE ARE

**The readiness home (`/`) is the Bento Cockpit (FFE-010) — done and PROVEN against LIVE data.**
A single non-scroll (on lg+) command centre: a glass DECISION bar on top (generate / "Refresh Kite
token" / 8-dot verdict strip + count-up), then three flat tiles — SOURCES rail | BOARD (hero) |
NEWS-over-MACRO. It renders the live `/readiness` response including FIN-169's additive `evidence`
block (per-instrument board, macro backdrop, news window). Interactions: hovering a source lights
the evidence tile it PRODUCES ("← from X" + a plain-words provenance/meaning focus footer — "where
the board comes from"); hovering a board row explains its numbers (from Kite, as-of, the OI-state
meaning, the COT crowding). Clicking a refreshable red source acts (Kite → modal, else spine
refresh). Discipline held: `null`→"—", no buy/sell (positioning described never endorsed; colour =
state never a pick), Tier-B COT "—" by design, glass only on the decision bar (tiles are flat
hairline data), registry-driven rail (a 9th source needs no code change). Lives at
`features/readiness/cockpit/*` and consumes ONLY generated contract types (FFE-004):
`ReadinessResponse` + `BoardRow`/`MacroRow`/`NewsEvidence`/`NewsArticleEvidence` — regenerate with
`npm run gen:contracts`. Mobile (< lg): stacks + scrolls, the board scrolls inside its own tile (no
page-level horizontal scroll). **Verified live 2026-07-16:** the cockpit renders today's fresh
board (GOLD ₹1,41,370 NEW SHORTS, ZINC/ALU LONG LIQUIDATION, USD/INR "lagging", 0 fresh news →
"positioning-only"), lineage + provenance footers work on live data, the news window text is
derived from the live threshold. The throwaway brainstorm fixture + `/dev/evidence` preview are
DELETED. **55 tests green**, typecheck + lint + build clean.

**FIN-160 (the readiness spine) is PRESERVED UNDER the cockpit and PROVEN against the live API.**
The `ReadinessScreen` container still owns the data fetch, loading/error (`ScreenState`), the
stale-gated on-land refresh, the `already_running` bounded re-read, the honest `RefreshReport`
(now floated bottom-right so it never disturbs the non-scroll grid), and the Kite modal. Only the
flat "Data sources" `SourceRow` list + standalone "Generate brief" button are GONE — the cockpit's
decision bar + rail supersede them. It still maps over `readiness.sources` (never hardcoded), and
Generate is gated on `can_generate` + `blocked_reason` (inert — a toast — until FIN-161).

- **On-land refresh is STALE-GATED (FFE-006):** fire POST /refresh ONLY if news/comex/usdinr/dxy/cot
  is RED — never on amber, never for macro_continuity/kite/board. A module once-guard survives
  StrictMode and can't loop. ⚠️ Tested: all-amber board → **ZERO** refresh calls (the GNews quota
  test). The refresh report shows the honest per-source truth (a partial NAMES the failed source;
  COT "skipped" reads as success; already_running bounds the wait on `started_at`).
- **Kite modal:** GET /kite/login-url → open → the honest broken-redirect warning (the localhost:8080
  page WON'T load — that's normal; the token is in the address bar) → paste request_token (or the
  whole URL) → POST /kite/refresh → uses the returned kite dot + re-reads readiness. Glass chrome.
- **Two contract corrections — RESOLVED, no backend change:** verified LIVE that
  `KiteRefreshResponse.source` is an OBJECT (a SourceHealthModel, the refreshed kite dot) — the model
  was always correct; the drift was only my FIN-149 MSW fixture (now fixed). And `/readiness` +
  `/kite/refresh` live shapes match the generated schemas exactly (keys + types).
- Proven: live readiness renders (warm board, 7/8, no refresh fired → quota-safe); cold board (mock)
  shows every state — blocked generate, refresh report, 3 CTAs, the Kite modal. **55 tests** green.
  ⚠️ NOT done: the Kite modal's full happy-path token exchange against LIVE needs kite to be RED
  (it's green now) AND a real Zerodha login — that's a Father/Udit step (login-url + the endpoint +
  the honest-failure path ARE live-verified).

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
3. ~~**FIN-160 — Readiness screen + Kite refresh modal**~~ ✅ **DONE** (this session).
4. **FIN-161 — Generate + progress** ← **START HERE.** ⚠️ First real money (~$0.06/run). The
   Generate button already renders + is gated on `can_generate` in the readiness screen — wire its
   onClick to POST /generate → poll GET /generate/status (4 steps; the design's "Generating" state
   is in `docs/designs/FinintBrief.jsx`). ⚠️ Real `/generate` response carries `started` +
   `positioning_only` (see `../finint/docs/api/samples/generate_run_real_*.json`) — reconcile
   `GenerateResponse` (regenerate if the backend types it). Don't block on the POST (it takes minutes).
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
  ⚠️ One known drift left: real `/generate` carries `started` + `positioning_only` (FIN-161). The
  `KiteRefreshResponse.source` "drift" was RESOLVED in FIN-160 — it's an OBJECT by design (verified
  live); the generated model was right, only my old MSW fixture was wrong.
- **Not deployed yet.** No `vercel` deploy was run (deferred by choice); `vercel.json` is in place.
