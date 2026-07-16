import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, GitCompareArrows } from 'lucide-react'
import type { ServedBrief } from '@/lib/api/contracts'
import { DASH, formatInr, formatPct, formatPercentile } from '@/lib/format'
import { oiStateInfo } from '@/lib/mcx/oi-state'
import { cn } from '@/lib/utils'
import { Prose } from './Withheld'
import { isWithheld } from './sentinel'

type Instrument = NonNullable<ServedBrief['instruments']>[number]

/**
 * A per-instrument DEEP READ. A clean stat RAIL (OI state as the hero — Father's
 * core language, never buried) beside a readable prose column at a comfortable
 * measure. DIVERGENCE — a bullish gap into a crowded/liquidating book — gets its
 * own accented callout; it is the POINT of the pass, not a flattened field. Every
 * text field is withheld-aware; Tier-B nulls render as an honest gap.
 */
export function InstrumentCard({ ins, id }: { ins: Instrument; id: string }) {
  const info = oiStateInfo(ins.oi_state)
  const tierB = ins.data_tier !== 'A'
  const pos = ins.ai_read?.positioning
  const io = ins.implied_open

  return (
    <article
      id={id}
      className="scroll-mt-[140px] overflow-hidden rounded-[16px] border-[0.5px] border-apex-border bg-apex-primary"
    >
      <header className="flex items-center justify-between gap-3 border-b-[0.5px] border-apex-border-subtle px-5 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-[18px] font-semibold tracking-tight text-apex-fg">
            {ins.instrument}
          </h3>
          <span className="text-[12px] text-apex-fg-tertiary">{ins.name}</span>
          <span
            className={cn(
              'rounded-[4px] px-1 py-px text-[9px] font-semibold uppercase',
              tierB
                ? 'bg-apex-tertiary text-apex-fg-tertiary'
                : 'bg-apex-blue-tint text-apex-blue',
            )}
          >
            {tierB ? 'B · LME' : 'A'}
          </span>
        </div>
        {ins.ai_read?.guard_failed && (
          <span className="inline-flex items-center gap-1 rounded-[5px] bg-apex-orange-tint px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.03em] text-apex-orange">
            partly withheld
          </span>
        )}
      </header>

      <div className="grid lg:grid-cols-[248px_minmax(0,1fr)]">
        {/* STAT RAIL */}
        <div className="space-y-4 border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/25 p-5 lg:border-b-0 lg:border-r-[0.5px]">
          <div>
            <RailLabel>Positioning · OI</RailLabel>
            <div className="mt-0.5 flex items-center gap-2">
              <span
                className={cn(
                  'text-[16px] font-semibold',
                  info?.building ? 'text-apex-fg' : 'text-apex-fg-secondary',
                )}
              >
                {info?.label ?? ins.oi_state ?? DASH}
              </span>
              {info && <MoveGlyph price={info.price} oi={info.oi} />}
            </div>
            {info && (
              <p className="mt-1 text-[11px] leading-[15px] text-apex-fg-tertiary">
                {info.meaning}
              </p>
            )}
          </div>

          <div>
            <RailLabel>Implied open</RailLabel>
            <div className="apex-tabular mt-0.5 text-[19px] font-semibold text-apex-fg">
              {formatPct(io?.implied_open_pct, { decimals: 2 })}
            </div>
            {tierB ? (
              <p className="text-[11px] text-apex-fg-tertiary">
                no international reference (LME-priced)
              </p>
            ) : (
              io && (
                <p className="apex-tabular text-[10.5px] text-apex-fg-tertiary">
                  intl {formatPct(io.intl_change_pct, { decimals: 2 })} · USD/INR{' '}
                  {formatPct(io.usdinr_change_pct, { decimals: 2 })}
                </p>
              )
            )}
          </div>

          <div>
            <RailLabel>COT percentile</RailLabel>
            {tierB ? (
              <p className="mt-0.5 text-[11px] text-apex-fg-tertiary">
                no CFTC COT (LME-priced)
              </p>
            ) : (
              <>
                <div className="apex-tabular mt-0.5 text-[16px] font-semibold text-apex-fg">
                  {formatPercentile(ins.cot_percentile)}
                </div>
                {pos?.cot_stance && !isWithheld(pos.cot_stance) && (
                  <p className="mt-0.5 text-[11px] leading-[15px] text-apex-fg-tertiary">
                    {pos.cot_stance}
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <RailLabel>Levels</RailLabel>
            <div className="apex-tabular mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-apex-fg-secondary">
              <span>
                <span className="text-apex-fg-tertiary">S </span>
                {(ins.levels?.support ?? []).map((v) => formatInr(v)).join(' · ') ||
                  DASH}
              </span>
              <span>
                <span className="text-apex-fg-tertiary">R </span>
                {(ins.levels?.resistance ?? [])
                  .map((v) => formatInr(v))
                  .join(' · ') || DASH}
              </span>
            </div>
          </div>
        </div>

        {/* PROSE */}
        <div className="space-y-4 p-5">
          <Field label="What changed">
            <Prose
              value={ins.ai_read?.what_changed}
              className="text-[13px] leading-[20px] text-apex-fg"
            />
          </Field>

          <Field label="The read">
            <Prose
              value={ins.ai_read?.narrative}
              className="max-w-[72ch] text-[13.5px] leading-[21px] text-apex-fg-secondary"
            />
          </Field>

          {/* DIVERGENCE — the tension, given weight (never flattened) */}
          {pos?.divergence_flag && pos.divergence_note && (
            <div className="rounded-[10px] border-l-2 border-apex-yellow bg-apex-yellow-tint px-4 py-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-apex-yellow">
                <GitCompareArrows className="size-3.5" aria-hidden />
                Divergence — tension, not confirmation
              </div>
              <div className="mt-1 max-w-[72ch]">
                <Prose
                  value={pos.divergence_note}
                  className="text-[12.5px] leading-[19px] text-apex-fg-secondary"
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Watch">
              <Prose
                value={ins.ai_read?.watch}
                className="text-[12.5px] leading-[19px] text-apex-fg-secondary"
              />
            </Field>
            <Field label="Why it’s in the read">
              <Prose
                value={ins.ai_read?.why}
                className="text-[12.5px] leading-[19px] text-apex-fg-secondary"
              />
            </Field>
          </div>

          {ins.ai_read?.cross_instrument_note &&
            !isWithheld(ins.ai_read.cross_instrument_note) && (
              <Field label="Vs the complex">
                <p className="max-w-[72ch] text-[12.5px] leading-[19px] text-apex-fg-tertiary">
                  {ins.ai_read.cross_instrument_note}
                </p>
              </Field>
            )}
        </div>
      </div>
    </article>
  )
}

/** A deep-set instrument the run never wrote (a PARTIAL run died mid-write).
 * Honest placeholder — never a fabricated read, never a hidden card. */
export function MissingInstrumentCard({
  name,
  id,
}: {
  name: string
  id: string
}) {
  return (
    <article
      id={id}
      className="scroll-mt-[140px] rounded-[16px] border-[0.5px] border-dashed border-apex-border bg-apex-secondary/25 px-5 py-4"
    >
      <div className="flex items-baseline gap-2.5">
        <h3 className="text-[18px] font-semibold text-apex-fg">{name}</h3>
        <span className="text-[10px] font-medium uppercase tracking-[0.04em] text-apex-orange">
          read not produced
        </span>
      </div>
      <p className="mt-1 max-w-[72ch] text-[12.5px] leading-[19px] text-apex-fg-secondary">
        This instrument was in the deep set, but the run ended before its read was
        written. Its numbers are on the board above; the AI read is not available
        for this brief.
      </p>
    </article>
  )
}

function RailLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
        {label}
      </div>
      {children}
    </div>
  )
}

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
