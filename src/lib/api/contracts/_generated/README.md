# `_generated/` — DO NOT hand-edit (FFE-004)

`schemas.ts` is generated from the FININT OpenAPI spec and committed (so CI builds
without a network round-trip). Regenerate it — never hand-edit it — with:

```bash
npm run gen:contracts
```

By default this reads the FIN-159 committed spec at `../finint/docs/api/openapi.json`.
Point it elsewhere with `FININT_OPENAPI_FILE=<path>`, or at the live (JWT-guarded)
API with `FININT_BEARER=<access_token>`.

## What's here

- `openapi.json` — the exact spec `schemas.ts` was generated from (provenance).
- `schemas.ts` — **schemas only** (pure zod). openapi-zod-client emits a full zodios
  client; `scripts/generate-contracts.mjs` strips the client half so the app bundle
  never pulls a second HTTP client (we have our own `apiRequest`). Import these via the
  `../index.ts` barrel with app-friendly names — never from here directly.

A backend shape change → regenerate → the diff (and, where a schema is consumed, a
Zod-boundary/type error) surfaces it. That is the whole point of FFE-004: the earlier
hand-authored `provisional/` schemas are gone now that real generated ones exist.
