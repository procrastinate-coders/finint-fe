import { Ban, Check, TriangleAlert } from 'lucide-react'
import type { AgentRunGate } from '@/lib/api/contracts'
import { istDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * ⚠️ THE MOST IMPORTANT THING ON THIS PAGE. `scan_health.py` refusing is a
 * FIRST-CLASS OUTCOME, not an empty page: a refused run has no analyst report,
 * only run.json and its reason. Silence would be indistinguishable from success —
 * and from the laptop simply being switched off (SAD §5, gap 3).
 *
 * So a REFUSAL leads the page, full width, with the reason verbatim and every
 * check that produced it. A PASS is deliberately quiet — one strip — because a
 * healthy gate is the uninteresting case and the reports below are the read.
 */
export function GatePanel({
  gate,
  stagesLanded,
}: {
  gate: AgentRunGate | null | undefined
  /** How many stages actually landed — the panel must not claim none ran. */
  stagesLanded: number
}) {
  // No gate block at all is NOT "passed" — it is unknown, and it says so.
  if (!gate) {
    return (
      <div
        role="status"
        className="flex items-start gap-2.5 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/50 px-4 py-3"
      >
        <TriangleAlert className="mt-px size-4 shrink-0 text-apex-fg-tertiary" aria-hidden />
        <p className="text-[12.5px] leading-[18px] text-apex-fg-secondary">
          <span className="font-medium text-apex-fg">Gate not recorded</span> — this
          run carries no scan-health block, so whether the board was healthy is not
          stated. It is not being treated as a pass.
        </p>
      </div>
    )
  }

  const refused = gate.ok === false
  const checks = gate.checks ?? []
  const stale = gate.stale ?? []
  const unsettled = gate.unsettled ?? []

  if (!refused) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/40 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-apex-green">
          <Check className="size-4" aria-hidden />
          Gate passed
        </span>
        {gate.reason && (
          <span className="text-[12px] text-apex-fg-secondary">{gate.reason}</span>
        )}
        <span className="apex-tabular ml-auto text-[11px] text-apex-fg-tertiary">
          {gate.instruments != null && `${gate.instruments} instruments`}
          {gate.checked_at && ` · checked ${istDateTime(gate.checked_at)}`}
        </span>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="rounded-[14px] border-[0.5px] border-apex-red/40 bg-apex-red-tint px-5 py-4"
    >
      <div className="flex items-center gap-2">
        <Ban className="size-4 shrink-0 text-apex-red" aria-hidden />
        <span className="text-[14px] font-semibold text-apex-red">
          {stagesLanded === 0
            ? 'Gate refused — no agents ran'
            : 'Gate refused — but agents ran anyway'}
        </span>
      </div>
      {gate.reason && (
        <p className="mt-1.5 max-w-[80ch] text-[13.5px] leading-[20px] text-apex-fg">
          {gate.reason}
        </p>
      )}
      {/* ⚠️ THE PANEL MUST NOT CLAIM NOTHING RAN WHEN SOMETHING DID. The real
          2026-09-08 run refused the gate (9/9 closes unsettled) and still landed
          four analyst reports. Printing "no agents ran" over four visible reads
          would be a fabrication about the run — and the far more important thing
          to say in that case is that the reads below were produced over a board
          the gate had already refused. */}
      <p className="mt-1 max-w-[80ch] text-[11.5px] leading-[16px] text-apex-fg-tertiary">
        {stagesLanded === 0 ? (
          <>
            This is the harness refusing to reason over a board it does not trust.
            There is no analyst report for this date by design — not because the run
            is missing.
          </>
        ) : (
          <>
            The gate refused this board, and{' '}
            <span className="font-medium text-apex-red">
              {stagesLanded} stage{stagesLanded === 1 ? '' : 's'} landed regardless
            </span>
            . Everything below was reasoned over the board named here — read it
            against this refusal, not instead of it.
          </>
        )}
      </p>

      {checks.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1">
          {checks.map((c) => (
            <li key={c.name} className="flex items-start gap-2 text-[12px]">
              {c.ok ? (
                <Check className="mt-px size-3.5 shrink-0 text-apex-green" aria-hidden />
              ) : (
                <Ban className="mt-px size-3.5 shrink-0 text-apex-red" aria-hidden />
              )}
              <span className={cn('shrink-0 font-medium', c.ok ? 'text-apex-fg-secondary' : 'text-apex-red')}>
                {c.name}
              </span>
              {c.detail && (
                <span className="text-apex-fg-tertiary">{c.detail}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {stale.length > 0 && (
        <p className="mt-2.5 text-[11.5px] leading-[16px] text-apex-fg-secondary">
          <span className="uppercase tracking-[0.05em] text-apex-fg-tertiary">
            stale ({stale.length})
          </span>{' '}
          <span className="apex-tabular">{stale.join(' · ')}</span>
        </p>
      )}
      {unsettled.length > 0 && (
        <p className="mt-1 text-[11.5px] leading-[16px] text-apex-fg-secondary">
          <span className="uppercase tracking-[0.05em] text-apex-fg-tertiary">
            unsettled ({unsettled.length})
          </span>{' '}
          <span className="apex-tabular">{unsettled.join(' · ')}</span>
        </p>
      )}
      {gate.checked_at && (
        <p className="apex-tabular mt-2 text-[11px] text-apex-fg-tertiary">
          checked {istDateTime(gate.checked_at)}
        </p>
      )}
    </div>
  )
}
