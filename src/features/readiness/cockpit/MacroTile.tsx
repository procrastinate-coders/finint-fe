import type { MacroRow } from '@/lib/api/contracts'
import { formatNumber, istDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Tile } from './Tile'

/**
 * The MACRO tile (Bento Cockpit). The backdrop, calm — but LEGIBLE: even padded
 * cells (no hairline-gap grid with an odd empty slot), readable labels, and each
 * value carries its source + as-of so nothing is hidden. `carried_forward` is a
 * visible flag (e.g. DXY on FRED's lag). Hovering the matching source in the rail
 * highlights the indicator(s) it produces.
 */

const LABEL: Record<string, string> = {
  BREAKEVEN_10Y: '10Y breakeven',
  COMEX: 'COMEX gold',
  COMEX_OVERNIGHT_EXPECTED: 'COMEX o/n exp.',
  DXY: 'DXY',
  INDIA_VIX: 'India VIX',
  US10Y: 'US 10Y',
  USDINR: 'USD/INR',
}

const SOURCE_LABEL: Record<string, string> = {
  YAHOO_V8: 'Yahoo',
  TWELVE_DATA: 'TwelveData',
  DERIVED: 'derived',
  FRED: 'FRED',
  NSE: 'NSE',
}

// which indicators a hovered source produces (for the lineage highlight)
function litFor(source: string | null): Set<string> {
  switch (source) {
    case 'dxy':
      return new Set(['DXY'])
    case 'usdinr':
      return new Set(['USDINR'])
    case 'comex':
      return new Set(['COMEX', 'COMEX_OVERNIGHT_EXPECTED'])
    case 'macro_continuity':
      return new Set(['COMEX', 'DXY', 'USDINR'])
    default:
      return new Set()
  }
}

export function MacroTile({
  rows,
  lit,
  hoveredSource,
  delayMs,
}: {
  rows: MacroRow[]
  lit: boolean
  hoveredSource: string | null
  delayMs?: number
}) {
  const litSet = litFor(hoveredSource)
  return (
    <Tile
      title="Macro"
      meta="backdrop"
      lit={lit}
      litLabel="FRED / NSE"
      delayMs={delayMs}
      bodyClassName="min-h-0 overflow-y-auto p-3"
    >
      <div className="grid grid-cols-2 gap-2">
        {rows.map((m) => {
          const on = litSet.has(m.indicator)
          const src = m.source
            ? (SOURCE_LABEL[m.source] ?? m.source)
            : null
          return (
            <div
              key={m.indicator}
              className={cn(
                'flex flex-col gap-1 rounded-[8px] border-[0.5px] p-2.5 transition-colors',
                on
                  ? 'border-apex-blue/50 bg-apex-blue-tint'
                  : 'border-apex-border bg-apex-secondary/40',
              )}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[10px] font-medium uppercase tracking-[0.03em] text-apex-fg-secondary">
                  {LABEL[m.indicator] ?? m.indicator}
                </span>
                {m.carried_forward && (
                  <span
                    className="size-1.5 shrink-0 rounded-full bg-apex-orange"
                    aria-label="carried forward"
                  />
                )}
              </div>
              <span className="apex-tabular text-[16px] font-semibold leading-none text-apex-fg">
                {formatNumber(m.value, { decimals: 2 })}
              </span>
              <span className="truncate text-[9px] text-apex-fg-tertiary">
                {src ?? '—'}
                {m.as_of && ` · ${istDate(m.as_of)}`}
                {m.carried_forward && (
                  <span className="text-apex-orange/90"> · carried fwd</span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Tile>
  )
}
