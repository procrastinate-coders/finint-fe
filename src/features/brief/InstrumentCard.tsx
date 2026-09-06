import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, GitCompareArrows, TriangleAlert } from 'lucide-react'
import type { ServedBrief } from '@/lib/api/contracts'
import {
  DASH,
  formatInr,
  formatNumber,
  formatPct,
  formatPercentile,
  formatSignedNumber,
  istDate,
} from '@/lib/format'
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
      <header className="flex items-start justify-between gap-3 border-b-[0.5px] border-apex-border-subtle px-5 py-3.5">
        <div className="min-w-0">
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
          {/* FIN-197/213: NAME the contract this read is about. On an expiry-day
              morning the card silently switches contract/price/levels — the brief
              must say which one. Null = the picker refused; never a stale contract. */}
          {ins.liquid_contract && (
            <div className="apex-tabular mt-1 text-[11.5px] text-apex-fg-secondary">
              {ins.liquid_contract}
              {ins.liquid_contract_expiry && (
                <span className="text-apex-fg-tertiary">
                  {' · expires '}
                  {istDate(ins.liquid_contract_expiry)}
                </span>
              )}
            </div>
          )}
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
            {/* FIN-213: OI MAGNITUDE — the thin-vs-deep signal (LEAD ~763 lots vs
                NATURALGAS ~34,072). Null = not served → omitted, never a 0. */}
            {(ins.total_oi != null || ins.oi_change != null) && (
              <p className="apex-tabular mt-1 text-[11px] text-apex-fg-tertiary">
                {ins.total_oi != null ? `${formatNumber(ins.total_oi)} lots` : DASH}
                {ins.oi_change != null && (
                  <span> · Δ {formatSignedNumber(ins.oi_change)}</span>
                )}
              </p>
            )}
            {/* FIN-216: oi_state is classified between consecutive STORED bars, so
                a skipped session turns a multi-day move into a false "overnight".
                Only the exception speaks — a true T-1 (1 session, or null) stays
                clean and unmarked. */}
            <SessionSpan n={ins.oi_gap_sessions} kind="oi" />
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
              <>
                {io && (
                  <p className="apex-tabular text-[10.5px] text-apex-fg-tertiary">
                    intl {formatPct(io.intl_change_pct, { decimals: 2 })} ·
                    USD/INR {formatPct(io.usdinr_change_pct, { decimals: 2 })}
                  </p>
                )}
                {/* FIN-216: the implied open is anchored to the prior CLOSE. When
                    that close is >1 session old, it is not "yesterday's" — the
                    FIN-201 mislabel in a new place. */}
                <SessionSpan n={ins.prior_close_sessions} kind="close" />
              </>
            )}
          </div>

          <div>
            <RailLabel>COT percentile</RailLabel>
            {ins.cot_percentile != null ? (
              <>
                <div className="apex-tabular mt-0.5 text-[16px] font-semibold text-apex-fg">
                  {formatPercentile(ins.cot_percentile)}
                </div>
                {/* FIN-195/213: the confidence caveat is INSEPARABLE from the
                    number. Base metals carry an LME-COTR proxy whose correlation
                    to price is unverified/weak; the percentile must never be read
                    without it. Tier-A CFTC names carry null → verified, no caveat. */}
                {ins.cot_confidence && (
                  <p className="mt-1 flex items-start gap-1 text-[10.5px] leading-[14px] text-apex-yellow">
                    <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />
                    {ins.cot_confidence}
                  </p>
                )}
                {pos?.cot_stance_label && !isWithheld(pos.cot_stance_label) && (
                  <p className="mt-0.5 text-[11px] leading-[15px] text-apex-fg-tertiary">
                    {pos.cot_stance_label}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-0.5 text-[11px] text-apex-fg-tertiary">
                {tierB ? 'no COT reference (LME-priced)' : 'no COT reference'}
              </p>
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

          {/* FIN-213: ATR with its own baseline — a range has no context without
              it. Null (e.g. continuous series stale) → omitted, never a 0. */}
          {(ins.atr != null || ins.atr_avg != null) && (
            <div>
              <RailLabel>ATR · daily range</RailLabel>
              <div className="apex-tabular mt-0.5 text-[13px] text-apex-fg-secondary">
                {ins.atr != null ? formatNumber(ins.atr) : DASH}
                {ins.atr_avg != null && (
                  <span className="text-apex-fg-tertiary">
                    {' · avg '}
                    {formatNumber(ins.atr_avg)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* FIN-193/213: LME is a CONTEXT LEVEL — explicitly NOT an implied open
              (base metals have no valid overnight move: metals.dev publishes before
              MCX's 11:30 PM close). EIA is a released FACT (as-of · WoW · direction).
              Verbatim from the backend's grounding string; null → omitted. */}
          {ins.lme_context && (
            <div>
              <RailLabel>LME reference</RailLabel>
              <p className="apex-tabular mt-0.5 text-[11.5px] leading-[16px] text-apex-fg-secondary">
                {ins.lme_context}
              </p>
              <p className="mt-0.5 text-[10px] leading-[14px] text-apex-fg-tertiary">
                context level — not an implied open
              </p>
            </div>
          )}
          {ins.eia_context && (
            <div>
              <RailLabel>EIA supply</RailLabel>
              <p className="mt-0.5 text-[11.5px] leading-[16px] text-apex-fg-secondary">
                {ins.eia_context}
              </p>
              <p className="mt-0.5 text-[10px] leading-[14px] text-apex-fg-tertiary">
                released weekly data — a fact, not a forecast
              </p>
            </div>
          )}

          {/* FIN-200/216: WHY this instrument earned one of the 4 cards. The deep
              set is 4 of 9, so "why these four" is a real question — and the basis
              is non-obvious (a thin Tier-B can take a card on OI+vol with no gap).
              Raw served scores, ordered by weight; the FE never re-derives the
              rank. All-null → omitted. */}
          <FactorProfile factors={ins.factors} />
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

/**
 * FIN-216: a multi-session comparison qualifier. Renders ONLY when the span is
 * > 1 (a true T-1 stays clean and unmarked; null / 1 → nothing). Amber caution —
 * the "day-over-day" read is a multi-SESSION net change, never overnight.
 */
function SessionSpan({
  n,
  kind,
}: {
  n: number | null | undefined
  kind: 'oi' | 'close'
}) {
  if (n == null || n <= 1) return null
  return (
    <p className="mt-1 flex items-start gap-1 text-[10.5px] leading-[14px] text-apex-yellow">
      <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden />
      {kind === 'oi'
        ? `net change over ${n} sessions — not overnight`
        : `anchored to a close ${n} sessions old — not yesterday`}
    </p>
  )
}

type Factors = NonNullable<Instrument['factors']>
// Ordered by the FIN-200 normalised weights so the emphasis isn't arbitrary.
const FACTOR_ROWS: { key: keyof Factors; label: string }[] = [
  { key: 'gap', label: 'gap' },
  { key: 'cot', label: 'cot' },
  { key: 'oi', label: 'oi' },
  { key: 'level', label: 'level' },
  { key: 'vol', label: 'vol' },
]

/**
 * FIN-200/216: the scanner's ranking basis — five raw served factor scores in
 * [0,1], shown as a compact bar profile ordered by weight. The FE renders the
 * scores; it NEVER re-derives the rank (the backend owns the weighting). A null
 * factor (Tier-B has no `gap`; a stale continuous series refuses others) reads as
 * an explicit "—", never a 0 bar. All-null → the block is omitted.
 */
function FactorProfile({ factors }: { factors: Factors | null | undefined }) {
  if (!factors || FACTOR_ROWS.every((f) => factors[f.key] == null)) return null
  return (
    <div>
      <RailLabel>
        <span title="The scanner's ranking basis (FIN-200), normalised to [0,1]. Weights: gap .333 · cot .259 · oi .222 · level .111 · vol .074.">
          Rank basis
        </span>
      </RailLabel>
      <div className="mt-1 space-y-1">
        {FACTOR_ROWS.map(({ key, label }) => {
          const v = factors[key]
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[9.5px] uppercase tracking-[0.04em] text-apex-fg-tertiary">
                {label}
              </span>
              {v == null ? (
                <span className="flex-1 text-[10px] text-apex-fg-tertiary/70">
                  {DASH}
                </span>
              ) : (
                <>
                  <span
                    className="relative h-1 flex-1 overflow-hidden rounded-full bg-apex-tertiary"
                    aria-hidden
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full bg-apex-fg-secondary"
                      style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }}
                    />
                  </span>
                  <span className="apex-tabular w-7 shrink-0 text-right text-[9.5px] text-apex-fg-tertiary">
                    {formatNumber(v, { decimals: 2 })}
                  </span>
                </>
              )}
            </div>
          )
        })}
      </div>
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
