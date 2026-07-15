# CLAUDE.md — finint-fe laws

**Read this at the start of EVERY session.** This file is permanent rules — it never changes
without an `FFE-NNN` decision recorded in [`DECISIONS.md`](DECISIONS.md). It is law, not aspiration.

`finint-fe` is the **frontend** for FININT — a private, read-only **pre-market intelligence**
system for the MCX board. The backend (`procrastinate-coders/finint`, a Python/FastAPI service at
`https://apifinint.apextrader.trade`) is the source of truth for **data**. `apex-admin`
(`procrastinate-coders/apex-admin`) is the source of truth for **visual language** — FININT wears
the same Liquid Glass skin, but is a **separate, independent app**.

---

## 0. What FININT IS (never lose this)

Every morning before the 9:00 MCX open, FININT computes a deterministic scan of the whole board
(9 mains + minis), runs two prompted AI agents under substance guards, and writes a layered brief:
a market layer (backdrop + overnight catalysts) + a per-instrument read. It tells Father
(Naveen, a 30-year MCX trader) **what CHANGED overnight and what to watch**.

**It is READ-ONLY. It never buys or sells and never tells anyone to.** It frames the morning;
**Father decides.** The founding thesis: **positioning leads, narrative follows** — OI, COT and
flows are the signal; news is lagging, sometimes contrarian.

**The single user is Father.** He is the judge of whether the read is any good. The UI's job is to
put the complete information surface in front of him without editorialising it.

---

## 1. Sources of truth (never contradict these)

- **Data shapes / API contract:** the live OpenAPI spec at `https://apifinint.apextrader.trade/openapi.json`.
  Zod schemas are **generated from it** — never hand-written (FFE-004).
- **Backend architecture + decisions:** `../finint/ARCHITECTURE.md`, `../finint/SCHEMA.md`,
  `../finint/DATA_SPEC.md`, and the Linear epic **FIN-134** (decision records live as comments there).
- **Visual direction:** `../apex-admin/docs/design/BRAND.md` + `../apex-admin/docs/design/DESIGN.md`.
  We follow them. We do not fork them.
- **This repo's decisions:** [`DECISIONS.md`](DECISIONS.md) (`FFE-NNN`).

If code and a source-of-truth doc disagree, the doc wins — fix the code or open an `FFE-NNN`.

---

## 2. The laws (do not break these without a new FFE-NNN)

### FININT-specific — these are the product

1. **NEVER FABRICATE. A missing number is honest; an invented one is the disease.**
   A `null` renders as **"—"**, never a zero, never a placeholder, never a guess, never a
   "coming soon". If the API says it doesn't know, the screen says it doesn't know.
   *(Mirrors the backend's core value; it is the whole reason the system is trustworthy.)*

2. **NO BUY/SELL LANGUAGE. Ever.** The backend asserts its own prose contains no
   buy/sell/entry/stop/target language before it ships. **The FE must not reintroduce it** —
   not in labels, not in empty states, not in tooltips, not in a "recommended" badge, not in
   sort order that implies a pick. The system frames; Father decides. A UI verb that implies
   an action is a bug.

3. **Tier-B gaps are CORRECT, not errors.** ZINC / ALUMINIUM / LEAD / NICKEL are LME-priced:
   **no implied open, no COT stance** — by design (`data_tier: "B"`). Render the gap plainly
   ("no international reference"), never an error state, never a fabricated number, never a
   hidden card. An honest lighter read is the intended output.

4. **Surface the honesty metrics.** `guard_failed` and `fabricated_claims` from the brief's
   `meta` are **first-class UI**, not debug fields. If a guard fired, Father sees it.
   Hiding a degraded brief to look polished is the one unforgivable UI decision.

5. **The readiness sources list is REGISTRY-DRIVEN — never hardcode it.** `GET /readiness`
   returns a `sources` array; it has grown (6 → 8) and will grow again. **Always map over
   `response.sources`.** Each item: `{key, label, status, note, critical, human_refreshable,
   action, blocks_on_red}`. A hardcoded list silently drops a new source — which is exactly
   how a degenerate board once passed as ready.

6. **Point-in-time is by design, not a bug.** The brief reads **T-1 and earlier**. Yesterday's
   close pre-open is *correct*. Never label it "stale". An MCX futures premium over spot
   (~₹4-6k on gold) is **normal**, not corruption.

### Inherited from apex-admin (same skin, same discipline)

7. **Every ₹ value and every number is JetBrains Mono, tabular figures.** Mono is the signal
   that a number is exact. UI text is Inter. (DESIGN §3.)

8. **Six status colours only.** `green · orange · red · red-critical · blue · yellow`. Colour
   encodes **state** (source health / OI state / divergence tension) — **never** decoration,
   branding, or theme. A coloured pixel always means "read me." Any new colour is a bug.
   (BRAND §2, DESIGN §12.)
   **Colour must never encode a direction as a recommendation** — green on a rising number is
   describing the move, not endorsing it (see law 2).

9. **Data elevation = one 0.5px hairline — never a box-shadow on a card, table, or number.**
   Glass depth (frosted blur + specular edge + soft drop) is **chrome only**. Data stays flat.
   Strict 8pt grid. Dark mode primary. (DESIGN §6, §12; FE-013.)

10. **Material boundary: glass on chrome, flat + signal-pure on data.** `<Glass>` /
    `backdrop-filter` belongs to sidebar, header, modals, overlays, login. Tables, prices,
    scan rows and badges stay flat. **Where glass and signal compete, signal wins.**

11. **Component boundary, imports point downward only:**
    `features/* → @/design-system → components/ui/* → lib/*`. Features never import each other;
    feature-local compositions live in `features/<x>/components/`. Enforced by
    `no-restricted-imports` in `eslint.config.js`. (Mirrors apex-admin FE-015.)

12. **Zod-parse at the boundary — drift fails loudly.** Every response is parsed. A schema
    mismatch is a visible error, never a silent `undefined` rendered as blank.

13. **Single-flight refresh — one owner of the refresh promise.**
    ```ts
    let refreshInFlight: Promise<string | null> | null = null
    export function refreshAccessToken() {
      refreshInFlight ??= doRefresh().finally(() => { refreshInFlight = null })
      return refreshInFlight
    }
    ```
    Concurrent 401s (a readiness poll + a brief fetch) must produce **one** `POST /auth/refresh`,
    not two racing calls that clobber each other's tokens.

---

## 3. ⚠️ WHERE WE DIVERGE FROM apex-admin (know this cold)

**apex-admin's Law #1 — "money is rendered, never recomputed" — DOES NOT APPLY HERE.**

APEX's backend ships `*_paise` integers **plus** a `*_display` string, and the panel prints the
string verbatim. **FININT's API does not do this** — it ships raw numbers in a JSONB blob
(`close: 147889.00`, `implied_open_pct: 1.638`, `oi_change: -506`).

**So finint-fe DOES format numbers** (FFE-002), because:
- FININT is read-only market data, not a money-at-risk ledger. The reason APEX's law exists
  (a formatting bug moving real client money) does not apply.
- A wrong-looking price is instantly obvious to a 30-year trader — the error surfaces itself.
- Adding `_display` to every field of a JSONB blob is large backend churn for no safety gain here.

**The formatting rules (non-negotiable once formatted):**
- **Indian grouping**: `Intl.NumberFormat('en-IN')` → **₹1,47,889**, not ₹147,889. Father reads
  lakhs. Getting this wrong makes the whole screen feel foreign to him.
- One formatter module (`lib/format/`). **No ad-hoc `toFixed()` in components.**
- Percentages: sign always shown (`+1.638%` / `−0.905%`), 2-3dp, never rounded to hide a small move.
- `null` → **"—"** (law 1). Never `0`, never `N/A`, never blank.

**Other divergences:**
- **No money arithmetic at all.** FININT never computes a P&L, a margin, or a position. If you
  find yourself doing arithmetic on a price, stop — the backend's scan owns every calculation.
  The FE renders; it does not analyse.
- **Deploy target is Vercel**, not DO App Platform.
- **Auth is FININT's own** (`POST /auth/login`, own `FININT_JWT_SECRET`) — **not** APEX's
  operator JWT. No shared secret, no dependency on APEX. (FFE-001.)
- **No WebSocket.** FININT is a pre-open read, not a live feed. Polling only, and only where a
  poll is meaningful (`/generate/status`). Do not add a tick stream.

---

## 4. How to work here (session methodology)

1. Read `CLAUDE.md`, `CONTEXT.md`, `ARCHITECTURE.md`, the relevant spec in
   `docs/superpowers/specs/`, and `../apex-admin/docs/design/` for any screen you touch.
2. Confirm scope with Udit before building (brainstorming → spec → approval).
   **No code before the spec is confirmed.**
3. Plan (writing-plans) → save to `docs/superpowers/plans/`.
4. Build test-first (TDD: a failing test first), one task at a time.
5. **Verify before claiming done** — typecheck + lint + tests; for UI, look at the real screen
   against `DESIGN.md`.
6. Update `CONTEXT.md` at session end (hard gate — never close a session with stale CONTEXT).
7. Commit: `feat(FIN-XXX): description` (Linear ticket) or `feat(FFE-XXX): …` for FE-only decisions.

**Libraries change fast — read official docs before writing library code.** Do not trust
memorised APIs for Vite 8, Tailwind v4, shadcn, TanStack Router/Query, or Zod v4.

---

## 5. What must never change (without an FFE-NNN superseding decision)

- The build tool is **Vite**. Static SPA. **No server** — no SSR, no RSC, no API routes, no
  server actions, no Node backend. Vercel serves static files only.
- The never-fabricate law (#1) and the no-buy/sell law (#2). These are the product.
- The six-colour lock and the visual non-negotiables in DESIGN §12.
- The data contract is owned by the backend. If a shape needs to change, it changes there first
  (a FININT Linear ticket), then here. Regenerate the Zod schemas; never patch them by hand.

---

## 6. Decision & commit format

- Decisions: `## FFE-NNN — title` with **Status / Date / Decision / Rationale / Consequences**.
  Never delete a decision; supersede it and reference the new number. Cross-link the backend's
  Linear ticket (`FIN-NNN`) where relevant.
- Commits: conventional — `feat(FIN-XXX): …`, `docs: …`, `chore: …`, `fix: …`.
- Co-author trailer on commits made by the agent.
