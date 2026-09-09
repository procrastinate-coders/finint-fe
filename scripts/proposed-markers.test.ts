import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * FIN-236 part 4 — THE PROPOSED-VS-OBSERVED TRIGGER.
 *
 * A comment that says "this shape is proposed, not observed" is correct on the
 * day it is written and silently wrong the day the backend ships it. That is not
 * hypothetical: two such markers in `features/agent-run/agent-run.test.tsx` went
 * stale-and-wrong in a single afternoon when the wide `board[]`, top-level
 * `ratios` and guard `claims[]` all landed at once. Nothing prompted a revisit,
 * because nothing was watching.
 *
 * So a marker now names the BACKEND ARTEFACT that would make it real:
 *
 *     PROPOSED-UNTIL: SomeSchemaName
 *
 * ...where `SomeSchemaName` is a key under `components.schemas` of the backend's
 * OpenAPI spec. This test asserts every such schema is ABSENT from the committed
 * spec. The moment the backend ships it, this test FAILS and says what to do.
 *
 * 🔑 It turns a comment nobody revisits into a build failure at exactly the right
 * moment, and it needs no cross-repo coordination — the spec is already shared.
 *
 * ============================================================================
 * ⚠️ THE HONEST LIMIT — this is a tripwire on ONE condition, not a freshness proof
 * ============================================================================
 * It catches exactly one thing: **the named schema now exists**. It does NOT catch
 *
 *   - a marker whose claim was ALWAYS WRONG (the shape was already real when the
 *     marker was written — the trigger has nothing to compare against);
 *   - a marker naming NO schema at all (prose like "not served yet" with no
 *     `PROPOSED-UNTIL:` line is invisible to this scan — that is precisely the
 *     form the two stale markers took, and the reason the convention exists);
 *   - a marker naming a schema that will never exist, or is misspelled — it stays
 *     green forever and is indistinguishable from a correct one;
 *   - a shape that changed WITHOUT a new schema name (a field added to an
 *     existing schema, a scale conversion like `premium_pct` fraction → points).
 *     FIN-218's contract check catches those; this does not.
 *
 * It is worth having because it costs one line per marker and fires at the only
 * moment anyone would otherwise miss. It is not a substitute for reading the
 * fixture headers when a payload lands.
 *
 * ⚠️ AND IT IS ONLY AS FRESH AS THE COMMITTED SPEC. It reads
 * `src/lib/api/contracts/_generated/openapi.json`, the FE's committed copy —
 * NOT the live backend. That copy is kept current by FIN-218's `check:contracts`,
 * which fails when it drifts from the backend's own `docs/api/openapi.json`. If
 * that check is ever removed, disabled, or left red, THIS TRIGGER GOES QUIET WITH
 * IT — it will keep reporting "not shipped yet" about schemas that shipped weeks
 * ago. The two run together or neither is trustworthy.
 */

const ROOT = process.cwd() // vitest runs from the package root
const SCANNED = [resolve(ROOT, 'src'), resolve(ROOT, 'scripts')]
const COMMITTED_SPEC = resolve(ROOT, 'src/lib/api/contracts/_generated/openapi.json')

/**
 * This file documents and matches the marker, so scanning it would find only
 * itself. It lives under `scripts/` beside FIN-218's `check-contracts.test.ts`
 * because that is the tsconfig project with node types — and because both are
 * repo-hygiene checks rather than product tests.
 */
const SELF = resolve(ROOT, 'scripts/proposed-markers.test.ts')

/**
 * The marker. Deliberately strict: an exact literal, a colon, and one schema
 * identifier. A loose pattern that matched prose would make every violation a
 * judgement call, and a trigger nobody trusts gets deleted.
 */
const MARKER = /PROPOSED-UNTIL:[ \t]*([A-Za-z][A-Za-z0-9_]*)/g

export interface ProposedMarker {
  file: string
  line: number
  schema: string
}

/** Every `PROPOSED-UNTIL:` marker under `dir`, excluding generated code. */
export function scanForMarkers(dir: string, skip: string[] = []): ProposedMarker[] {
  const out: ProposedMarker[] = []
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name)
      if (skip.includes(p)) continue
      if (statSync(p).isDirectory()) {
        if (name === '_generated' || name === 'node_modules') continue
        walk(p)
        continue
      }
      if (!/\.(ts|tsx)$/.test(p)) continue
      const lines: string[] = readFileSync(p, { encoding: 'utf8' }).split('\n')
      lines.forEach((text: string, i: number) => {
        for (const m of text.matchAll(MARKER)) {
          out.push({ file: relative(ROOT, p), line: i + 1, schema: m[1] })
        }
      })
    }
  }
  walk(dir)
  return out
}

/** The markers whose named schema HAS shipped — i.e. the ones that just went stale. */
export function firedMarkers(
  markers: ProposedMarker[],
  schemas: Set<string>,
): ProposedMarker[] {
  return markers.filter((m) => schemas.has(m.schema))
}

export function explain(fired: ProposedMarker[]): string {
  return fired
    .map(
      (m) =>
        `${m.file}:${m.line} — "${m.schema}" IS NOW IN THE COMMITTED SPEC. This is no ` +
        `longer proposed: verify the code and fixtures against the REAL shape, then ` +
        `delete the PROPOSED-UNTIL marker.`,
    )
    .join('\n')
}

function committedSchemas(): Set<string> {
  const spec = JSON.parse(readFileSync(COMMITTED_SPEC, 'utf8')) as {
    components?: { schemas?: Record<string, unknown> }
  }
  return new Set(Object.keys(spec.components?.schemas ?? {}))
}

// ============================================================================

describe('FIN-236 — the proposed-vs-observed trigger', () => {
  /**
   * ⚠️ WITHOUT THIS, EVERYTHING BELOW PASSES VACUOUSLY. If the spec failed to
   * load, or its shape changed, `committedSchemas()` would return an empty set
   * and no marker could ever fire. Assert the ground truth is real first.
   */
  it('reads a committed spec that actually has schemas in it', () => {
    const schemas = committedSchemas()
    expect(schemas.size).toBeGreaterThan(20)
    expect(schemas.has('AgentRunResponse')).toBe(true)
    expect(schemas.has('AgentRunBoardRow')).toBe(true)
  })

  /**
   * ⚠️ AND WITHOUT THIS, A BROKEN REGEX WOULD ALSO PASS VACUOUSLY — forever, and
   * silently, which is the exact failure mode the trigger exists to prevent.
   * Proven against a temp tree rather than against the repo, so removing the last
   * real marker never breaks the scanner's own test.
   */
  it('actually finds markers (the scanner is not silently matching nothing)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fin236-scan-'))
    mkdirSync(join(dir, 'nested'))
    writeFileSync(
      join(dir, 'nested', 'thing.ts'),
      ['// leading line', '/** PROPOSED-UNTIL: SomeFutureSchema — a note */', 'export const x = 1'].join('\n'),
    )
    writeFileSync(join(dir, 'unmarked.tsx'), 'export const y = 2\n')
    const found = scanForMarkers(dir)
    expect(found).toHaveLength(1)
    expect(found[0].schema).toBe('SomeFutureSchema')
    expect(found[0].line).toBe(2)
    rmSync(dir, { recursive: true, force: true })
  })

  /**
   * 🔴 THE TRIGGER. Every `PROPOSED-UNTIL:` marker in the tree must name a schema
   * the backend has NOT shipped. When one lands, this fails here.
   */
  it('every PROPOSED-UNTIL marker names a schema that has NOT shipped', () => {
    const markers = SCANNED.flatMap((d) => scanForMarkers(d, [SELF]))
    const fired = firedMarkers(markers, committedSchemas())
    expect(fired, `\n${explain(fired)}\n`).toEqual([])
  })
})

// ============================================================================
// ⚠️ THE BREAK-TEST — a trigger that has never fired is not a trigger
// ============================================================================
describe('FIN-236 — the trigger fires', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fin236-break-'))
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it('🔴 FAILS on a marker naming a schema that IS in the spec', () => {
    // `AgentRunBoardRow` shipped in FIN-228 Stream C. A marker still calling it
    // proposed is exactly the stale-and-wrong state this catches.
    writeFileSync(
      join(dir, 'stale.ts'),
      '/** the board is PROPOSED-UNTIL: AgentRunBoardRow lands */\nexport const z = 1\n',
    )
    const fired = firedMarkers(scanForMarkers(dir), committedSchemas())
    expect(fired).toHaveLength(1)
    expect(fired[0].schema).toBe('AgentRunBoardRow')

    // ...and the failure has to TELL you what to do, not just go red.
    const message = explain(fired)
    expect(message).toMatch(/IS NOW IN THE COMMITTED SPEC/)
    expect(message).toMatch(/no longer proposed/)
    expect(message).toMatch(/delete the PROPOSED-UNTIL marker/)
    expect(message).toMatch(/stale\.ts:1/)
  })

  it('stays green on a marker naming a schema that has not shipped', () => {
    writeFileSync(
      join(dir, 'fine.ts'),
      '/** PROPOSED-UNTIL: NoSuchSchemaExistsYet */\nexport const w = 1\n',
    )
    rmSync(join(dir, 'stale.ts'), { force: true })
    expect(firedMarkers(scanForMarkers(dir), committedSchemas())).toEqual([])
  })
})
