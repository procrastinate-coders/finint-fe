#!/usr/bin/env node
/**
 * FFE-004 — generate the Zod contract schemas from the live OpenAPI spec.
 * NEVER hand-write a schema under `_generated/`; run this instead. When the
 * backend changes a shape, regenerating turns that into a diff (and, once the
 * app imports the generated types, a build error) rather than a silent drift.
 *
 *   npm run gen:contracts
 *
 * Env:
 *   VITE_FININT_API_BASE_URL   base URL of the FastAPI backend
 *                              (default: https://apifinint.apextrader.trade)
 *   FININT_BASIC_AUTH          "user:pass" for the nginx basic-auth gate that
 *                              currently fronts the API (removed when FIN-157's
 *                              JWT ships — the two can't coexist on the same
 *                              Authorization header).
 *
 * ── FFE-008 CAVEAT (read this) ─────────────────────────────────────────────
 * As of the scaffold, the backend endpoints return raw dicts with NO FastAPI
 * `response_model=`, so every response serialises in the spec as `schema: {}`
 * — there is nothing to generate for /readiness, /brief, /generate, and the
 * /auth/* endpoints (FIN-157) don't exist yet. Until the backend declares its
 * response models, the app reads hand-authored PROVISIONAL schemas under
 * `contracts/provisional/` (tracked by FFE-008). Re-run this the moment the
 * backend types its responses, then delete the provisional files it replaces.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'src/lib/api/contracts/_generated')
const SPEC_TMP = resolve(OUT_DIR, 'openapi.json')
const OUT_FILE = resolve(OUT_DIR, 'client.ts')

const base = (
  process.env.VITE_FININT_API_BASE_URL ?? 'https://apifinint.apextrader.trade'
).replace(/\/$/, '')
const specUrl = `${base}/openapi.json`

const headers = {}
if (process.env.FININT_BASIC_AUTH) {
  headers.Authorization = `Basic ${Buffer.from(process.env.FININT_BASIC_AUTH).toString('base64')}`
}

console.log(`[gen:contracts] fetching ${specUrl}`)

const res = await fetch(specUrl, { headers }).catch((err) => {
  console.error(`[gen:contracts] network error: ${err.message}`)
  process.exit(1)
})
if (!res.ok) {
  console.error(
    `[gen:contracts] ${res.status} ${res.statusText} — the API is likely still` +
      ` behind nginx basic auth. Set FININT_BASIC_AUTH="user:pass" and retry.`,
  )
  process.exit(1)
}

const spec = await res.json()
mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(SPEC_TMP, JSON.stringify(spec, null, 2))

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['openapi-zod-client', SPEC_TMP, '-o', OUT_FILE, '--export-schemas'],
  { stdio: 'inherit', cwd: ROOT },
)
if (result.status !== 0) process.exit(result.status ?? 1)

console.log(`[gen:contracts] wrote ${OUT_FILE}`)
console.log(
  '[gen:contracts] NOTE (FFE-008): endpoints without a backend response_model' +
    ' generate empty schemas — the app still reads contracts/provisional/*' +
    ' until the backend types its responses.',
)
