import type { AgentRunBoardRow, AgentRunResponse } from '@/lib/api/contracts'
import type { AnalystReport, AnalystSpec } from './report-shape'

/**
 * The verdict band's arithmetic — the page's way in.
 *
 * ⚠️ STRUCTURED FIELDS ONLY. Every number here is counted off a typed field:
 * `implied_open_span_days`, `usdinr_span_days`, `refused[]`, the PRESENCE of a
 * `divergence` field, `guard.decisions`, `gate`. Nothing is parsed, matched or
 * inferred out of an agent's prose — that is the FIN-197 anti-pattern, removed
 * once and not to be reintroduced because a band is a convenient place for it.
 *
 * Kept pure and separate from rendering so the counting can be tested against
 * real payloads without mounting anything.
 */

/** Why one instrument is worth looking at before the others. */
export interface InstrumentFlags {
  /** `implied_open_span_days > 1` — the move is not overnight. */
  span: boolean
  /** `usdinr_span_days > 1` — the rupee leg spans the same gap. */
  fx: boolean
  /** The positioning analyst wrote a `divergence` field for this instrument. */
  divergence: boolean
}

export function flagsFor(
  board: AgentRunBoardRow[],
  positioning: AnalystReport | undefined,
): Map<string, InstrumentFlags> {
  const out = new Map<string, InstrumentFlags>()
  for (const b of board) {
    if (!b.instrument) continue
    out.set(b.instrument, {
      span: (b.implied_open_span_days ?? 0) > 1,
      fx: (b.usdinr_span_days ?? 0) > 1,
      divergence: false,
    })
  }
  // ⚠️ The PRESENCE of the field is the signal, not its wording. Reading the
  // sentence to decide whether it "counts" would be inference.
  for (const ins of positioning?.instruments ?? []) {
    const f = out.get(ins.instrument)
    if (f && typeof ins.divergence === 'string' && ins.divergence) f.divergence = true
  }
  return out
}

export interface DeclineCause {
  field: string
  count: number
}

/** Every `refused[]` entry across every analyst, grouped by field name. */
export function declineCauses(
  reports: Array<{ report: AnalystReport }>,
): DeclineCause[] {
  const counts = new Map<string, number>()
  for (const { report } of reports) {
    for (const ins of report.instruments) {
      for (const field of ins.refused ?? []) {
        counts.set(field, (counts.get(field) ?? 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .map(([field, count]) => ({ field, count }))
    .sort((a, b) => b.count - a.count || a.field.localeCompare(b.field))
}

/**
 * ⚠️ THE BOARD EXPLAINS ITS OWN GAPS, so the page says the reason ONCE instead
 * of nine times. These are structural facts about the instrument set, not
 * summaries of what an agent wrote — a Tier-B contract has no international
 * reference every single morning, by design (CLAUDE.md law 3).
 */
export const CAUSE_REASON: Record<string, string> = {
  implied_open_pct: 'Tier B is LME-priced — no international reference leg, by design',
  intl_change_pct: 'no international reference for these contracts',
  usdinr_change_pct: 'the rupee leg needs an international reference',
  cot_confidence: 'no CFTC COT series for these contracts',
  premium_pct: 'the premium is a bullion parity calculation',
  premium_z: 'the premium is a bullion parity calculation',
  dxy: 'DXY is not carried on this board',
  consensus: 'no consensus figure is stored',
  news: 'no news is stored on the board for this run',
}

export interface GuardTally {
  /** Decisions were not served at all — a count and a hash, or nothing. */
  served: boolean
  total: number
  denied: number
  allowed: number
}

/**
 * ⚠️ ABSENT IS NOT ZERO (house rule). "The guard was never consulted" and "the
 * guard ran and denied nothing" are different facts and the panel must say
 * which. `served:false` is the first; `denied:0` with `total>0` is the second.
 */
export function guardTally(guard: AgentRunResponse['guard']): GuardTally {
  const decisions = guard?.decisions ?? []
  if (decisions.length === 0) {
    return { served: false, total: guard?.lines ?? 0, denied: 0, allowed: 0 }
  }
  const denied = decisions.filter((d) => d.decision === 'deny').length
  return {
    served: true,
    total: decisions.length,
    denied,
    allowed: decisions.length - denied,
  }
}

export interface Verdict {
  gateOk: boolean | null | undefined
  gateReason: string | null | undefined
  instruments: number
  analystsExpected: number
  analystsLanded: number
  /** Instruments whose implied open spans more than one calendar day. */
  spanNames: string[]
  /** How many days those spans cover (the board's own figure). */
  spanDays: number | null
  /** Instruments the positioning analyst flagged a divergence on. */
  divergenceNames: string[]
  causes: DeclineCause[]
  declinedTotal: number
  guard: GuardTally
}

export function buildVerdict(opts: {
  data: AgentRunResponse
  specs: AnalystSpec[]
  landed: number
  reports: Array<{ report: AnalystReport }>
  positioning: AnalystReport | undefined
}): Verdict {
  const { data, specs, landed, reports, positioning } = opts
  const board = data.board ?? []
  const flags = flagsFor(board, positioning)
  const spanRows = board.filter((b) => (b.implied_open_span_days ?? 0) > 1)
  const causes = declineCauses(reports)

  return {
    gateOk: data.gate?.ok,
    gateReason: data.gate?.reason,
    instruments: data.gate?.instruments ?? board.length,
    analystsExpected: specs.length,
    analystsLanded: landed,
    spanNames: spanRows.map((b) => b.instrument).filter((n): n is string => !!n),
    spanDays: spanRows[0]?.implied_open_span_days ?? null,
    divergenceNames: [...flags.entries()]
      .filter(([, f]) => f.divergence)
      .map(([name]) => name),
    causes,
    declinedTotal: causes.reduce((n, c) => n + c.count, 0),
    guard: guardTally(data.guard),
  }
}
