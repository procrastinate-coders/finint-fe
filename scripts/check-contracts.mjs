#!/usr/bin/env node
/**
 * FIN-218 — the contract drift guard. Regenerate the Zod contract and compare it
 * to the committed one; ANY difference is drift and FAILS. The FE zod is
 * .passthrough() (correct at runtime — a backend addition must never crash the
 * app), which is exactly why silent drift is possible: an unknown field is
 * dropped and a removed field reads undefined, both indistinguishable from "not
 * sent". This check is the equality half that makes those impossible by
 * construction (openapi + zod are mechanically derivable from the spec, so
 * "regenerate and compare" needs no declaration registry — cf. FIN-221).
 *
 * TWO MODES:
 *   default   — FRESHNESS: regenerate from the BACKEND spec (resolveSpec) and diff
 *               the committed openapi.json + schemas.ts. Catches the copy going
 *               stale vs the backend (the cot_stance rename, the oi_gap_sessions
 *               case). FAIL-CLOSED: if the backend spec can't be resolved, it
 *               fails — it never passes by being unable to check. Runs in CI (with
 *               ../finint checked out) and locally (sibling present).
 *   --self    — SELF-CONSISTENCY: regenerate schemas.ts FROM the committed
 *               openapi.json copy and diff schemas.ts. No backend dependency, so
 *               it runs everywhere (wired into `prebuild` → every build + Vercel
 *               deploy). Catches a hand-edited schema or an openapi copy changed
 *               without regenerating.
 *
 * The fix for a failure is always: `npm run gen:contracts` and commit the result.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { COMMITTED_DIR, emitContracts, resolveSpec } from './lib/contracts.mjs'

const SELF = process.argv.includes('--self')
const committedSpec = readFileSync(resolve(COMMITTED_DIR, 'openapi.json'), 'utf8')
const committedSchemas = readFileSync(resolve(COMMITTED_DIR, 'schemas.ts'), 'utf8')

let specText
let source
if (SELF) {
  specText = committedSpec
  source = 'the committed openapi.json copy (self-consistency)'
} else {
  try {
    ;({ specText, source } = await resolveSpec())
  } catch (err) {
    fail(`could not resolve the backend spec to check against — the guard cannot
  verify, so it fails (never passes blind).\n  ${err.message}`)
  }
}

const tmp = mkdtempSync(resolve(tmpdir(), 'finint-contracts-'))
let fresh
try {
  fresh = emitContracts(specText, tmp)
} catch (err) {
  rmSync(tmp, { recursive: true, force: true })
  fail(`regeneration failed: ${err.message}`)
}
rmSync(tmp, { recursive: true, force: true })

const problems = []
// FRESHNESS only: the committed provenance copy must match the backend spec
// (structural — key/field equality, formatting-agnostic).
if (!SELF && !openapiEqual(specText, committedSpec)) {
  problems.push(
    'src/lib/api/contracts/_generated/openapi.json is stale vs the backend spec ' +
      '(fields added/removed/renamed on the backend, not pulled into the FE copy)',
  )
}
// BOTH modes: schemas.ts must equal a fresh generation (byte-exact after newline
// normalisation — the generator is deterministic). A RENAME shows up here too,
// which an additive-only diff would miss (the cot_stance → cot_stance_label case).
if (normalize(fresh.schemasText) !== normalize(committedSchemas)) {
  problems.push(
    'src/lib/api/contracts/_generated/schemas.ts does not match a fresh generation',
  )
}

if (problems.length > 0) {
  fail(
    `contract DRIFT — checked against ${source}:\n` +
      problems.map((p) => `  ✗ ${p}`).join('\n') +
      `\n\nThe committed FE contract no longer matches the spec. Regenerate and commit:\n` +
      `    npm run gen:contracts\n` +
      `then commit src/lib/api/contracts/_generated/. (FIN-218)`,
  )
}

console.log(
  `[check:contracts] OK — the committed contract matches ${source}.`,
)

// --- helpers ---------------------------------------------------------------

function normalize(text) {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n+$/, '\n')
}

/** Structural (order-independent) equality of two OpenAPI JSON texts. */
function openapiEqual(a, b) {
  try {
    return canonical(JSON.parse(a)) === canonical(JSON.parse(b))
  } catch {
    return normalize(a) === normalize(b)
  }
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

function fail(message) {
  console.error(`[check:contracts] ${message}`)
  process.exit(1)
}
