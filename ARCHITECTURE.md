# ARCHITECTURE.md — finint-fe

> Living document. Describes what **EXISTS**, not what is planned. Updated whenever the
> architecture changes. Never aspirational.

**Last updated:** 2026-07-16 — **FIN-160 has landed** (the readiness screen at `/`, stale-gated
on-land refresh, and the Kite modal), on top of FIN-149 (auth + shell) and FIN-158 (scaffold).
This describes what EXISTS: the tooling, the ported skin + design-system, the formatter, the
session + api client (single-flight refresh + `ensureAccessToken` rehydrate), the login flow +
route guard, the readiness screen + refresh/kite flows, MSW for every endpoint, the Vercel config.
Still to come: generate (FIN-161) + the brief surface (FIN-162). Contracts are GENERATED from
FIN-159's `/openapi.json` (FFE-004); the earlier PROVISIONAL schemas are deleted (FFE-008 retired).

---

## Overview

A client-side React SPA (Vite 8 + React 19) that talks to the separate Python/FastAPI backend
(`procrastinate-coders/finint`) over CORS with a client-held FININT JWT. No server, no SSR —
ships as static files to **Vercel**. It renders the pre-market brief: readiness, generate, and
the layered brief surface.

It wears the same **"Liquid Glass" (visionOS Frosted)** language as `apex-admin` (FE-013):
frosted floating **chrome**; flat, signal-pure **data**. The design tokens and the
`design-system/` tier are **ported** from apex-admin — same skin, separate app, no shared package.

**Independence is the point.** finint-fe does not import from apex-admin, does not share its
auth, and is not blocked by its release cycle.

---

## The backend it talks to

`https://apifinint.apextrader.trade` — FastAPI, bare paths (no `/api` prefix; the API is on its
own host so there is nothing to collide with). Contract: `/openapi.json` (live).

| Endpoint | Purpose |
|---|---|
| `POST /auth/login` | email + password → access (15m) + refresh (30d) |
| `POST /auth/refresh` | refresh token → new access token (refresh NOT rotated) |
| `POST /auth/logout` | revoke the refresh token |
| `GET /auth/me` | current user — rehydrates the shell |
| `GET /readiness` | the 8-source health gate + `can_generate` + `blocked_reason` |
| `POST /refresh` | trigger `refresh_spine` (macro + COT + news + token status) |
| `GET /kite/login-url` | the Kite login URL (api_key stays on the backend) |
| `POST /kite/refresh` | `{request_token}` → writes the daily Kite token |
| `POST /generate` | run the brief (**paid** — LLM calls, ~$0.06, can take minutes) |
| `GET /generate/status` | 4-step progress poll |
| `GET /brief/today` | the brief (market layer + scan board + instrument cards) |
| `GET /brief/{date}` | a historical brief |
| `GET /briefs` | the list |

`/auth/login` and `/auth/refresh` are the **only** unauthenticated endpoints.

---

## Repo structure (as built — mirrors apex-admin)

```
src/
├── main.tsx                  # entry; MSW mock bootstrap (ON in dev unless VITE_API_MOCK=0)
├── app/                      # composition root
│   ├── providers.tsx         # QueryClientProvider > ThemeProvider > AuthProvider > RouterProvider
│   ├── router.tsx            # createRouter + type Register + staticData(title) augmentation
│   ├── query-client.ts       # singleton QueryClient
│   └── theme.tsx             # class-based, default dark (finint.theme)
├── routes/                   # file-based routes → routeTree.gen.ts (generated)
│   ├── __root.tsx            # root w/ { queryClient } context
│   ├── login.tsx             # public; redirects to / if already authed
│   ├── kite.callback.tsx     # PUBLIC-ish: reads ?request_token (PLACEHOLDER — FIN-149 Ph2)
│   └── _authenticated.tsx    # beforeLoad gate → /login; renders AppShell + <Outlet/>
│       └── _authenticated/   # index.tsx (ReadinessScreen) · dev.components.tsx (DEV-only)
├── design-system/            # ported from apex-admin (same skin, own copy — FFE-003)
│   ├── index.ts              # public barrel (re-exports components/finint data primitives)
│   ├── material/             # Glass (the one chrome primitive) + Glass.preview
│   ├── brand/                # Wordmark / BrandMark / BrandLockup (monochrome — FFE-009)
│   ├── motion/               # duration/easing tokens (no useFlash — no live feed, FFE-007)
│   └── preview/              # registry + PreviewGallery (DEV-only)
├── lib/
│   ├── api/
│   │   ├── client.ts         # fetch wrapper: bearer, 401 single-flight refresh + retry, ApiError
│   │   ├── contracts/
│   │   │   ├── _generated/   # Zod GENERATED from /openapi.json (FFE-004): schemas.ts (zodios stripped) + openapi.json
│   │   │   ├── error.ts      # the ONE hand-authored contract: the {detail} envelope (not an OpenAPI component)
│   │   │   └── index.ts      # barrel — re-exports generated schemas with app-friendly names + error
│   │   └── endpoints.ts      # login/logout/getMe/getReadiness/refreshSpine/kite*/generate*/getBrief*
│   ├── auth/                 # session.ts (memory access + localStorage refresh) + auth-context (AuthProvider/useAuth)
│   ├── query/                # createQueryClient + useMe/useReadiness/useRefreshSpine/useKite* hooks
│   ├── format/               # THE formatter (number.ts: Intl 'en-IN' + pct; time.ts: IST) — null → "—"
│   └── utils.ts              # cn()
├── components/
│   ├── ui/                   # shadcn primitives, owned (button · input · label · sonner)
│   ├── finint/               # flat, signal-pure DATA primitives (Skeleton · IstClock · StatusDot · SourceRow)
│   ├── layout/               # AppShell · Sidebar · Header (the glass shell) + Aura
│   └── common/               # ScreenState (loading-skeleton / error / empty)
├── features/
│   ├── auth/                 # LoginForm (email + generic error)
│   └── readiness/            # ReadinessScreen · on-land (stale rule + guard) · refresh-summary +
│                             #   RefreshReport · KiteRefreshModal + request-token (kite co-located here)
├── styles/                   # tokens.css (ported --apex-*) · (index.css lives at src/index.css: @theme + glass CSS)
└── test/                     # setup.ts + mocks/ (MSW handlers + fixtures; readiness fixture is CONTEXT.md verbatim)
```

## Layers (lint-enforced boundary)

`features/* → design-system (→ components/{finint,layout,common}) → components/ui → lib/*`.
Imports point downward only; features never import each other. Enforced by
`no-restricted-imports` in `eslint.config.js`.

---

## Data + auth flow

1. A screen calls a TanStack Query hook (`useReadiness`, `useBrief`).
2. The hook calls a typed endpoint fn → `apiRequest()`.
3. `apiRequest` attaches the bearer token; on `401` it runs a **single-flight** `/auth/refresh`
   and retries **once**; on terminal failure it clears the session and routes to `/login`.
4. The response is **Zod-parsed at the boundary** — drift fails loudly.
5. **Access token in memory only**; refresh token in `localStorage` (`finint.refresh_token`).
   The user IDENTITY is NOT stored — `POST /auth/login` returns only tokens, so the shell reads
   identity from `GET /auth/me` (`useMe`). On a hard reload the memory-only access token is gone, so
   `_authenticated`'s `beforeLoad` runs `ensureAccessToken()` (refresh → mint) BEFORE rendering —
   rehydrate. No refresh token, or refresh 401s → `/login`.

**No WebSocket.** FININT is a pre-open read, not a live feed. Polling only where meaningful
(`/generate/status` during a run). Do not add a tick stream.

---

## The landing behaviour (on-land auto-refresh)

Landing calls `GET /readiness`. **If a source is actually stale**, the app fires `POST /refresh`
once, then re-reads readiness.

⚠️ **It must NOT refresh on every mount.** GNews' free tier is **100 requests/day** and each
`refresh_spine` burns ~6 queries → ~16 refreshes exhaust the day. React StrictMode double-mounts
in dev. The backend has a concurrency guard (returns `already_running`), but the FE must not
lean on it. Refresh **only when stale**.

---

## The four states (the shape of the whole app)

1. **Readiness** — the 8-source panel. Green/amber/red per source, `critical` tags, notes, CTAs
   where `human_refreshable`. `can_generate` gates the button; `blocked_reason` explains a lock.
2. **Kite refresh** — the modal: `GET /kite/login-url` → open → login → `request_token` →
   `POST /kite/refresh`. (Or the `/kite/callback` route handles it automatically once the Kite
   console redirect is flipped — that flip is LAST and one-way.)
3. **Generating** — `POST /generate` → poll `GET /generate/status` (4 steps). **Paid.**
4. **The Brief** — market layer (session read, backdrop w/ provenance, risk tone, headline,
   regime flag, catalysts **with source URLs**, cross-instrument) + the **scan board (all 9 mains)**
   + per-instrument cards.

---

## Styling

Tailwind v4 (CSS-first, `@tailwindcss/vite`). `src/styles/tokens.css` carries the `--apex-*`
tokens **ported from apex-admin** (light `:root`, dark `.dark`) plus the `--apex-glass-*` /
`--apex-elev-*` tokens. `src/styles/index.css` maps shadcn's semantic tokens onto them, exposes
`--color-apex-*` via `@theme inline`, and defines the glass/aura + skeleton-shimmer CSS inside
`@layer components`. Fonts (Inter + JetBrains Mono) self-hosted via Fontsource.

**Numbers are formatted by `lib/format/`** using `Intl.NumberFormat('en-IN')` — Indian grouping
(₹1,47,889). This is the one place apex-admin's "render, never recompute" law does **not** apply;
see CLAUDE.md §3 and FFE-002.

---

## Tooling

Vite 8 (`@vitejs/plugin-react-swc`) · TanStack Router (file-based) / Query v5 · Zod v4 ·
ESLint 10 flat + Prettier · Vitest 4 + RTL + MSW 2 · TypeScript 6 · Node 22.
CI runs typecheck → lint → test → build on PRs.

---

## Deployment

Static build → **Vercel**. No Node runtime in production.

⚠️ **`vercel.json` SPA rewrite is REQUIRED:**
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
TanStack Router is client-side. Without it every deep link 404s — including `/kite/callback`,
which is exactly where Kite redirects. The failure is silent until the callback flow is tested.

`VITE_FININT_API_BASE_URL` points the client at the API
(`https://apifinint.apextrader.trade`; `http://localhost:8000` in dev).

**Domain cutover (not yet done):** `finint.apextrader.trade` currently A-records to EC2, which
returns `444` (an explicit reject — without it nginx falls back to the first server block and
would serve the API there). At cutover it becomes a **CNAME → Vercel**.
