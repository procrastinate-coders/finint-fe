import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react'
import type { ServedBrief } from '@/lib/api/contracts'
import { DASH, formatPct, formatPercentile } from '@/lib/format'
import { oiStateInfo } from '@/lib/mcx/oi-state'
import { cn } from '@/lib/utils'
import { Section } from './Section'
import { scrollToSection } from './useScrollSpy'

type ScanRow = NonNullable<ServedBrief['scan']>[number]

const COLS =
  'grid grid-cols-[28px_minmax(0,1fr)_150px_88px_60px] items-center gap-x-4'

/**
 * The SCAN BOARD — all 9 mains, ranked by HOW MUCH MOVED (not what to trade —
 * law 4). Tight and left-aligned (not floating in a full-width void). Deep-set
 * rows are clickable — jump straight to that instrument's read. Non-deep rows
 * show NUMBERS WITH NO NARRATIVE (the honest full picture). Tier-B implied_open /
 * COT are null BY DESIGN → "—" / "no ref", never fabricated, never hidden.
 */
export function ScanBoard({
  rows,
  deepRead,
  anchorId,
}: {
  rows: ScanRow[]
  deepRead: Set<string>
  anchorId: (instrument: string) => string
}) {
  const ordered = [...rows].sort((a, b) => a.rank - b.rank)
  return (
    <Section
      id="board"
      title="The board"
      subtitle="all 9 mains · ranked by how much moved"
    >
      <div className="max-w-[760px] overflow-hidden rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary">
        <div
          className={cn(
            COLS,
            'border-b-[0.5px] border-apex-border-subtle px-4 py-2.5 text-[10px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary',
          )}
        >
          <span className="text-right">#</span>
          <span>Instrument</span>
          <span>Positioning</span>
          <span className="text-right">Impl. open</span>
          <span className="text-right">COT</span>
        </div>
        {ordered.map((r) => {
          const info = oiStateInfo(r.oi_state)
          const tierB = r.tier !== 'A'
          const hasRead = deepRead.has(r.instrument)
          const body = (
            <>
              <span className="text-right text-[11px] text-apex-fg-tertiary">
                {r.rank}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-medium text-apex-fg">{r.instrument}</span>
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase',
                    tierB ? 'text-apex-fg-tertiary' : 'text-apex-blue',
                  )}
                >
                  {tierB ? 'B' : 'A'}
                </span>
                {hasRead && (
                  <ChevronRight
                    className="size-3.5 text-apex-fg-tertiary opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden
                  />
                )}
              </span>
              <span className="min-w-0">
                {info ? (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'truncate text-[12px]',
                        info.building
                          ? 'font-medium text-apex-fg'
                          : 'text-apex-fg-secondary',
                      )}
                    >
                      {info.label}
                    </span>
                    <MoveGlyph price={info.price} oi={info.oi} />
                  </span>
                ) : (
                  <span className="text-apex-fg-tertiary">{DASH}</span>
                )}
              </span>
              <span className="apex-tabular text-right text-[13px] text-apex-fg-secondary">
                {formatPct(r.implied_open_pct, { decimals: 2 })}
              </span>
              <span className="text-right">
                {tierB ? (
                  <span className="text-[10px] text-apex-fg-tertiary/80">
                    no ref
                  </span>
                ) : (
                  <span className="apex-tabular text-[13px] text-apex-fg-secondary">
                    {formatPercentile(r.cot_percentile)}
                  </span>
                )}
              </span>
            </>
          )
          const cls = cn(
            COLS,
            'border-b-[0.5px] border-apex-border-subtle px-4 py-2.5 text-[13px] transition-colors last:border-b-0',
            tierB && 'opacity-70',
          )
          return hasRead ? (
            <button
              key={r.instrument}
              type="button"
              onClick={() => scrollToSection(anchorId(r.instrument))}
              className={cn(
                cls,
                'group w-full text-left hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-blue',
              )}
            >
              {body}
            </button>
          ) : (
            <div key={r.instrument} className={cls}>
              {body}
            </div>
          )
        })}
      </div>
      <p className="mt-2.5 max-w-[760px] text-[11px] leading-[15px] text-apex-fg-tertiary">
        Tier-B (ZINC · ALUMINIUM · LEAD · NICKEL) is LME-priced — no international
        reference and no CFTC COT, so implied open and percentile read “—” by
        design.
      </p>
    </Section>
  )
}

/** Neutral descriptive arrows — the observed move, never a buy/sell direction. */
function MoveGlyph({ price, oi }: { price: 'up' | 'down'; oi: 'up' | 'down' }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-[9px] uppercase text-apex-fg-tertiary">
      <span className="inline-flex items-center gap-0.5">
        px
        {price === 'up' ? (
          <ArrowUp className="size-2.5" aria-hidden />
        ) : (
          <ArrowDown className="size-2.5" aria-hidden />
        )}
      </span>
      <span className="inline-flex items-center gap-0.5">
        OI
        {oi === 'up' ? (
          <ArrowUp className="size-2.5" aria-hidden />
        ) : (
          <ArrowDown className="size-2.5" aria-hidden />
        )}
      </span>
    </span>
  )
}
