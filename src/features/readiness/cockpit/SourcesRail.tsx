import { RotateCw } from 'lucide-react'
import type { ReadinessSource } from '@/lib/api/contracts'
import { Tile } from './Tile'
import { sourceFeeds } from './provenance'

/**
 * The SOURCES rail (the inputs). Compact status per source (the dot carries
 * state); hovering a source (1) lights up the evidence tile it PRODUCES (lineage
 * — "where the board comes from") and (2) reveals its verbatim note in the footer
 * (focus+context — the honest note isn't lost, just not shouting). A refreshable
 * source is clickable — click the red input to fix it (kite → modal, others →
 * spine refresh).
 */

function shortState(s: ReadinessSource): string {
  if (s.status === 'green') return 'fresh'
  if (s.status === 'amber') return 'lagging'
  return s.key === 'kite' ? 'expired' : 'stale'
}

const DOT: Record<string, string> = {
  green: 'bg-apex-green',
  amber: 'bg-apex-yellow',
  red: 'bg-apex-red',
}

export function SourcesRail({
  sources,
  hovered,
  onHover,
  onAction,
  delayMs,
}: {
  sources: ReadinessSource[]
  hovered: string | null
  onHover: (key: string | null) => void
  onAction?: (source: ReadinessSource) => void
  delayMs?: number
}) {
  const active = sources.find((s) => s.key === hovered) ?? null
  const feeds = active ? sourceFeeds(active.key) : null

  return (
    <Tile
      title="Sources"
      meta={`${sources.length} inputs`}
      delayMs={delayMs}
      bodyClassName="flex flex-col"
    >
      <ul className="flex-1 px-1.5">
        {sources.map((s) => {
          const on = hovered === s.key
          const actionable = !!(onAction && s.action && s.status !== 'green')
          return (
            <li key={s.key}>
              <button
                type="button"
                onMouseEnter={() => onHover(s.key)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(s.key)}
                onBlur={() => onHover(null)}
                onClick={actionable ? () => onAction!(s) : undefined}
                className={cnRow(on)}
              >
                <span
                  className={`size-2 shrink-0 rounded-full ${DOT[s.status] ?? 'bg-apex-fg-tertiary'} ${s.status === 'red' ? 'animate-apex-pulse' : ''}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-left text-[13px] text-apex-fg">
                  {s.label}
                </span>
                {actionable && on ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-apex-yellow">
                    <RotateCw className="size-3" aria-hidden />
                    refresh
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] text-apex-fg-tertiary">
                    {shortState(s)}
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* focus footer — the hovered source's verbatim note + what it feeds */}
      <div className="mx-3 mb-3 mt-1 min-h-[64px] rounded-[10px] border-[0.5px] border-apex-border-subtle bg-apex-secondary/40 p-3">
        {active ? (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[11px] font-medium text-apex-fg">
                {active.label}
              </span>
              {feeds && (
                <span className="text-[10px] uppercase tracking-[0.04em] text-apex-blue">
                  feeds → {feeds}
                </span>
              )}
              {active.critical && (
                <span className="rounded-[4px] bg-apex-tertiary px-1 py-px text-[9px] font-medium uppercase tracking-[0.03em] text-apex-fg-secondary">
                  core
                </span>
              )}
              {active.blocks_on_red && (
                <span className="rounded-[4px] bg-apex-red-tint px-1 py-px text-[9px] font-medium uppercase tracking-[0.03em] text-apex-red">
                  gates generation
                </span>
              )}
            </div>
            <p className="text-[11px] leading-[15px] text-apex-fg-secondary">
              {active.note}
            </p>
          </>
        ) : (
          <p className="text-[11px] leading-[15px] text-apex-fg-tertiary">
            Hover a source to see its note and what it produces.
          </p>
        )}
      </div>
    </Tile>
  )
}

function cnRow(on: boolean): string {
  return [
    'flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue',
    on ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]',
  ].join(' ')
}
