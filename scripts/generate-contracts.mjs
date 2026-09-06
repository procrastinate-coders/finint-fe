#!/usr/bin/env node
/**
 * FFE-004 — generate the Zod contract schemas from the FININT OpenAPI spec.
 * NEVER hand-write a schema under `_generated/`; run this instead. When the
 * backend changes a shape, regenerating turns that into a diff (and, where the
 * app imports the generated schema, a Zod-boundary/type error) rather than a
 * silent drift.
 *
 *   npm run gen:contracts
 *
 * Spec source resolution + the generation itself live in ./lib/contracts.mjs,
 * shared with `check:contracts` (FIN-218) so the drift guard regenerates exactly
 * what this writes. Spec order: FININT_OPENAPI_FILE → ../finint/docs/api/openapi.json
 * → ${VITE_FININT_API_BASE_URL}/openapi.json (live, needs FININT_BEARER).
 *
 * Output: `src/lib/api/contracts/_generated/{openapi.json,schemas.ts}` — the
 * committed contract. schemas.ts is schemas-only (the zodios client half is
 * stripped; the app uses its own apiRequest). The barrel re-exports with
 * app-friendly names.
 */
import { COMMITTED_DIR, emitContracts, resolveSpec } from './lib/contracts.mjs'

const { specText, source } = await resolveSpec()
console.log(`[gen:contracts] spec: ${source}`)
emitContracts(specText, COMMITTED_DIR)
console.log(`[gen:contracts] wrote ${COMMITTED_DIR}/{openapi.json,schemas.ts}`)
console.log(
  '[gen:contracts] the contracts barrel (contracts/index.ts) re-exports these' +
    ' with app-friendly names.',
)
