import { z } from 'zod'
import type { AgentRunStage } from '@/lib/api/contracts'

/**
 * Tolerant readers for the FOUR analysts' report bodies.
 *
 * ⚠️ THIS IS NOT AN API CONTRACT, AND IT DELIBERATELY DOES NOT LIVE IN
 * `lib/api/contracts/`. `GET /agent-run/{date}` types `stages[].report` as an
 * OPAQUE object — the endpoint makes no promise about what is inside it, because
 * the shape is whatever that agent wrote that morning. Putting these schemas in
 * the generated contracts barrel would claim a guarantee the backend never made.
 *
 * So a report is `safeParse`d at the point of use, and one that does not match is
 * shown as unrenderable rather than half-rendered (never infer).
 *
 * The shapes below are the ones the agents ACTUALLY emit, read from the real
 * four-analyst run at `runs/2026-09-08/analyst_{positioning,technical,
 * crossmarket,news}.json`. All four share ONE envelope — `agent`, `run_date`,
 * `board_note`, `instruments[]` — and differ only in which per-instrument prose
 * fields they fill, so one schema covers all four and each analyst's DESCRIPTOR
 * (below) says which fields are its own.
 */

/** Every per-instrument field any of the four analysts emits. All optional. */
export const analystInstrument = z
  .object({
    instrument: z.string(),
    refused: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),

    // positioning
    oi_state: z.union([z.string(), z.null()]).optional(),
    oi_read: z.union([z.string(), z.null()]).optional(),
    cot_read: z.union([z.string(), z.null()]).optional(),
    divergence: z.union([z.string(), z.null()]).optional(),

    // technical
    level_read: z.union([z.string(), z.null()]).optional(),
    volatility_read: z.union([z.string(), z.null()]).optional(),
    term_structure: z.union([z.string(), z.null()]).optional(),
    // ⚠️ `in_play` is null on every instrument of the only real run — the analyst
    // refused it for want of ATR. Typed loosely because a run that CAN call it
    // may write a verdict string or a boolean, and neither must crash the page.
    in_play: z.union([z.string(), z.boolean(), z.null()]).optional(),
    // Prose explaining what the analyst could NOT do, not a boolean flag.
    degraded: z.union([z.string(), z.null()]).optional(),

    // crossmarket
    tier: z.union([z.string(), z.null()]).optional(),
    reference_read: z.union([z.string(), z.null()]).optional(),
    implied_open_read: z.union([z.string(), z.null()]).optional(),
    premium_read: z.union([z.string(), z.null()]).optional(),

    // news
    news_read: z.union([z.string(), z.null()]).optional(),
    matches_tape: z.union([z.string(), z.boolean(), z.null()]).optional(),
  })
  .passthrough()

export const analystReport = z
  .object({
    agent: z.union([z.string(), z.null()]).optional(),
    run_date: z.union([z.string(), z.null()]).optional(),
    /** The analyst on the WHOLE board — one per analyst, not per instrument. */
    board_note: z.union([z.string(), z.null()]).optional(),
    instruments: z.array(analystInstrument),

    // board-level blocks only some analysts emit
    backdrop: z
      .object({
        usdinr_read: z.union([z.string(), z.null()]).optional(),
        rupee_is_the_story: z.union([z.boolean(), z.null()]).optional(),
      })
      .passthrough()
      .optional(),
    macro: z
      .object({
        dxy_read: z.union([z.string(), z.null()]).optional(),
        eia_read: z.union([z.string(), z.null()]).optional(),
        consensus: z.union([z.string(), z.null()]).optional(),
      })
      .passthrough()
      .optional(),
    catalysts: z.array(z.unknown()).optional(),
    fetched: z.array(z.unknown()).optional(),
  })
  .passthrough()

export type AnalystReport = z.infer<typeof analystReport>
export type AnalystInstrument = z.infer<typeof analystInstrument>

// ============================================================================
// The four analysts, and what each one owns
// ============================================================================

/** One labelled piece of prose inside an instrument's read. */
export interface ReadField {
  key: string
  label: string
  /** Rendered as the weighted callout — the tension, not a plain paragraph. */
  emphasis?: boolean
}

export interface AnalystSpec {
  /** The `stages[].agent` value, sans any `.bad` quarantine suffix. */
  agent: string
  label: string
  /** What this analyst is FOR — so a missing one is a named absence, not a gap. */
  remit: string
  fields: ReadField[]
}

/**
 * ⚠️ THE EXPECTED FOUR, DECLARED. This list is what makes a missing analyst
 * VISIBLE: the page renders against this roster, not against whatever happened to
 * land. Three reports rendered where four were expected must read as three of
 * four — silently rendering what arrived is FIN-198's exact shape, and it is the
 * failure this ticket exists to prevent.
 *
 * Order is the reading order inside every instrument panel: positioning first
 * (the founding thesis — positioning leads, narrative follows), news last.
 */
export const ANALYSTS: AnalystSpec[] = [
  {
    agent: 'analyst_positioning',
    label: 'Positioning',
    remit: 'open interest and COT — who is on the other side',
    fields: [
      { key: 'oi_read', label: 'OI' },
      { key: 'cot_read', label: 'COT' },
      { key: 'divergence', label: 'Divergence', emphasis: true },
    ],
  },
  {
    agent: 'analyst_technical',
    label: 'Technical',
    remit: 'levels, volatility and the term structure',
    fields: [
      { key: 'level_read', label: 'Levels' },
      { key: 'volatility_read', label: 'Volatility' },
      { key: 'term_structure', label: 'Term structure' },
      { key: 'degraded', label: 'Could not size', emphasis: true },
    ],
  },
  {
    agent: 'analyst_crossmarket',
    label: 'Cross-market',
    remit: 'the international reference, the rupee leg and import parity',
    fields: [
      { key: 'reference_read', label: 'Reference' },
      { key: 'implied_open_read', label: 'Implied open' },
      { key: 'premium_read', label: 'Premium' },
    ],
  },
  {
    agent: 'analyst_news',
    label: 'News',
    remit: 'overnight catalysts — lagging by design, sometimes contrarian',
    fields: [{ key: 'news_read', label: 'Overnight' }],
  },
]

/** "analyst_positioning" / "analyst_positioning.bad" → the roster entry. */
export function specFor(agent: string | null | undefined): AnalystSpec | undefined {
  const name = baseAgentName(agent)
  return ANALYSTS.find((a) => a.agent === name)
}

/** Every per-instrument field the roster already claims — used to spot new ones. */
const CLAIMED = new Set<string>([
  'instrument',
  'refused',
  'sources',
  'in_play',
  'matches_tape',
  ...ANALYSTS.flatMap((a) => a.fields.map((f) => f.key)),
])

/**
 * The specs to render for THIS run: the expected four, plus any analyst that
 * landed and is NOT on the roster.
 *
 * ⚠️ A HARDCODED ROSTER MUST NOT BECOME A WAY TO HIDE A NEW ANALYST — that is
 * law 5's failure in a new place (the readiness sources list grew 6 → 8, and a
 * hardcoded list silently dropped the new ones). The roster exists to make an
 * ABSENCE visible; it must never make an ADDITION invisible. So a fifth analyst
 * renders the moment it lands, under its own name, with whatever prose fields it
 * wrote — labelled as unrecognised so nobody mistakes it for a reviewed remit.
 */
export function specsForRun(agents: string[]): AnalystSpec[] {
  const extra = new Map<string, Set<string>>()
  for (const agent of agents) {
    const name = baseAgentName(agent)
    if (ANALYSTS.some((a) => a.agent === name)) continue
    if (!extra.has(name)) extra.set(name, new Set())
  }
  return [
    ...ANALYSTS,
    ...[...extra.keys()].map((name) => ({
      agent: name,
      label: name.replace(/^analyst_/, '').replace(/_/g, ' '),
      remit: 'not on the expected roster — this analyst is new to this view',
      fields: [] as ReadField[],
    })),
  ]
}

/**
 * The prose fields an unrecognised analyst wrote — every string field the roster
 * does not already claim, so a new analyst's output is shown rather than dropped.
 */
export function unclaimedFields(ins: AnalystInstrument): ReadField[] {
  return Object.keys(ins)
    .filter((k) => !CLAIMED.has(k) && typeof (ins as Record<string, unknown>)[k] === 'string')
    .map((k) => ({ key: k, label: k.replace(/_/g, ' ') }))
}

/**
 * ⚠️ A QUARANTINED REPORT IS ONE THE PROVENANCE GUARD REJECTED. The backend welds
 * the two signals with a database CHECK — `status = 'failed'` and a `.bad` agent
 * suffix must agree — precisely so a rejected report cannot land looking like a
 * good one (FIN-231 G3). Either signal alone is enough to treat it as rejected
 * here: if they ever disagree, the safe reading is the pessimistic one.
 *
 * Rendering a quarantined report as ordinary content would reintroduce, in the
 * UI, the exact corruption path the backend just closed.
 */
export function isQuarantined(stage: AgentRunStage): boolean {
  return stage.status === 'failed' || (stage.agent ?? '').endsWith('.bad')
}

/** The agent name without the quarantine suffix — for a label that also says WHY. */
export function baseAgentName(agent: string | null | undefined): string {
  const name = agent ?? 'unnamed agent'
  return name.endsWith('.bad') ? name.slice(0, -4) : name
}
