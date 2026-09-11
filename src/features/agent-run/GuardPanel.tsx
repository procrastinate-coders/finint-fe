import type { AgentRunResponse } from '@/lib/api/contracts'
import { formatNumber, istDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Spine } from './Spine'
import { guardTally } from './verdict'

type Guard = NonNullable<AgentRunResponse['guard']>

/**
 * Every provenance decision — allow and deny.
 *
 * ⚠️ A DENIED write never reaches PostToolUse, so without this the guard's
 * catches are invisible. Denials are shown in a CAUTION tone, never an alarm
 * one: a deny may be the guard working, or a false positive strangling the
 * report — that judgement is the reader's and needs both counts together.
 * FIN-175 died of 51 false rejects against 1 true positive nobody could see.
 *
 * ⚠️ ABSENT IS NOT ZERO — three states, three sentences:
 *   not served       · a count and a hash, no decisions
 *   ran, none denied · a RESULT, not an empty section
 *   N denied         · the list, with reasons
 */
export function GuardPanel({ guard }: { guard: Guard | null | undefined }) {
  const t = guardTally(guard)

  if (!guard) {
    return (
      <Note tone="quiet">
        <span className="font-medium text-apex-fg">Guard not recorded</span> — this
        run carries no provenance log at all, so whether anything was allowed or
        denied is not stated. It is not being read as “nothing was denied”.
      </Note>
    )
  }

  if (!t.served) {
    return (
      <Note>
        <span className="font-medium text-apex-fg">Decisions are not served</span> —
        the run record carries only a line count
        {t.total > 0 && (
          <>
            {' '}
            (<span className="apex-tabular">{formatNumber(t.total)}</span>)
          </>
        )}
        {guard.sha256 && (
          <>
            {' '}
            and a hash (
            <span className="apex-tabular">{guard.sha256.slice(0, 12)}</span>)
          </>
        )}
        . Whether the guard allowed or denied, and why, cannot be shown from this
        payload.
      </Note>
    )
  }

  // ⚠️ A zero-deny run is a RESULT. "The guard ran and found nothing" is a
  // different fact from "the guard was never consulted", and from an empty
  // section that says neither.
  if (t.denied === 0) {
    return (
      <Note tone="good">
        <span className="font-medium text-apex-green">Ran, found nothing.</span>{' '}
        <span className="apex-tabular">{formatNumber(t.total)}</span> decisions, none
        denied — every number the analysts wrote traced back to the board.
      </Note>
    )
  }

  const decisions = guard.decisions ?? []
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[11px]">
        <span className="inline-flex items-baseline gap-1.5 text-apex-fg-secondary">
          <span className="apex-tabular text-[15px] font-semibold text-apex-yellow">
            {formatNumber(t.denied)}
          </span>{' '}
          denied
        </span>
        <span className="inline-flex items-baseline gap-1.5 text-apex-fg-secondary">
          <span className="apex-tabular text-[15px] font-semibold text-apex-green">
            {formatNumber(t.allowed)}
          </span>{' '}
          allowed
        </span>
        <span className="text-apex-fg-tertiary">
          a denial may be the guard working, or a false positive — read the reason
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {decisions.map((d, i) => {
          const denied = d.decision === 'deny'
          return (
            <div
              key={i}
              className={cn(
                'rounded-[8px] border-[0.5px] px-4 py-2',
                denied
                  ? 'border-apex-yellow/35 bg-apex-yellow-tint'
                  : 'border-apex-border bg-apex-primary',
              )}
            >
              <Spine
                label={
                  <span className={denied ? 'text-apex-yellow' : 'text-apex-green'}>
                    {d.decision ?? 'not recorded'}
                  </span>
                }
              >
                <p className="m-0 break-words text-[11px] leading-[1.5] text-apex-fg-secondary">
                  {d.reason}
                  <span className="apex-tabular mt-0.5 block text-apex-fg-tertiary">
                    {d.agent_id}
                    {d.ts && ` · ${istDateTime(d.ts)}`}
                  </span>
                </p>
              </Spine>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Note({
  tone = 'caution',
  children,
}: {
  tone?: 'caution' | 'quiet' | 'good'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border-[0.5px] px-4 py-3 text-[13px] leading-[1.55] text-apex-fg-secondary',
        tone === 'caution'
          ? 'border-apex-yellow/35 bg-apex-yellow-tint'
          : 'border-apex-border bg-apex-primary',
      )}
    >
      {children}
    </div>
  )
}
