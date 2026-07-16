import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react'
import type { ServedBrief } from '@/lib/api/contracts'
import { DASH, formatNumber, formatPct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Prose } from './Withheld'
import { isWithheld } from './sentinel'
import { Section } from './Section'

type Market = ServedBrief['market']
type Macro = { value?: number; change_pct?: number; note?: string | null }

/**
 * The MARKET LAYER — a research-note opening. The session read is the LEAD (a
 * pull-quote, constrained to a readable measure). A tight backdrop strip carries
 * the numbers WITH provenance. Catalysts are a two-up grid, each LINKED to its
 * source (a claim without a source is the disease). Regime-change is a flag.
 */
export function MarketLayer({ market }: { market: Market }) {
  const regime = market.regime
  const flagged = regime?.regime_change || regime?.is_new
  const b = market.backdrop

  return (
    <Section id="market" title="Market" subtitle="the overnight backdrop">
      {/* LEAD — the session read */}
      <div className="rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-apex-fg-tertiary">
            Session read
          </span>
          {flagged && (
            <span className="rounded-[5px] bg-apex-blue-tint px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-apex-blue">
              {regime?.regime_change ? 'Regime change' : 'New regime'}
            </span>
          )}
        </div>
        <div className="max-w-[70ch] border-l-2 border-apex-border-strong pl-4">
          <Prose
            value={market.session_read}
            className="text-[16.5px] leading-[26px] text-apex-fg"
          />
          {regime?.headline &&
            !isWithheld(regime.headline) &&
            regime.headline !== market.session_read && (
              <p className="mt-2 text-[13px] leading-[19px] text-apex-fg-tertiary">
                {regime.headline}
              </p>
            )}
        </div>

        {/* Backdrop strip — numbers with provenance */}
        <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-[10px] border-[0.5px] border-apex-border-subtle sm:grid-cols-3">
          <BackdropCell label="USD/INR" macro={b?.usd_inr} />
          <BackdropCell label="DXY" macro={b?.dxy} />
          <div className="border-t-[0.5px] border-apex-border-subtle bg-apex-secondary/30 px-3.5 py-2.5 sm:border-t-0 sm:border-l-[0.5px]">
            <div className="text-[10px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
              Risk tone
            </div>
            <div className="mt-0.5 text-[15px] font-semibold capitalize text-apex-fg">
              {b?.risk_tone?.value ?? DASH}
            </div>
            {b?.risk_tone?.note && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-[15px] text-apex-fg-tertiary">
                {b.risk_tone.note}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Catalysts — two-up, each linked to its source */}
      <div className="mt-5">
        <SubHead>
          Overnight catalysts
          <Count n={market.catalysts?.length ?? 0} />
        </SubHead>
        {(market.catalysts?.length ?? 0) === 0 ? (
          <p className="text-[12.5px] text-apex-fg-secondary">
            No material catalysts crossed the overnight window — a positioning-led
            morning.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {market.catalysts?.map((c, i) => (
              <div
                key={i}
                className="group flex flex-col gap-2 rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary p-3.5 transition-colors hover:border-apex-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <DirectionTag direction={c.direction} />
                  {c.age_label && (
                    <span className="apex-tabular shrink-0 text-[11px] text-apex-fg-tertiary">
                      {c.age_label}
                    </span>
                  )}
                </div>
                <p className="text-[13px] leading-[18px] text-apex-fg">
                  {c.headline}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-apex-fg-tertiary">
                  {(c.instruments?.length ?? 0) > 0 && (
                    <span className="apex-tabular">
                      {c.instruments?.join(' · ')}
                    </span>
                  )}
                  {c.source?.url ? (
                    <a
                      href={c.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-apex-blue transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                      {c.source.name ?? 'source'}
                    </a>
                  ) : (
                    <span className="text-apex-fg-tertiary/70">
                      {c.source?.name ?? 'no source'} — no link
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cross-instrument */}
      {(market.cross_instrument?.length ?? 0) > 0 && (
        <div className="mt-5">
          <SubHead>Cross-instrument</SubHead>
          <ul className="max-w-[80ch] space-y-2">
            {market.cross_instrument?.map((note, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-[12.5px] leading-[19px] text-apex-fg-secondary"
              >
                <span
                  className="mt-[7px] size-1 shrink-0 rounded-full bg-apex-fg-tertiary"
                  aria-hidden
                />
                {isWithheld(note) ? <Prose value={note} /> : note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-apex-fg-tertiary">
      {children}
    </h3>
  )
}

function Count({ n }: { n: number }) {
  return <span className="text-apex-fg-tertiary/60">· {n}</span>
}

function BackdropCell({ label, macro }: { label: string; macro?: Macro | null }) {
  return (
    <div className="border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/30 px-3.5 py-2.5 sm:border-b-0 sm:border-r-[0.5px]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
          {label}
        </span>
        <span className="apex-tabular text-[11px] text-apex-fg-tertiary">
          {formatPct(macro?.change_pct, { decimals: 2 })}
        </span>
      </div>
      <div className="apex-tabular mt-0.5 text-[16px] font-semibold text-apex-fg">
        {formatNumber(macro?.value, { decimals: 2 })}
      </div>
      {macro?.note && (
        <div className="truncate text-[10px] text-apex-fg-tertiary">
          {macro.note}
        </div>
      )}
    </div>
  )
}

/** Descriptive of the news, NOT a recommendation — neutral tone, no green/red. */
function DirectionTag({ direction }: { direction: string }) {
  const down = direction?.toLowerCase() === 'bearish'
  const up = direction?.toLowerCase() === 'bullish'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-apex-tertiary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.03em] text-apex-fg-secondary',
      )}
    >
      {up && <ArrowUpRight className="size-3" aria-hidden />}
      {down && <ArrowDownRight className="size-3" aria-hidden />}
      {direction}
    </span>
  )
}
