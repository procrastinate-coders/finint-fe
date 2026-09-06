/**
 * Shared contract-generation core (FFE-004 / FIN-218). Both `gen:contracts`
 * (writes the committed contract) and `check:contracts` (regenerates into a temp
 * dir and diffs) call this, so the two can never disagree about HOW the contract
 * is produced — the check regenerates exactly what the generator would write.
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

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = resolve(HERE, '../..')
export const COMMITTED_DIR = resolve(ROOT, 'src/lib/api/contracts/_generated')
const SIBLING_SPEC = resolve(ROOT, '../finint/docs/api/openapi.json')

// The schemas.ts banner — MUST be reproduced byte-for-byte so a fresh generation
// equals the committed file. Keep in sync with nothing else; this is the source.
const HEADER = `/* eslint-disable */
/**
 * GENERATED from /openapi.json by \`npm run gen:contracts\` (FFE-004). DO NOT EDIT.
 * Schemas-only (the zodios client half is stripped — the app uses its own
 * apiRequest). Import via the contracts barrel, never from here directly.
 */
`

/**
 * Resolve the backend OpenAPI spec. FAIL-CLOSED: if none resolves it THROWS — a
 * check that silently skips when it can't find the spec is the drift bug restated.
 * Order (first that resolves wins):
 *   1. FININT_OPENAPI_FILE  — an explicit local path
 *   2. ../finint/docs/api/openapi.json — the committed backend spec (dev + CI)
 *   3. ${VITE_FININT_API_BASE_URL}/openapi.json — the live API (needs FININT_BEARER)
 */
export async function resolveSpec() {
  if (process.env.FININT_OPENAPI_FILE) {
    const p = resolve(process.env.FININT_OPENAPI_FILE)
    return { specText: readFileSync(p, 'utf8'), source: `FININT_OPENAPI_FILE (${p})` }
  }
  if (existsSync(SIBLING_SPEC)) {
    return {
      specText: readFileSync(SIBLING_SPEC, 'utf8'),
      source: `committed backend spec (${SIBLING_SPEC})`,
    }
  }
  const base = (
    process.env.VITE_FININT_API_BASE_URL ?? 'https://apifinint.apextrader.trade'
  ).replace(/\/$/, '')
  const url = `${base}/openapi.json`
  const headers = {}
  if (process.env.FININT_BEARER) {
    headers.Authorization = `Bearer ${process.env.FININT_BEARER}`
  }
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(
      `could not resolve the backend spec (${res.status} ${res.statusText} from ${url}). ` +
        `Set FININT_OPENAPI_FILE, check out ../finint, or set FININT_BEARER for the ` +
        `JWT-guarded live spec.`,
    )
  }
  return { specText: await res.text(), source: `live API (${url})` }
}

/**
 * Emit the contract (openapi.json copy + schemas.ts) into `outDir`. Deterministic
 * for a given spec — same spec in, byte-identical files out. Returns the texts.
 * Throws on any generator failure (never writes a partial/guessed contract).
 */
export function emitContracts(specText, outDir) {
  mkdirSync(outDir, { recursive: true })
  const specOut = resolve(outDir, 'openapi.json')
  const rawOut = resolve(outDir, '.client.raw.ts')
  const schemasOut = resolve(outDir, 'schemas.ts')

  writeFileSync(specOut, specText)

  const gen = spawnSync(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['openapi-zod-client', specOut, '-o', rawOut, '--export-schemas'],
    { stdio: ['ignore', 'ignore', 'inherit'], cwd: ROOT },
  )
  if (gen.status !== 0) {
    throw new Error(`openapi-zod-client exited ${gen.status ?? '(signal)'}`)
  }

  // Transform → schemas-only: drop the @zodios/core import and everything from
  // `const endpoints = makeApi(` onward (the client half we don't ship).
  let code = readFileSync(rawOut, 'utf8')
  code = code.replace(/^import \{[^}]*\} from ['"]@zodios\/core['"]\r?\n/m, '')
  const cut = code.indexOf('const endpoints = makeApi(')
  if (cut === -1) {
    rmSync(rawOut, { force: true })
    throw new Error(
      'could not find the endpoints boundary — openapi-zod-client output changed; ' +
        'inspect the generator transform.',
    )
  }
  code = code.slice(0, cut).replace(/\n+$/, '\n')

  const schemasText = HEADER + code
  writeFileSync(schemasOut, schemasText)
  rmSync(rawOut, { force: true })
  return { specText, schemasText }
}
