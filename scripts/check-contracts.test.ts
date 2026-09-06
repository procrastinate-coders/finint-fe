// Runs under the default jsdom env (the shared setup.ts needs DOM globals);
// Node built-ins below work regardless — vitest runs in Node.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * FIN-218 — prove the contract drift guard actually FIRES. A guard nobody has
 * seen fail is a guard you don't have. These run the real `check-contracts`
 * script end-to-end (it regenerates via openapi-zod-client and diffs), pointing
 * it at mutated copies of the committed spec via FININT_OPENAPI_FILE. The
 * committed contract is never touched — the check regenerates into its own temp.
 */
interface OpenApi {
  components: { schemas: Record<string, { properties: Record<string, unknown> }> }
}

const ROOT = process.cwd() // vitest runs from the package root
const SCRIPT = resolve(ROOT, 'scripts/check-contracts.mjs')
const COMMITTED_OPENAPI = resolve(
  ROOT,
  'src/lib/api/contracts/_generated/openapi.json',
)
const workdir = mkdtempSync(resolve(tmpdir(), 'fin218-'))
afterAll(() => rmSync(workdir, { recursive: true, force: true }))

function runCheck(opts: { specFile?: string; args?: string[] } = {}): {
  code: number
  output: string
} {
  try {
    const out = execFileSync('node', [SCRIPT, ...(opts.args ?? [])], {
      env: { ...process.env, FININT_OPENAPI_FILE: opts.specFile ?? '' },
      stdio: 'pipe',
      encoding: 'utf8',
    })
    return { code: 0, output: out }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

/** Write a mutated copy of the committed spec to the temp dir; return its path. */
function specWith(name: string, mutate: (spec: OpenApi) => void): string {
  const spec = JSON.parse(readFileSync(COMMITTED_OPENAPI, 'utf8')) as OpenApi
  mutate(spec)
  const p = resolve(workdir, `${name}.json`)
  writeFileSync(p, JSON.stringify(spec, null, 2))
  return p
}

describe('FIN-218 — the contract drift guard fires', () => {
  it('PASSES when the spec matches the committed contract', () => {
    // the committed openapi.json is exactly what schemas.ts was generated from —
    // this also proves the generator is deterministic (a fresh regen reproduces it)
    const r = runCheck({ specFile: COMMITTED_OPENAPI })
    expect(r.code).toBe(0)
    expect(r.output).toMatch(/OK/)
  }, 60_000)

  it('⚠️ BREAK-TEST: an ADDED field the contract was not regenerated for FAILS', () => {
    const spec = specWith('added-field', (s) => {
      s.components.schemas.MacroRow.properties.brand_new_field = {
        anyOf: [{ type: 'string' }, { type: 'null' }],
      }
    })
    const r = runCheck({ specFile: spec })
    expect(r.code).toBe(1)
    expect(r.output).toMatch(/DRIFT/i)
    expect(r.output).toMatch(/gen:contracts/)
  }, 60_000)

  it('⚠️ a RENAMED field FAILS (the cot_stance case a naive additive diff misses)', () => {
    const spec = specWith('renamed-field', (s) => {
      const props = s.components.schemas.ServedPositioning.properties
      props.cot_stance = props.cot_stance_label // rename back to the retired name
      delete props.cot_stance_label
    })
    const r = runCheck({ specFile: spec })
    expect(r.code).toBe(1)
    expect(r.output).toMatch(/DRIFT/i)
  }, 60_000)

  it('--self PASSES on the committed repo (schemas.ts matches its openapi.json copy)', () => {
    const r = runCheck({ args: ['--self'] })
    expect(r.code).toBe(0)
    expect(r.output).toMatch(/OK/)
  }, 60_000)
})
