import { FileWarning, GitCompareArrows, ShieldX } from 'lucide-react'
import type { AgentRunBoardRow } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { BoardFacts } from './BoardFacts'
import {
  unclaimedFields,
  type AnalystInstrument,
  type AnalystSpec,
} from './report-shape'

/**
 * What one analyst had to say about one instrument — or why it said nothing.
 * ⚠️ THE ABSENCES ARE TYPED, so the page can never fall back to rendering only
 * what happened to arrive.
 */
export type AnalystSlot =
  | { kind: 'read'; ins: AnalystInstrument }
  /** The provenance guard rejected this analyst's whole report. */
  | { kind: 'rejected' }
  /** No row for this analyst landed at all. */
  | { kind: 'absent' }
  /** The analyst landed, but its report body did not parse. */
  | { kind: 'unreadable' }
  /** The analyst landed and simply did not cover this instrument. */
  | { kind: 'uncovered' }

/**
 * ONE INSTRUMENT, ALL FOUR VIEWS — the grouping decision of this ticket.
 *
 * ⚠️ GROUPED BY INSTRUMENT, NOT BY ANALYST. Four analysts by nine instruments is
 * 36 reads, and the reader's actual task is "what does the board say about
 * COPPER" — he holds positions in instruments, not in analysts. Three reasons
 * decided it:
 *
 *  1. Triangulation only works when the views are adjacent. The value of a second
 *     pipeline is where its four readers DISAGREE about the same instrument; four
 *     separate analyst sections put positioning's COPPER read eight screens from
 *     technical's, and a disagreement nobody can see is a disagreement nobody can
 *     use.
 *  2. The board facts are per instrument. Grouped by instrument they are rendered
 *     ONCE, above the four reads that all cite them. Grouped by analyst they are
 *     either repeated four times or dropped from three — and dropping them is how
 *     prose stops being checkable against its input.
 *  3. A missing analyst becomes visible nine times instead of once. Grouped by
 *     analyst, a rejected technical read is one absent section that a reader
 *     scrolling for COPPER never passes.
 *
 * What is genuinely per-analyst — each `board_note`, the crossmarket backdrop,
 * the news macro block — is NOT forced into this shape. It is rendered in its own
 * board-level section, grouped by analyst, where it belongs.
 */
export function InstrumentPanel({
  instrument,
  row,
  specs,
  slots,
}: {
  instrument: string
  row: AgentRunBoardRow | undefined
  specs: AnalystSpec[]
  slots: Map<string, AnalystSlot>
}) {
  const tier = row?.data_tier
  const tierB = tier != null && tier !== 'A'
  return (
    <article
      id={`instrument-${instrument}`}
      className="scroll-mt-[100px] overflow-hidden rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary"
    >
      <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b-[0.5px] border-apex-border-subtle px-4 py-2.5">
        <h3 className="text-[14px] font-semibold text-apex-fg">{instrument}</h3>
        {tier && (
          <span
            className={cn(
              'rounded-[4px] px-1 py-px text-[9px] font-semibold uppercase',
              tierB
                ? 'bg-apex-tertiary text-apex-fg-tertiary'
                : 'bg-apex-blue-tint text-apex-blue',
            )}
          >
            {tierB ? 'B · LME' : 'A'}
          </span>
        )}
        {row?.oi_state && (
          <span className="text-[12px] uppercase tracking-[0.02em] text-apex-fg-secondary">
            {row.oi_state}
          </span>
        )}
        {row?.oi_gap_label && (
          <span className="ml-auto text-[11px] text-apex-yellow">
            {row.oi_gap_label}
          </span>
        )}
      </header>

      <BoardFacts row={row} />

      <div className="divide-y-[0.5px] divide-apex-border-subtle">
        {specs.map((spec) => (
          <AnalystRead
            key={spec.agent}
            spec={spec}
            slot={slots.get(spec.agent) ?? { kind: 'absent' }}
          />
        ))}
      </div>
    </article>
  )
}

function AnalystRead({ spec, slot }: { spec: AnalystSpec; slot: AnalystSlot }) {
  if (slot.kind !== 'read') {
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-4 py-2">
        <Label spec={spec} missing />
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-apex-red">
          {slot.kind === 'rejected' && (
            <>
              <ShieldX className="size-3.5 shrink-0" aria-hidden />
              no read — this analyst's report was rejected by the provenance guard
            </>
          )}
          {slot.kind === 'absent' && (
            <>
              <FileWarning className="size-3.5 shrink-0" aria-hidden />
              no read — this analyst did not land a report for this run
            </>
          )}
          {slot.kind === 'unreadable' && (
            <>
              <FileWarning className="size-3.5 shrink-0" aria-hidden />
              no read — this analyst's report is in a shape this view cannot render
            </>
          )}
          {slot.kind === 'uncovered' && (
            <>
              <FileWarning className="size-3.5 shrink-0" aria-hidden />
              no read — this analyst landed, but did not cover this instrument
            </>
          )}
        </span>
        <span className="text-[10.5px] text-apex-fg-tertiary">({spec.remit})</span>
      </div>
    )
  }

  const ins = slot.ins
  const refused = ins.refused ?? []
  const bag = ins as Record<string, unknown>
  // A roster analyst renders its declared fields; one that is NOT on the roster
  // renders every prose field it wrote, so a new analyst is never silently blank.
  const fields = spec.fields.length > 0 ? spec.fields : unclaimedFields(ins)
  const written = fields.filter((f) => typeof bag[f.key] === 'string' && bag[f.key])

  return (
    <div className="px-4 py-2.5">
      <div className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <Label spec={spec} />
        {/* The analyst's own verdict fields, when it could reach one. */}
        {typeof ins.in_play === 'string' && (
          <span className="text-[11px] text-apex-fg-secondary">
            in play: {ins.in_play}
          </span>
        )}
        {typeof ins.matches_tape === 'string' && (
          <span className="text-[11px] text-apex-fg-secondary">
            matches tape: {ins.matches_tape}
          </span>
        )}
      </div>

      {written.length === 0 && refused.length === 0 && (
        <p className="text-[11.5px] text-apex-fg-tertiary">
          This analyst covered {ins.instrument} but wrote nothing to any of its
          fields.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {written.map((f) =>
          f.emphasis ? (
            <div
              key={String(f.key)}
              className="rounded-[8px] border-l-2 border-apex-yellow bg-apex-yellow-tint px-3 py-2"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-apex-yellow">
                <GitCompareArrows className="size-3.5" aria-hidden />
                {f.label === 'Divergence'
                  ? 'Divergence — tension, not confirmation'
                  : f.label}
              </div>
              <p className="mt-1 max-w-[90ch] text-[12px] leading-[18px] text-apex-fg-secondary">
                {bag[f.key] as string}
              </p>
            </div>
          ) : (
            <p
              key={String(f.key)}
              className="max-w-[90ch] text-[12.5px] leading-[19px] text-apex-fg-secondary"
            >
              <span className="mr-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-apex-fg-tertiary">
                {f.label}
              </span>
              {bag[f.key] as string}
            </p>
          ),
        )}
      </div>

      {/* ⚠️ NOT an error list — the analyst refusing to speak to a field it could
          not ground. Shown as the honesty it is. */}
      {refused.length > 0 && (
        <p className="mt-1.5 text-[11.5px] leading-[16px] text-apex-fg-tertiary">
          <span className="uppercase tracking-[0.05em]">declined</span>{' '}
          <span className="apex-tabular text-apex-fg-secondary">
            {refused.join(' · ')}
          </span>{' '}
          — the agent would not speak to these; that is the system being honest, not
          a failure.
        </p>
      )}
    </div>
  )
}

function Label({ spec, missing }: { spec: AnalystSpec; missing?: boolean }) {
  return (
    <span
      className={cn(
        'w-[92px] shrink-0 text-[11px] font-semibold uppercase tracking-[0.05em]',
        missing ? 'text-apex-red' : 'text-apex-fg',
      )}
    >
      {spec.label}
    </span>
  )
}
