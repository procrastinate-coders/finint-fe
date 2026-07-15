import { RotateCw } from 'lucide-react'
import type { ReadinessSource } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { StatusDot } from './StatusDot'

// The human CTA is REGISTRY-DRIVEN: the backend tells us which sources are
// human_refreshable and which `action` they take. A new refreshable source
// appears here with no code change (law 5). The kite action is emphasised (the
// daily ritual); the rest are neutral.
const CTA: Record<string, { label: string; tone: 'kite' | 'neutral' }> = {
  kite_refresh: { label: 'Refresh Kite token', tone: 'kite' },
  news_refresh: { label: 'Refresh news', tone: 'neutral' },
  refresh: { label: 'Refresh', tone: 'neutral' },
}

/**
 * A flat readiness source row (never glass): status dot · label · `critical` tag
 * · the note rendered VERBATIM (including the backend's honest bugs — e.g. a
 * "Fresh · -18949s ago" future-stamp; we do not sanitise it, hiding a source's
 * bugs is how you start hiding its warnings) · a CTA when the backend says the
 * source is human-actionable and it needs attention.
 */
export function SourceRow({
  source,
  onAction,
  actionPending = false,
}: {
  source: ReadinessSource
  onAction?: (source: ReadinessSource) => void
  actionPending?: boolean
}) {
  const isRed = source.status === 'red'
  const cta = source.action ? CTA[source.action] : undefined
  // Show the CTA only when the source is human-actionable AND actually needs
  // attention (amber/red) — no clutter when it's fresh and green.
  const showCta =
    Boolean(cta) && source.human_refreshable && source.status !== 'green'

  return (
    <div className="grid min-h-[52px] grid-cols-[16px_minmax(0,1.1fr)_minmax(0,1.6fr)_auto] items-center gap-3 border-t-[0.5px] border-apex-border-subtle px-4 py-2.5 first:border-t-0">
      <StatusDot status={source.status} pulse={isRed} />

      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate text-[14px] text-apex-fg">
          {source.label}
        </span>
        {source.critical && (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.04em] text-apex-fg-tertiary">
            critical
          </span>
        )}
      </div>

      <span
        className={cn(
          'min-w-0 text-[13px]',
          isRed ? 'text-apex-red' : 'text-apex-fg-secondary',
        )}
      >
        {source.note}
      </span>

      <span className="justify-self-end">
        {showCta && cta && (
          <button
            type="button"
            onClick={() => onAction?.(source)}
            disabled={actionPending}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[8px] border-[0.5px] px-3 text-[12px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue disabled:opacity-50',
              cta.tone === 'kite'
                ? 'border-apex-yellow bg-apex-yellow-tint text-apex-yellow hover:bg-apex-yellow-tint/70'
                : 'border-apex-border text-apex-fg-secondary hover:bg-white/[0.04] hover:text-apex-fg',
            )}
          >
            <RotateCw
              className={cn('size-3.5', actionPending && 'animate-apex-spin')}
              aria-hidden
            />
            {cta.label}
          </button>
        )}
      </span>
    </div>
  )
}
