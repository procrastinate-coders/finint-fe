import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A bento tile. FLAT data surface (law 9/10 — glass is chrome only):
 * a hairline + a subtly lighter fill than the canvas gives the tile separation,
 * no frost on data. `lit` is the lineage highlight — when a hovered source feeds
 * this tile, its edge lights up (blue = interactive/relational, a state) and a
 * "← from X" label appears. Entrance fades + rises (staggered via `delayMs`);
 * reduced-motion collapses it (handled globally in index.css).
 */
export function Tile({
  title,
  meta,
  lit = false,
  litLabel,
  dimmed = false,
  delayMs = 0,
  className,
  bodyClassName,
  children,
}: {
  title?: string
  meta?: ReactNode
  lit?: boolean
  litLabel?: string
  dimmed?: boolean
  delayMs?: number
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <section
      className={cn(
        'flex min-h-0 animate-in flex-col overflow-hidden rounded-[14px] border-[0.5px] bg-apex-primary fade-in-0 slide-in-from-bottom-2 duration-500',
        lit
          ? 'border-apex-blue/70 ring-1 ring-inset ring-apex-blue/30'
          : 'border-apex-border',
        dimmed && 'opacity-40 transition-opacity',
        className,
      )}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      {(title || meta || lit) && (
        <header className="flex shrink-0 items-baseline justify-between gap-3 px-4 pb-2.5 pt-3.5">
          <div className="flex items-baseline gap-2.5">
            {title && (
              <h2 className="text-[12px] font-semibold tracking-tight text-apex-fg">
                {title}
              </h2>
            )}
            {lit && litLabel && (
              <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-apex-blue">
                ← {litLabel}
              </span>
            )}
          </div>
          {meta && (
            <div className="text-[11px] text-apex-fg-tertiary">{meta}</div>
          )}
        </header>
      )}
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </section>
  )
}
