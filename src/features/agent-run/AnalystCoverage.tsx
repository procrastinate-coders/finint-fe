import { Check, FileWarning, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ANALYSTS } from './report-shape'

export type AnalystStatus = 'ok' | 'rejected' | 'absent' | 'unreadable'

/**
 * ⚠️ THE ROSTER, NOT THE ARRIVALS. Four analysts are expected every run, so the
 * page states all four and their outcome — before any of their prose. Rendering
 * the three that succeeded and leaving the fourth to be inferred from its absence
 * is FIN-198's exact shape: computed, stored, served, and read by nobody.
 *
 * Deliberately ONE compact row rather than four cards. A reader needs to know
 * "did all four run?" in a glance and then get to the board; a failure is
 * unmistakable because it is red and named among four, not because it is loud.
 */
export function AnalystCoverage({
  statuses,
}: {
  statuses: Map<string, AnalystStatus>
}) {
  const failed = ANALYSTS.filter((a) => (statuses.get(a.agent) ?? 'absent') !== 'ok')

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {ANALYSTS.map((a) => {
          const st = statuses.get(a.agent) ?? 'absent'
          const ok = st === 'ok'
          return (
            <span
              key={a.agent}
              title={a.remit}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] px-2.5 py-1 text-[11.5px]',
                ok
                  ? 'border-apex-border-subtle bg-apex-secondary/30 text-apex-fg-secondary'
                  : 'border-apex-red/40 bg-apex-red-tint text-apex-red',
              )}
            >
              {ok ? (
                <Check className="size-3.5 shrink-0 text-apex-green" aria-hidden />
              ) : st === 'rejected' ? (
                <ShieldX className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <FileWarning className="size-3.5 shrink-0" aria-hidden />
              )}
              <span className="font-medium">{a.label}</span>
              <span className={cn(ok && 'text-apex-fg-tertiary')}>{copy(st)}</span>
            </span>
          )
        })}
      </div>
      {failed.length > 0 && (
        <p className="mt-2 max-w-[80ch] text-[11.5px] leading-[16px] text-apex-red">
          {failed.length} of {ANALYSTS.length} analysts produced no usable read this
          run — {failed.map((a) => a.label).join(', ')}. The reads below are{' '}
          {ANALYSTS.length - failed.length} of {ANALYSTS.length} views of this
          board, not the whole of it.
        </p>
      )}
    </div>
  )
}

function copy(st: AnalystStatus): string {
  switch (st) {
    case 'ok':
      return 'read landed'
    case 'rejected':
      return 'rejected by the guard'
    case 'unreadable':
      return 'report unreadable'
    case 'absent':
      return 'did not land'
  }
}
