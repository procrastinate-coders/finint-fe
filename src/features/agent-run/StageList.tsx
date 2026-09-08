import { Ban, Check, ShieldX, TriangleAlert } from 'lucide-react'
import type { AgentRunStage } from '@/lib/api/contracts'
import { istDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { isQuarantined } from './report-shape'

/** A stage that FAILED must read as failed, never as missing (§3). A status the
 *  record does not carry is marked "not recorded" — never silently treated as ok. */
function statusTone(status: string | null | undefined) {
  if (status === 'ok') return { icon: Check, cls: 'text-apex-green', label: 'ok' }
  if (status === 'gate_refused')
    return { icon: Ban, cls: 'text-apex-red', label: 'gate refused' }
  if (status === 'failed')
    return { icon: ShieldX, cls: 'text-apex-red', label: 'failed' }
  if (status) return { icon: TriangleAlert, cls: 'text-apex-yellow', label: status }
  return {
    icon: TriangleAlert,
    cls: 'text-apex-fg-tertiary',
    label: 'status not recorded',
  }
}

export function StageList({ stages }: { stages: AgentRunStage[] }) {
  if (stages.length === 0) {
    return (
      <p className="text-[12.5px] text-apex-fg-secondary">
        No stage rows were landed for this run.
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1">
      {stages.map((s) => {
        const tone = statusTone(s.status)
        const Icon = tone.icon
        // ⚠️ A quarantined row is tinted, not merely icon-coloured. It must not be
        // possible to skim this list and read a rejected report as an ordinary one.
        const bad = isQuarantined(s)
        return (
          <li
            key={`${s.stage}-${s.agent}-${s.seq}`}
            className={cn(
              'flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-[8px] border-[0.5px] px-3 py-2',
              bad
                ? 'border-apex-red/40 bg-apex-red-tint'
                : 'border-apex-border-subtle bg-apex-secondary/30',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon className={cn('size-3.5 shrink-0', tone.cls)} aria-hidden />
              <span className="text-[12.5px] font-medium text-apex-fg">
                {s.stage ?? 'stage not named'} / {s.agent ?? 'agent not named'}
              </span>
            </span>
            <span className={cn('text-[11.5px]', tone.cls)}>{tone.label}</span>
            {bad && (
              <span className="rounded-[4px] bg-apex-red/15 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.05em] text-apex-red">
                quarantined
              </span>
            )}
            <span className="text-[11px] text-apex-fg-tertiary">
              {s.model ? `model ${s.model}` : 'model not recorded'}
            </span>
            {/* ⚠️ ALWAYS labelled an estimate — the subscription does not meter
                per call, so this is arithmetic on the report, not a bill. */}
            {s.tokens_estimated != null && (
              <span className="apex-tabular text-[11px] text-apex-fg-tertiary">
                ~{s.tokens_estimated.toLocaleString('en-IN')} tokens (estimate)
              </span>
            )}
            <span className="apex-tabular ml-auto text-[11px] text-apex-fg-tertiary">
              {s.created_at ? istDateTime(s.created_at) : 'no timestamp'}
              {s.report_sha256 && ` · ${s.report_sha256.slice(0, 12)}`}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
