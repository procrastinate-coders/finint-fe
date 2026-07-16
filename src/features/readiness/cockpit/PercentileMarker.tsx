import { DASH, formatPercentile } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * A COT-percentile micro-encoding. A percentile is INHERENTLY a position on a
 * 0–100 scale, so a bare "100th" hides what matters: how extreme the positioning
 * is. A tiny position marker makes "pinned to the extreme" vs "middling" readable
 * in the 5-second eyeball. NOT a chart (no axes, no series); a single data glyph.
 * The crowded zone (>85) tints the marker — extreme positioning is a STATE
 * (law 8), never a pick. null → "—" (Tier-B, by design).
 */
export function PercentileMarker({
  value,
}: {
  value: number | null | undefined
}) {
  if (value == null) {
    return <span className="text-apex-fg-tertiary">{DASH}</span>
  }
  const pct = Math.max(0, Math.min(100, value * 100))
  const crowded = pct >= 85
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span
        className="relative hidden h-[3px] w-10 rounded-full bg-apex-tertiary sm:inline-block"
        aria-hidden
      >
        <span
          className={cn(
            'absolute top-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full',
            crowded ? 'bg-apex-orange' : 'bg-apex-fg-secondary',
          )}
          style={{ left: `${pct}%` }}
        />
      </span>
      <span
        className={cn(
          'apex-tabular w-[38px] text-right text-[12px]',
          crowded ? 'text-apex-orange' : 'text-apex-fg-secondary',
        )}
      >
        {formatPercentile(value)}
      </span>
    </span>
  )
}
