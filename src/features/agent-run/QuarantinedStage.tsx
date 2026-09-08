import { ShieldX } from 'lucide-react'
import type { AgentRunStage } from '@/lib/api/contracts'
import { istDateTime } from '@/lib/format'
import { baseAgentName } from './report-shape'

/**
 * ⚠️ A REPORT THE PROVENANCE GUARD REJECTED — rendered as a rejection, never as a
 * read.
 *
 * The backend closed this hole in FIN-231 G3: a quarantined report used to land
 * byte-indistinguishable from a good one, because the `.bad` suffix was stripped
 * and the `status` that travelled with it was dropped for want of a column. Both
 * now survive to the wire, welded by a database CHECK.
 *
 * Showing its prose here as ordinary content would reopen exactly that hole one
 * layer up — the numbers in it are the ones the guard refused to ground, and a
 * read that looks like every other read is a read Father will weigh like every
 * other read. So the body is NOT rendered. What is rendered is the fact of the
 * rejection and the receipt that proves the record is intact.
 */
export function QuarantinedStage({ stage }: { stage: AgentRunStage }) {
  return (
    <div
      role="alert"
      className="rounded-[12px] border-[0.5px] border-apex-red/40 bg-apex-red-tint px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <ShieldX className="size-4 shrink-0 text-apex-red" aria-hidden />
        <span className="text-[13px] font-semibold text-apex-red">
          Rejected — quarantined by the provenance guard
        </span>
        <span className="apex-tabular rounded-[4px] bg-apex-red/15 px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.05em] text-apex-red">
          {stage.agent ?? 'agent not named'}
        </span>
      </div>
      <p className="mt-1.5 max-w-[80ch] text-[12.5px] leading-[18px] text-apex-fg-secondary">
        {baseAgentName(stage.agent)} produced a report that failed the guard, so it
        is <span className="font-medium text-apex-fg">not shown as a read</span>.
        Its claims were not grounded in the board, and displaying them beside the
        reports that passed would give them the same standing. The row is kept
        rather than dropped — a rejected report is a fact about this run.
      </p>
      <p className="apex-tabular mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-apex-fg-tertiary">
        <span>status {stage.status ?? 'not recorded'}</span>
        <span>seq {stage.seq ?? '—'}</span>
        {stage.report_sha256 && <span>sha {stage.report_sha256.slice(0, 12)}</span>}
        {stage.created_at && <span>{istDateTime(stage.created_at)}</span>}
      </p>
    </div>
  )
}
