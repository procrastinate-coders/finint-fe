# `_generated/` — DO NOT hand-edit (FFE-004)

Zod schemas here are generated from the live OpenAPI spec by:

```bash
npm run gen:contracts        # needs the API reachable; set FININT_BASIC_AUTH if gated
```

Never hand-write or patch a schema in this directory. A backend shape change is
fixed in the backend (a FININT Linear ticket), then regenerated here — that is
what turns drift into a visible diff/error instead of a silent `undefined`.

## Why this is empty right now (FFE-008)

As of the scaffold the backend endpoints return raw dicts with **no FastAPI
`response_model=`**, so every response serialises in the spec as `schema: {}` —
there is nothing to generate for `/readiness`, `/brief`, `/generate`, and the
`/auth/*` endpoints (FIN-157) don't exist yet. Until the backend declares its
response models, the app reads the hand-authored **PROVISIONAL** schemas in
`../provisional/` (tracked by FFE-008). The moment the backend types its
responses: run `gen:contracts`, switch the barrel over, and delete the
provisional files it replaces.
