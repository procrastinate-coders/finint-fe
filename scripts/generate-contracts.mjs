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
 * Spec source (first that resolves wins):
 *   1. FININT_OPENAPI_FILE      an explicit local path to an openapi.json
 *   2. ../finint/docs/api/openapi.json   the FIN-159 committed spec (default)
 *   3. ${VITE_FININT_API_BASE_URL}/openapi.json   the live API (needs a token —
 *      set FININT_BEARER="<access_token>" ; the API is JWT-guarded, not basic-auth)
 *
 * Output: `src/lib/api/contracts/_generated/schemas.ts` — a SCHEMAS-ONLY module
 * (pure zod, no zodios/axios). openapi-zod-client emits a full zodios client;
 * we keep only the schema consts + the `schemas` export so the app bundle never
 * pulls a second HTTP client (we have our own `apiRequest`).
 */
import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'src/lib/api/contracts/_generated')
const SPEC_OUT = resolve(OUT_DIR, 'openapi.json')
const RAW_OUT = resolve(OUT_DIR, '.client.raw.ts')
const SCHEMAS_OUT = resolve(OUT_DIR, 'schemas.ts')

const SIBLING_SPEC = resolve(ROOT, '../finint/docs/api/openapi.json')

mkdirSync(OUT_DIR, { recursive: true })

// 1. Resolve the spec into OUT_DIR/openapi.json (committed for provenance).
async function loadSpec() {
  if (process.env.FININT_OPENAPI_FILE) {
    const p = resolve(process.env.FININT_OPENAPI_FILE)
    console.log(`[gen:contracts] using FININT_OPENAPI_FILE: ${p}`)
    return readFileSync(p, 'utf8')
  }
  if (existsSync(SIBLING_SPEC)) {
    console.log(`[gen:contracts] using committed spec: ${SIBLING_SPEC}`)
    return readFileSync(SIBLING_SPEC, 'utf8')
  }
  const base = (
    process.env.VITE_FININT_API_BASE_URL ?? 'https://apifinint.apextrader.trade'
  ).replace(/\/$/, '')
  const url = `${base}/openapi.json`
  console.log(`[gen:contracts] fetching live spec: ${url}`)
  const headers = {}
  if (process.env.FININT_BEARER) {
    headers.Authorization = `Bearer ${process.env.FININT_BEARER}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) {
    console.error(
      `[gen:contracts] ${res.status} ${res.statusText} — the spec is JWT-guarded;` +
        ` set FININT_BEARER="<access_token>", or run against the committed` +
        ` ../finint/docs/api/openapi.json.`,
    )
    process.exit(1)
  }
  return await res.text()
}

const specText = await loadSpec()
writeFileSync(SPEC_OUT, specText)

// 2. Generate the (zodios) client to a temp file.
const gen = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['openapi-zod-client', SPEC_OUT, '-o', RAW_OUT, '--export-schemas'],
  { stdio: 'inherit', cwd: ROOT },
)
if (gen.status !== 0) process.exit(gen.status ?? 1)

// 3. Transform → schemas-only. Drop the @zodios/core import and everything from
//    `const endpoints = makeApi(` onward (the client half). Keep the zod schema
//    consts + `export const schemas = {…}`.
let code = readFileSync(RAW_OUT, 'utf8')
code = code.replace(/^import \{[^}]*\} from ['"]@zodios\/core['"]\r?\n/m, '')
const cut = code.indexOf('const endpoints = makeApi(')
if (cut === -1) {
  console.error(
    '[gen:contracts] could not find the endpoints boundary — the generator' +
      ' output changed. Inspect ' +
      RAW_OUT +
      ' before trusting the transform.',
  )
  process.exit(1)
}
code = code.slice(0, cut).replace(/\n+$/, '\n')

const header = `/* eslint-disable */
/**
 * GENERATED from /openapi.json by \`npm run gen:contracts\` (FFE-004). DO NOT EDIT.
 * Schemas-only (the zodios client half is stripped — the app uses its own
 * apiRequest). Import via the contracts barrel, never from here directly.
 */
`
writeFileSync(SCHEMAS_OUT, header + code)
rmSync(RAW_OUT, { force: true })

console.log(`[gen:contracts] wrote ${SCHEMAS_OUT}`)
console.log(
  '[gen:contracts] the contracts barrel (contracts/index.ts) re-exports these' +
    ' with app-friendly names.',
)
