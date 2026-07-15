# DECISIONS.md — finint-fe (FFE-NNN)

Never delete a decision. Supersede it and reference the new number.
Cross-link the backend's Linear ticket (`FIN-NNN`) where relevant.

---

## FFE-001 — FININT owns its auth; no APEX dependency
Status: LOCKED
Date: 2026-07-15
Decision: finint-fe authenticates against FININT's own login (`POST /auth/login`, own
`FININT_JWT_SECRET`, own users table). It does NOT reuse APEX's operator JWT.
Rationale: Independence — FININT ships without waiting on APEX's build state, releases, or auth
refactors. No shared secret across two systems (rotate one, break the other). And it fixes a real
leak: under the APEX-JWT plan the check was `role=="admin"`, so ANY APEX operator could read the
briefs — Father's edge visible to people around the book. Superseded plans considered and rejected:
(a) FININT verifies APEX's HS256 token with a shared secret, (b) APEX's Go backend proxies FININT.
Consequences: More work up front (3 tickets vs 1) and a second set of credentials for Father.
Backend: FIN-157.

## FFE-002 — finint-fe FORMATS numbers (diverges from apex-admin FE-003)
Status: LOCKED
Date: 2026-07-15
Decision: apex-admin's law "money is rendered, never recomputed" does NOT apply here. FININT's API
ships raw numbers in a JSONB blob (`close: 147889.00`, `implied_open_pct: 1.638`) with no
`*_display` strings. finint-fe formats them in ONE module (`lib/format/`) using
`Intl.NumberFormat('en-IN')` — Indian grouping (₹1,47,889, not ₹147,889).
Rationale: APEX's law exists because a formatting bug there moves real client money in a ledger.
FININT is read-only market data; a wrong-looking price is instantly obvious to a 30-year trader.
Adding `_display` to every JSONB field is large backend churn for no safety gain. Father reads
lakhs — international grouping makes the screen feel foreign to him.
Consequences: One formatter module; NO ad-hoc `toFixed()` in components; `null` → "—" always.
FININT never does money ARITHMETIC — the backend's scan owns every calculation. If the API ever
grows `*_display` fields, revisit and supersede.

## FFE-003 — Separate repo, ported design system (not a shared package)
Status: LOCKED
Date: 2026-07-15
Decision: finint-fe is a standalone repo. The design tokens + `design-system/` tier are COPIED
from apex-admin, not imported from a shared package or a monorepo workspace.
Rationale: Same skin, independent release. A shared package would recreate the coupling the split
was meant to remove. Two consumers do not justify a package.
Consequences: Design drift is possible — apex-admin's DESIGN.md/BRAND.md stay the source of truth,
and a visual change there must be manually ported. Accepted.

## FFE-004 — Zod schemas are GENERATED from /openapi.json, never hand-written
Status: LOCKED
Date: 2026-07-15
Decision: Generate the contract schemas from `https://apifinint.apextrader.trade/openapi.json`.
A generation script lives in package.json.
Rationale: Hand-written schemas drift from the API silently. Generated ones turn a backend schema
change into a BUILD ERROR — which is the point of parsing at the boundary at all.
Consequences: The API must be reachable to regenerate. Never patch a generated schema by hand;
fix the backend and regenerate.

## FFE-005 — Vercel, static SPA, no server
Status: LOCKED
Date: 2026-07-15
Decision: Deploy to Vercel as static files. No SSR, no RSC, no API routes, no server actions,
no edge functions.
Rationale: The app is a pure client for a JSON API. A server tier would add a second thing to
secure, deploy and reason about for zero gain.
Consequences: `vercel.json` MUST carry the SPA rewrite `{"rewrites":[{"source":"/(.*)",
"destination":"/index.html"}]}` or every deep link 404s — including `/kite/callback`, exactly
where Kite redirects. The failure is silent until that flow is tested.
Note (open): Vercel serves the FE publicly — anyone with the URL loads the shell. The shell holds
no data without a token, so this is accepted, but it is a conscious call, not a default.

## FFE-006 — On-land auto-refresh, but ONLY when actually stale
Status: LOCKED
Date: 2026-07-15
Decision: Landing reads `GET /readiness` and fires `POST /refresh` only if a source is genuinely
stale — never unconditionally on mount.
Rationale: GNews' free tier is 100 requests/day; each `refresh_spine` burns ~6 queries. ~16
refreshes exhaust the day and the real morning brief fails. React StrictMode double-mounts in dev.
The backend has a concurrency guard (returns `already_running`) but the FE must not lean on it.
Consequences: The staleness check lives in the FE and must match the backend's freshness rules.
Backend: FIN-156.

## FFE-007 — No WebSocket
Status: LOCKED
Date: 2026-07-15
Decision: No tick stream, no live feed. Polling only, and only where a poll is meaningful
(`GET /generate/status` during a run).
Rationale: FININT is a PRE-OPEN read of what changed overnight — not a live market view. A tick
stream would be answering a question the product does not ask. (apex-admin has a WS seam; FININT
deliberately does not.)
Consequences: Any "live prices" request is a product change, not a FE task — open an FFE.

## FFE-008 — Provisional hand-authored contracts until the backend declares response models
Status: LOCKED
Date: 2026-07-15
Decision: FFE-004 (generate Zod from `/openapi.json`, never hand-write) is temporarily
un-satisfiable, so finint-fe reads hand-authored **PROVISIONAL** Zod schemas under
`src/lib/api/contracts/provisional/` (auth · readiness · system[spine/kite/generate] · error),
clearly marked, while the codegen tooling (`npm run gen:contracts` → `scripts/generate-contracts.mjs`
→ `_generated/`) stays wired and ready.
Rationale: Verified two ways during FIN-158 — (a) the live spec is behind nginx basic auth; (b)
dumping it locally from the FastAPI app (`create_app().openapi()`) shows every substantive response
serialises as `schema: {}` because the backend returns raw dicts with **no `response_model=`**, and
the `/auth/*` endpoints (FIN-157) don't exist yet. So codegen — local OR the deployed host (same
version `5c`) — yields nothing usable. The scaffold's whole point (a real parse-at-boundary login +
readiness) needs SOME typed contract; the strict-FFE-004 alternative (no hand-writing) would leave
login + readiness untyped and defeat that purpose. This bends FFE-004's letter temporarily while
honoring its spirit — drift-fails-loudly returns the instant the backend types its responses.
Consequences: `provisional/*` shapes for `/auth` (FIN-157) and FIN-156 are DESIGNED, not observed —
a mismatch when the backend lands surfaces at the Zod boundary (the intended failure). When the
backend declares response models: run `gen:contracts`, switch the `contracts/index.ts` barrel to the
generated schemas, and DELETE each provisional file it replaces. Does NOT supersede FFE-004 — it
time-boxes an exception to it. Backend: FIN-156, FIN-157.
Resolved 2026-07-15 (FIN-149): FIN-159 shipped a real typed `openapi.json` (response models on
every 200) + `docs/api/CONTRACT.md`. `contracts/_generated/schemas.ts` is now generated from it and
the `provisional/` schemas are DELETED — the FFE-004 mechanism is live. The one remaining
hand-authored contract is `contracts/error.ts` (the `{detail}` envelope isn't an OpenAPI component).
The exception this decision opened is closed.

## FFE-009 — Monochrome, wordmark-derived FININT brand (no invented pictorial mark)
Status: LOCKED
Date: 2026-07-15
Decision: The apex "Delta" pictorial mark is DROPPED (not reskinned). The FININT brand is a
monochrome, wordmark-derived lockup: a `Wordmark` ("FININT", JetBrains Mono 600, +0.16em) plus a
`BrandMark` "F" monogram tile for tight/compact contexts (collapsed sidebar, favicon). No accent
colour anywhere in the mark.
Rationale: Confirmed with Udit during FIN-158 (chose "wordmark-only for now"). Colour must never
encode branding (CLAUDE.md law 8 / DESIGN §12) — it is reserved for state/signal — so the mark
carries no accent. A proper pictorial mark, if ever wanted, is a later design decision that does not
block the build.
Consequences: `design-system/brand` exports `Wordmark` / `BrandMark` / `BrandLockup` only. A future
pictorial mark supersedes this with a new FFE + a design pass.
