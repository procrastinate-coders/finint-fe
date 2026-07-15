# finint-fe

The **frontend** for FININT — a private, read-only **pre-market intelligence** system for the MCX
board. It renders the morning brief (readiness → generate → the layered brief) computed by the
backend (`procrastinate-coders/finint`, FastAPI at `https://apifinint.apextrader.trade`).

It wears apex-admin's **Liquid Glass** skin (frosted chrome, flat signal-pure data) as a **separate,
independent app** — same skin, own copy (FFE-003).

> **It is READ-ONLY.** It never buys or sells and never tells anyone to. It frames the morning;
> Father decides. Read [`CLAUDE.md`](CLAUDE.md) before touching anything — it is law.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173 — MSW mocks are ON by default in dev
```

Log in with any email + any password (the mock accepts them; password `wrong-password` forces the
error path). Set `VITE_API_MOCK=0` in `.env.local` to hit the live backend instead.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server (mocks on unless `VITE_API_MOCK=0`) |
| `npm run build` | `tsr generate && tsc -b && vite build` → static `dist/` (Vercel) |
| `npm run typecheck` | Route-tree gen + `tsc -b` |
| `npm run lint` | ESLint (incl. the layer-boundary + number-format guards) |
| `npm test` | Vitest + RTL + MSW |
| `npm run gen:contracts` | Generate Zod schemas from `/openapi.json` (FFE-004; see FFE-008) |

## The docs that are law

- [`CLAUDE.md`](CLAUDE.md) — the laws (never fabricate · no buy/sell language · six-colour lock · …).
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — what EXISTS (kept current).
- [`DECISIONS.md`](DECISIONS.md) — `FFE-NNN` decision records.
- [`CONTEXT.md`](CONTEXT.md) — session handoff; read FIRST each session.

## Stack

Vite 8 · React 19 · TypeScript 6 · Tailwind v4 · shadcn/ui · TanStack Router + Query · Zod v4 ·
ESLint 10 flat + Prettier · Vitest 4 + RTL + MSW 2. Static SPA → **Vercel** (no server — FFE-005).
