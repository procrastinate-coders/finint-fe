import { Check, Loader2, TriangleAlert, X } from 'lucide-react'
import type { RefreshSpineResponse } from '@/lib/api/contracts'
import { istTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { summarizeRefresh } from './refresh-summary'

/**
 * The refresh outcome, rendered as the honest per-source truth (flat data, never
 * a toast). A partial (a source ok:false) NAMES the failed source; an
 * already_running shows since-when so the wait is bounded; COT "skipped" and an
 * invalid Kite token read as the statuses they are, not failures.
 */
export function RefreshReport({
  result,
  onDismiss,
}: {
  result: RefreshSpineResponse
  onDismiss: () => void
}) {
  const s = summarizeRefresh(result)

  let heading: string
  let tone: 'ok' | 'warn' | 'running'
  if (s.alreadyRunning) {
    heading = s.startedAt
      ? `A refresh is already running (since ${istTime(s.startedAt)}) — re-reading…`
      : 'A refresh is already running — re-reading…'
    tone = 'running'
  } else if (s.anyFailed) {
    const failed = s.lines
      .filter((l) => !l.ok)
      .map((l) => l.label)
      .join(', ')
    heading = `Partial refresh — ${failed} did not update`
    tone = 'warn'
  } else {
    heading = 'Data refreshed'
    tone = 'ok'
  }

  return (
    <div
      role="status"
      className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4"
    >
      <div className="flex items-center gap-2">
        {tone === 'running' ? (
          <Loader2
            className="size-4 shrink-0 animate-spin text-apex-blue"
            aria-hidden
          />
        ) : tone === 'warn' ? (
          <TriangleAlert
            className="size-4 shrink-0 text-apex-orange"
            aria-hidden
          />
        ) : (
          <Check className="size-4 shrink-0 text-apex-green" aria-hidden />
        )}
        <span
          className={cn(
            'text-[13px] font-medium',
            tone === 'warn' ? 'text-apex-orange' : 'text-apex-fg',
          )}
        >
          {heading}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="ml-auto shrink-0 rounded-[6px] p-0.5 text-apex-fg-tertiary transition-colors hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      </div>

      {s.lines.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {s.lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2 text-[12px]">
              {l.ok ? (
                <Check
                  className="size-3 shrink-0 text-apex-green"
                  aria-hidden
                />
              ) : (
                <X className="size-3 shrink-0 text-apex-red" aria-hidden />
              )}
              <span className="text-apex-fg-secondary">{l.label}</span>
              <span
                className={cn(
                  'truncate',
                  l.ok ? 'text-apex-fg-tertiary' : 'text-apex-red',
                )}
              >
                {l.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
