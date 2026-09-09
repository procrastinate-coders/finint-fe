# CONTEXT.md — Session Handoff

*The living state of the build. Updated at the END of every session; read FIRST at the start of
the next. Never close a session with a stale CONTEXT.*

---

## 🔑 HOUSE RULE — ABSENT IS NOT ZERO. Read this before rendering any count.

**A field that is missing and a field that is present and zero are DIFFERENT FACTS. Render them
differently, always.** Zero says "we measured, and it was none." Absent says "we do not know."
Showing absent as zero fabricates a measurement — law 1 in the one disguise that keeps getting past
review, because the code looks correct and the screen looks finished.

This has bitten **three times in one feature**, each time by a different mechanism:

1. **Zod `.default([])`** — the generated contract defaults `guard.decisions` to `[]`, so "not served"
   and "genuinely empty" parse identically. Recovered by reading the run's separate `lines` count: a
   count with no decisions is the log not being served; a zero count is a run that logged nothing.
2. **A sibling field as the discriminator** — `guard.lines` is what made (1) recoverable at all. When
   a contract cannot express absence, look for the neighbouring field that can.
3. **A reader defaulting `None` to `0`** — a guard log written before `claims` existed had no key, and
   the count defaulted to zero. "1 denied (0 claims)" said the denial rested on nothing. The backend
   now returns `None` and counts `unrecorded_claims` separately; the panel says "claim counts not
   recorded" and never "(0 claims)".

**How to apply it:**
- Never `?? 0`, `|| 0`, or `.length` on a possibly-absent collection to produce a number a user reads.
- When the schema cannot distinguish the two (`.default([])`, `.default({})`), find the sibling that
  can — a count, a hash, an `unrecorded_*` field — and say which case you are in, in words.
- Prefer three branches to two: *has a value* · *is genuinely zero/empty* · *was never recorded*.
- The rule applies one level down too. A summary that distinguishes them over rows that do not has
  only moved the lie.

Same principle, other faces: `null` renders as **"—"**, never `0` (law 1); a z-score never renders
without its window; a percentile never without its confidence. A number without what establishes it
is a number that states more than it knows.

---

## 🔑 HOUSE RULE — EVERY MOCK IS A CLAIM, AND NOTHING CHECKS IT

**A mock asserts "the real thing behaves this way." Nothing verifies that assertion, so a mock's
blind spots are invisible — and a suite is green precisely where it cannot see.** Twice in two days a
passing suite missed a production failure because the test exercised a SUBSTITUTE that could not fail
the way the real thing fails:

- **FIN-231** — `GET /agent-run/{date}` 500'd on its first real request behind 234 lines of passing
  tests. They injected their own reader, so the production path never executed. The seam audit that
  followed found **9 of 12 `_default_*` functions never run in the whole suite**.
- **2026-09-09** — a dead DNS resolver made `fetch` REJECT, `ensureAccessToken()` let the TypeError
  escape, and every route including root rendered TanStack Router's default boundary. **190 tests
  could not see it**: `setup.ts` starts MSW for every test, and MSW *answers* requests. It can return
  a 500; it cannot make `fetch` reject. The one failure mode that took the app down was unreachable
  by any test in the suite.

**How to apply it:**
- For each mock, ask: *what can the real thing do that this cannot?* Failing to respond at all,
  hanging, half-responding, and being unreachable are usually on that list.
- Test the **failure of the transport**, not just the failure statuses it can carry. A rejecting
  `fetch` needs `vi.stubGlobal` — configuring it *through* MSW tests MSW, not the network.
- Prefer exercising the production path over injecting a substitute for it. When you must inject,
  write down what the substitute cannot do.
- A seam that only ever runs under a mock is untested, however many assertions surround it.

⚠️ Known blind spots of this suite's MSW setup, unfilled by choice (see the FIN-236 report): request
timeouts, aborted/cancelled requests, malformed JSON bodies, a 200 with an empty body, a response
that never completes, CORS/opaque responses, and non-JSON error bodies. Only *rejection* is covered
so far — `src/lib/api/network-failure.test.tsx` (seam) and `src/app/network-failure.test.tsx`
(screen).

---

## 🔑 HOUSE RULE — A "PROPOSED SHAPE" NOTE MUST NAME ITS TRIGGER

When code or a fixture stands in for a backend shape that does not exist yet, **never** write only
prose ("not served yet", "proposed, not observed"). Prose is correct the day it is written and
silently wrong the day the backend ships — two such notes went stale-and-wrong in one afternoon
(FIN-236). Write the marker instead, naming the schema whose arrival makes the note obsolete:

```
PROPOSED-UNTIL: SomeSchemaName
```

`scripts/proposed-markers.test.ts` asserts every named schema is ABSENT from the committed spec, so
the build FAILS with a file:line and "verify against the real shape, then delete the marker" the
moment it lands. ⚠️ It is a tripwire on ONE condition — the named schema now existing. It cannot
catch a note that was always wrong, one naming no schema, or a shape that changed without a new
schema name (FIN-218's contract check covers that last one). ⚠️ It only works while the committed
spec stays fresh: if `check:contracts` is disabled or left red, this trigger goes quiet with it. The
full reasoning and limits are in the test file — read them before trusting a green.

---

**2026-09-09 — THE NETWORK-FAILURE PATH.** A dead DNS resolver (the outage) revealed a real FE bug:
`fetch` rejecting made `ensureAccessToken()` throw, `_authenticated.beforeLoad` threw, nothing caught
it, and every route including root showed TanStack Router's default "Something went wrong!" with the
cause behind a toggle. Now:
- `NetworkError` + `netFetch()` in `lib/api/client.ts` name an unreachable API. ⚠️ An **AbortError
  passes through untouched** — React Query aborts on unmount, and dressing that up as an outage would
  cry wolf every navigation. ⚠️ Matched by `name`, NOT `instanceof Error`: a DOMException does not
  extend Error in jsdom, and the instanceof check silently reclassified every cancel as an outage
  (a test caught this).
- `checkAccess(): AccessResult` returns a REASON — `no-session` / `rejected` / `unreachable` — and
  never throws on a dead network; `ensureAccessToken()` is the boolean wrapper. The reason travels
  to `/login` as a search param and the form says "Cannot reach the API. You are still signed in."
  ⚠️ **A network failure must never read as a sign-out** — that sends Father to re-type a password
  that was never wrong, at a server that cannot hear him.
- ⚠️ **The session is NOT cleared on a network failure** (only a server that ANSWERED and refused
  clears it). That correctness fix created an infinite redirect loop — `isAuthenticated()` is true
  while a refresh token exists, so `/login` bounced back to `/` forever. `/login`'s `beforeLoad` now
  returns early when a `reason` is present. A loop is WORSE than the bug it replaced; there is a
  regression test counting fetches after settle.
- `__root.tsx` has an **`errorComponent`** (`components/common/RootErrorScreen`): names the failure,
  shows the underlying cause ALWAYS VISIBLE (never behind a toggle), and for a NetworkError shows the
  browser's own words rather than restating the headline.
- `LoginForm` takes `reason` as a PROP; the route owns search. Keeps the form renderable standalone.

**Updated:** 2026-07-17 — **MOBILE RESPONSIVENESS pass.** The fixed 64px icon-rail + `pl-[104px]`
was eating ~1/3 of a phone screen and breaking layouts. Now: below `lg` the sidebar is an OFF-CANVAS
DRAWER (hidden, a hamburger in the header opens it as an overlay with a scrim; a link/scrim tap
closes it) so content gets full width; at `lg+` it stays the persistent rail (collapse toggle intact).
`overflow-x: clip` added to html+body (gate 34). The brief's 5-col scan board scrolls WITHIN its own
bounded card on mobile (COT no longer clips) instead of overflowing. Backdrop cells got `min-w-0` so
long provenance notes truncate. DecisionBar action row wraps on narrow screens (the incomplete-brief
2-button state). Verified no page h-scroll + layouts hold at 320 / 375 / 414 / 768; login, cockpit,
brief, history all clean. ⚠️ Tailwind v4 note: `-translate-x-[…]` uses the `translate` property, so
`getComputedStyle().transform` reads "none" even when translated — check `.left`/rect, not transform.

**FIN-172-fe: ONE TAB + the CTA matrix.** `/readiness` now carries a
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
A single non-scroll (on lg+) command centre: a glass DECISION bar on top (a standing manual
**Refresh** CTA / generate / "Refresh Kite token" / 8-dot verdict strip + count-up), then three flat
tiles — SOURCES rail | BOARD (hero) |
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

**FIN-142 — each base-metal card now carries its own LME 3M reference.** The 5 `LME_*_3M`
evidence macro rows (source METALS_DEV) are JOINED onto the board cards by instrument
(`lib/mcx/lme.ts` mirrors the backend `LME_METALS` map — COPPER/ZINC/ALUMINIUM/LEAD/NICKEL, British
spelling; confirmed live 2026-07-22). Rendered as a reference LEVEL "LME 3M · 13,836 USD/t" — no %,
no sign (it is NOT an implied open), fail-closed when metals.dev is down (no row → no line, never
fabricated). COPPER is Tier-A so it gets the LME line alongside its COT. NOT wired: the brief's
`InstrumentCard` — its `lme_context` string is internal backend only, not in the served-brief
openapi (a backend follow-up to expose it). Regenerating contracts also caught unrelated drift now
typed: the `RefreshReport.board`/`.lme` legs and `CostReport`/`StageCost.regenerates`.

**FIN-188 — CRUDEOIL + NATURALGAS cards carry their EIA weekly inventory line.** Same pattern as
LME (`lib/mcx/eia.ts` mirrors `lme.ts`): CRUDEOIL→`EIA_CRUDE_STOCKS`, NATURALGAS→`EIA_NATGAS_STORAGE`.
Rendered as a RELEASED FACT: level + WoW + draw/build, e.g. "EIA crude stocks · 409.7M bbl · −1.69M
bbl w/w (draw)". ⚠️ The WoW was NOT in the served contract (macro rows shipped value only, like LME's
d/d); the **backend** (this session) added `MacroRow.wow` + `MacroRow.wow_direction` (backend-computed
— the FE NEVER diffs weeks; law 3). Units: crude MBBL→M bbl (÷1000, a display unit conversion the
backend grounding uses too), natgas Bcf as-shipped. draw/build is the backend's `wow_direction` word,
shown NEUTRALLY (descriptive, never a pick — law 2/8). Fail-closed: no row → no line; null wow →
level only. Hovering the `eia` source lights the line (lineage, like LME). The `eia` dot is
registry-driven + refreshable via the FIN-192 filtered path (`{"sources":["eia"]}`). Regen also added
the required `RefreshReport.eia` leg (fixtures updated). NOT wired: the brief `InstrumentCard`'s
`eia_context` (internal-only, same as `lme_context`).

**FIN-213 — the brief now surfaces everything the 2026-09-05 payload carries (items 1–7; item 8
held).** The `ServedInstrument`/`ServedScanRow` schemas grew 8/5 fields + `cot_stance` was RENAMED
`cot_stance_label` (a live regression — `InstrumentCard` rendered the removed field → blank; fixed).
Regenerated Zod (FFE-004). Cockpit sources (13, weakest-link notes) were ALREADY dynamic
(`SourcesRail` maps the array) — no change. New in the BRIEF (`features/brief/`): (1) `liquid_contract`
+ expiry NAMED in the `InstrumentCard` header (FIN-197 — the card silently switches contract on
expiry-day); (2) `cot_confidence` caveat welded to the percentile, and Tier-B base metals now show
their FIN-195 LME-COTR percentile (was hidden as "no CFTC COT") — the number never appears without
the caveat; (3) `total_oi`/`oi_change` (stat rail + a new scan OI column — the thin-vs-deep signal);
(6) `atr` + `atr_avg` baseline; (7) brief `lme_context`/`eia_context` with framing preserved (LME =
context level NOT an implied open; EIA = released fact); (4/5) a new `BriefSources` block renders
`brief.sources` (13, verbatim notes so the weakest-link name survives, unevaluable sources visible).
Fail-closed throughout (null → omitted). ⚠️ Item 8 (refusal legibility) HELD: the backend signals
refusals via NULL with no reason field served (`serialize.py:166,330`), so a refused number reads as
a bare "—"; making it legibly-deliberate needs a served reason (a backend follow-up) — deferred by
decision. Verified via a real-component-tree integration test (`features/brief/fin213.test.tsx`)
asserting each field's visible DOM; a live-brief browser screenshot wasn't possible (no brief today —
news+kite red).

**FIN-216 — multi-session comparisons now speak on the brief card (+ the ranking factors).**
Third silent drift in a week: `ServedInstrument` grew `oi_gap_sessions` + `prior_close_sessions` the
same day it shipped (FIN-218 tracks the structural fix; regenerated for now). Semantics (confirmed
from `../finint/src/live/sessions.py`): `sessions_between` counts settled MCX sessions in
`(prev, latest]`; `1` = a true T-1 (the pre-open norm), `>1` = a multi-session net change that must
NOT read as "overnight"/"yesterday", `>3` refused upstream. `oi_gap_sessions` qualifies the OI read
(oi_state is classified between consecutive stored bars); `prior_close_sessions` qualifies the
implied-open price anchor. `InstrumentCard` renders an amber qualifier ONLY on the exception (>1) —
"net change over N sessions — not overnight" on the OI block, "anchored to a close N sessions old —
not yesterday" on the implied-open block; a clean T-1 (1/null) stays unmarked (fail-closed). The
session fields are on `ServedInstrument` only, NOT `ServedScanRow` — so this is the deep-read card;
the scan can't mark it (a backend follow-up if wanted). **Factors decision (judgment call — SHOWN):**
a compact "Rank basis" profile in the stat rail — the 5 raw served scores (gap/oi/level/vol/cot) as
bars ordered by the FIN-200 weights (documented in a tooltip); the FE renders scores, NEVER
re-derives the rank. Argued reader-facing because the deep set is 4 of 9 ("why these four") and the
basis is non-obvious (a thin Tier-B takes a card on OI+vol with no gap). A null factor → explicit
"—", never a 0. Verified via `features/brief/fin216.test.tsx` (real zod + real components). Item 8
(refusal legibility) still blocked on FIN-217 (a served refusal reason) — NOT inferred from nulls.

**FIN-218 — the silent-drift class is closed by a regenerate-and-compare guard (FFE-012).** The FE
zod is generated from a hand-refreshed committed copy of the backend spec + `.passthrough()`, so
drift was invisible (4× in ~7 weeks). Now: `scripts/lib/contracts.mjs` is the shared generator core
(`gen:contracts` + the guard produce identical output); `scripts/check-contracts.mjs` regenerates and
FAILS on any diff (full equality → catches renames, not just additions). Two homes: **CI** (`ci.yml`
checks out finint's committed `docs/api/openapi.json`, runs the FRESHNESS check — the un-skippable
gate; needs the `FININT_SPEC_TOKEN` secret, fail-closed without it) and **`prebuild`** (the `--self`
consistency check, no backend dep, gates every build + Vercel deploy). Live comparison is NOT needed —
the backend's `dump_openapi.py --check` guarantees its committed spec == live, so the chain composes.
Proof it works: the guard FAILED on its first run, catching a 4th drift —
`ServedInstrument.dist_to_support_atr` + `dist_to_resistance_atr` (distance to S/R in ATR units), now
typed but **UNRENDERED** → a follow-up render ticket (like FIN-213/216), NOT built here. Break-tests
in `scripts/check-contracts.test.ts` (added field fails · rename fails · match passes · --self
passes). `.passthrough()` stays (runtime honesty, law 12) — the fix is the check, never stricter
parsing.

**FIN-227 / FIN-231 / FIN-228 Stream C — the Agent Run view (`/agent-run/:date`).** A SECOND read on
the same board, from the laptop harness (SAD §3.3), built for COMPARISON against the API brief. The
endpoint is LIVE and the contract is **GENERATED** (the provisional hand-authored
`contracts/agent-run.ts` is DELETED — that is FFE-004's whole point).
🔴 **THE STATUS-CODE RULE: 404 = no run was landed; a gate refusal is a 200 with `gate.ok:false` and
an empty `stages[]`.** Two different pages, both tested.
⚠️ **GROUPED BY INSTRUMENT, NOT BY ANALYST** (FIN-228). Four analysts x nine instruments = 36 reads;
each instrument card carries ONE board-facts strip and all four views beneath it. Reasons: (1) the
value of a second pipeline is where its readers DISAGREE about the same instrument, and a
disagreement eight screens apart is unusable; (2) the board facts are per instrument, so grouped this
way they render once instead of four times or none; (3) a missing analyst is visible nine times
instead of once. What is genuinely per-analyst — `board_note`, the crossmarket `backdrop`, the news
`macro`/`catalysts` — is rendered in its own board-level section BELOW the instruments, grouped by
analyst. Grouping follows what the thing IS.
⚠️ **THE ROSTER (`ANALYSTS` in report-shape.ts) MAKES ABSENCE VISIBLE — and must never make an
ADDITION invisible.** The page renders against the expected four, so three reads never pass for four
(FIN-198's shape); `specsForRun()` ALSO renders any analyst not on the roster, with whatever prose
fields it wrote, because a hardcoded list that silently drops a new arrival is law 5's failure in a
new place. Every absence is typed: rejected / did not land / unreadable / landed-but-uncovered.
⚠️ **A QUARANTINED REPORT IS NOT CONTENT.** `.bad` name + `status:"failed"` are welded by a database
CHECK (FIN-231 G3); EITHER signal is treated as rejected, and the body is never rendered.
⚠️ **ALL 39 BOARD FIELDS ARE SERVED AND TYPED** (FIN-228 Stream C). `BOARD_FIELDS` went 9 → 39,
derived from the agents' own `sources[]` — a derivation that found six nobody had listed
(`lme_value`/`lme_change_pct`/`lme_as_of` for every Tier B, `eia_value`/`eia_wow`/`eia_as_of` for the
energy pair); a backend test re-derives the list and fails when an agent cites something unshipped.
`ratios` is a typed top-level key. The `stream-a-fields.ts` shim that read these off
`board[].passthrough()` is **DELETED** — a hand-written escape hatch beside a generated contract is
how the two drift (same discipline that retired the provisional agent-run contract).
🔴 **`premium_pct` CHANGED SCALE: fraction → PERCENTAGE POINTS** (-0.0081 became -1.58), matching
every sibling `_pct`. **`formatFractionPct` was DELETED**, not left lying around — through it GOLD
would print −0.0158%. `formatSharePct` STAYS: a share is genuinely a fraction, and it is unsigned
because "45.0% of OI" and "+45.0%" are different statements.
⚠️ **A REFUSED GATE DOES NOT MEAN NOTHING RAN.** The real 2026-09-08 run refused (9/9 closes
unsettled) and landed all four analysts anyway; `GatePanel` takes `stagesLanded` and says "the gate
refused, and N stages landed regardless — read it against this refusal" rather than the false "no
agents ran".
⚠️ `stages[].report` is an OPAQUE object in the spec, so its readers live in
`features/agent-run/report-shape.ts`, deliberately NOT in `contracts/`, and are `safeParse`d at use.
Fixtures are REAL served payloads built by the harness's own `gather()` over the real
`runs/2026-09-0{4,5,8}` artifacts; `served-four-narrow-board.json` is what the endpoint serves TODAY
and keeps the "not served" paths under test. ⚠️ The page is only PROVISIONALLY verified for the wide
board — re-verify against a real run once BOARD_FIELDS ships.
⚠️ **A DECISION COUNT IS NOT A CLAIM COUNT** (FIN-232, shipped after the FIN-231 report flagged it).
`GuardDecision.claims[]` + `claim_count` and `GuardSummary.denied`/`claim_count` are now in the
contract; one deny carried FOUR ungrounded claims and read as "1 denied". GuardPanel shows
"N denied (M claims)" and lists each claim (instrument · field · found · expected_prose). ⚠️ The raw
`expected` level array is deliberately NOT rendered — 14 floats bury the claim they support.
⚠️ **The guard WRITER does not emit `claims` yet**, so a real denial arrives with `claim_count: 0`;
a zero is never printed as "(0 claims)" — that would say the denial rested on nothing.
NAV: **Agent run** is the third sidebar item, date-addressed at `istToday()` (IST — the board's day).
⚠️ The generator needed a Zod-v4 fixup: openapi-zod-client emits v3 `z.record(V)`; v4 needs
`z.record(k, v)` — patched in `scripts/lib/contracts.mjs` so gen + check stay byte-identical.

**FIN-160 (the readiness spine) is PRESERVED UNDER the cockpit and PROVEN against the live API.**
The `ReadinessScreen` container still owns the data fetch, loading/error (`ScreenState`), a
**standing manual Refresh** (FIN-174 replaced the on-land auto-refresh), the `already_running`
bounded re-read, the honest `RefreshReport` (now floated bottom-right so it never disturbs the
non-scroll grid), and the Kite modal. Only the flat "Data sources" `SourceRow` list + standalone
"Generate brief" button are GONE — the cockpit's decision bar + rail supersede them. It still maps
over `readiness.sources` (never hardcoded), and Generate is gated on `can_generate` +
`blocked_reason`.

- **Refresh is MANUAL only (FFE-011 / FIN-174 — supersedes FFE-006):** nothing fetches the spine
  without a user action. The on-land `useEffect` + the whole `on-land.ts` stale-gate module are
  DELETED. The DECISION bar carries a **manual Refresh CTA** → the existing `useRefreshSpine` (POST
  /refresh). It renders regardless of source STATUS (all-green included), but rides WITH the generate
  action — refresh freshens the INPUTS that feed generation, so it shows at the pre-brief gate and on
  an incomplete brief (freshen news → Re-generate), and is **HIDDEN once a COMPLETE brief exists**
  (final read, $0 to open, nothing to (re)generate → a Refresh beside "View brief" is a dead-end).
  In-flight → the button disables, so the FE never double-fires (the backend Redis single-flight
  guard is a backstop). NO timer / interval / refetchInterval / refetchOnWindowFocus anywhere.
  The refresh report still shows the honest per-source truth (a partial NAMES the failed source; COT
  "skipped" reads as success; already_running bounds the wait on `started_at`).
- **Refresh is FILTERED per dot (FIN-192):** `refreshSpine(sources?)` → `useRefreshSpine`
  `mutate([keys])` sends `{"sources":[…]}` (filtered) vs `mutate(undefined)` (bare = every leg).
  Two entry points: (a) a refreshable DOT's row-click in the SourcesRail → filtered to that one key;
  (b) the standing "Refresh" CTA opens a **scope modal** (`RefreshScopeModal`) that reads the
  `sources`, splits the `action:'refresh'` ones into stale (`status!=='green'`) vs fresh, and offers
  three scopes — refresh ONE, refresh the STALE SUBSET (`{"sources":[staleKeys]}`, the recommended
  quota-saving path), or ALL (bare). Nothing fetches until a scope is chosen. Kite is NOT a valid
  source (backend 400s `{"sources":["kite"]}`) — excluded from the modal; its dot routes to the
  login modal. A filtered response returns the un-run legs as `{ok:true, skipped:true, reason}`;
  `summarizeRefresh` DROPS skipped legs (never a false "updated", never a failure) and added an
  `lme` line so a filtered LME refresh shows its own result.
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
4. ~~**FIN-161 — Generate + progress**~~ ✅ **DONE** — POST /generate → poll GET /generate/status
   (4 steps: fetch/scan/news/write), cost object, degraded flagged, already_complete $0 path, brief
   handoff. Merged to main.
5. ~~**FIN-162 — The brief surface + history**~~ ✅ **DONE** — the layered brief (market + per-
   instrument read), withheld fields render as a STATE not a literal string, honesty metrics
   surfaced, History. Redesigned as a research note. Merged to main.
6. ~~**FIN-172 — one tab + the readiness `brief` CTA matrix**~~ ✅ **DONE** — dropped the Brief nav,
   `/readiness` now returns a top-level `brief` block driving the DecisionBar CTA (complete → View;
   incomplete → View + re-generate ≈$0.12; none → Generate). Merged to main.
7. ~~**FIN-174 — kill on-land auto-refresh, add a standing manual Refresh CTA**~~ ✅ **DONE** (this
   session) — FFE-011 supersedes FFE-006. See the readiness section above. ⚠️ The FIN-174 trace also
   surfaced TWO backend bugs the FE cannot fix — negative freshness-age ("Fresh · -53562s ago") and
   macro `on_conflict_do_nothing` reporting `rows: 0` while leaving stale values — **open FININT
   tickets** (evidence FILE:LINE captured in the session trace).
8. **Cutover:** add `finint.apextrader.trade` to the Vercel project → repoint DNS
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
- **Refresh burns GNews quota (100/day, ~6 per refresh) → it must stay a DELIBERATE user action.**
  FIN-174 removed the on-land auto-refresh entirely; do NOT reintroduce any automatic trigger
  (timer, interval, `refetchInterval`, `refetchOnWindowFocus`, or a mount `useEffect`). The only
  spine fetch is the standing Refresh CTA (or a source-row click). See FFE-011 (supersedes FFE-006).
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
