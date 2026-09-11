import type { ReactNode } from 'react'
import type { AgentRunBoardRow } from '@/lib/api/contracts'
import {
  formatNumber,
  formatPct,
  formatPercentile,
  formatSharePct,
  formatSignedNumber,
  istDate,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { Spine } from './Spine'

/**
 * The board facts one instrument's analysts read — 48 typed fields, in SIX
 * LABELLED GROUPS on the page's spine.
 *
 * ⚠️ NOT ALL OF THEM IN THE TABLE. The table carries the five figures a reader
 * compares ACROSS instruments; everything else belongs here, where there is room
 * to label it and to carry its caveat. A 48-column table is not density, it is
 * a spreadsheet nobody reads.
 *
 * ⚠️ Every number comes from `board[]` — the scan the agents read — and NONE is
 * parsed out of an agent's sentence. A missing fact is omitted, never zeroed.
 */
export function BoardFacts({ row }: { row: AgentRunBoardRow | undefined }) {
  if (!row) {
    return (
      <p className="max-w-[72ch] text-[11.5px] leading-[1.5] text-apex-fg-secondary">
        The board facts for this instrument are not served with the run. The reads
        below state numbers; they are NOT repeated as values here, because a number
        read out of a sentence is not a measurement.
      </p>
    )
  }
  const b = row
  return (
    <div className="flex flex-col gap-3">
      <Group label="Positioning">
        <Fact k="Total OI" v={formatNumber(b.total_oi)} show={b.total_oi != null} />
        <Fact k="Δ OI" v={formatSignedNumber(b.oi_change)} show={b.oi_change != null} />
        <Fact
          k="OI gap"
          v={`${formatNumber(b.oi_gap_sessions)} sessions`}
          caveat={b.oi_gap_label}
          show={b.oi_gap_sessions != null}
        />
        {/* the percentile and its confidence are ONE fact, always */}
        <Fact
          k="COT percentile"
          v={formatPercentile(b.cot_percentile)}
          caveat={b.cot_confidence}
          show={b.cot_percentile != null}
        />
      </Group>

      {/* ⚠️ WHERE TODAY'S TENSION LIVES. A span of more than one day means the
          move was not overnight, and the fact is flagged in place rather than
          left for the reader to notice inside a paragraph. */}
      <Group label="Overnight">
        <Fact
          k="Implied open"
          v={formatPct(b.implied_open_pct)}
          caveat={b.implied_open_span_label}
          flagged={(b.implied_open_span_days ?? 0) > 1}
          show={b.implied_open_pct != null}
        />
        <Fact
          k="Reference"
          v={formatPct(b.intl_change_pct)}
          caveat={b.intl_span_label}
          show={b.intl_change_pct != null}
        />
        <Fact
          k="USD/INR"
          v={formatPct(b.usdinr_change_pct)}
          caveat={b.usdinr_span_label}
          flagged={(b.usdinr_span_days ?? 0) > 1}
          show={b.usdinr_change_pct != null}
        />
        {/* ⚠️ `prior_close_sessions` is NOT on AgentRunBoardRow — it is typed on
            the readiness BoardRow only, so it is not read here. Reaching for it
            off the passthrough would be reading an untyped key. The span fields
            above carry the same fact and ARE served. */}
      </Group>

      <Group label="Structure" basis={[b.spread_basis, b.roll_basis].filter(Boolean).join(' · ')}>
        <Fact k="Term structure" v={b.term_structure ?? ''} sans show={!!b.term_structure} />
        <Fact
          k="Near/next spread"
          v={formatSignedNumber(b.near_next_spread, { decimals: 2 })}
          show={b.near_next_spread != null}
        />
        <Fact
          k="Spread change"
          v={formatSignedNumber(b.near_next_spread_change, { decimals: 2 })}
          show={b.near_next_spread_change != null}
        />
        <Fact
          k="Sessions to expiry"
          v={formatNumber(b.sessions_to_expiry)}
          show={b.sessions_to_expiry != null}
        />
        <Fact
          k="Next contract OI"
          v={formatSharePct(b.next_oi_share)}
          show={b.next_oi_share != null}
        />
      </Group>

      <Group label="Premium" basis={b.premium_basis}>
        <Fact
          k="To import parity"
          v={formatPct(b.premium_pct)}
          show={b.premium_pct != null}
        />
        {/* ⚠️ THE Z NEVER RENDERS WITHOUT ITS WINDOW. The window is per
            instrument and sits close to its own floor, so it is part of the
            reading, not a footnote. */}
        {b.premium_z != null && b.premium_window != null && (
          <Fact
            k="Premium z"
            v={`${formatSignedNumber(b.premium_z, { decimals: 2 })} / ${formatNumber(b.premium_window)} sessions`}
            show
          />
        )}
        {b.premium_z != null && b.premium_window == null && (
          <Fact k="Premium z" v="—" caveat="withheld — no window for it" flagged show />
        )}
        <Fact
          k="Import duty"
          v={formatSharePct(b.import_duty, { decimals: 0 })}
          show={b.import_duty != null}
        />
      </Group>

      <Group label="Levels">
        <Fact
          k="Support"
          v={formatNumber(b.support_level, { decimals: 2 })}
          caveat={
            b.dist_to_support_atr != null
              ? `${formatNumber(b.dist_to_support_atr, { decimals: 2 })} ATR below`
              : b.dist_to_support != null
                ? `${formatNumber(b.dist_to_support, { decimals: 2 })} points below — no ATR multiple`
                : null
          }
          show={b.support_level != null}
        />
        <Fact
          k="Resistance"
          v={formatNumber(b.resistance_level, { decimals: 2 })}
          caveat={
            b.dist_to_resistance_atr != null
              ? `${formatNumber(b.dist_to_resistance_atr, { decimals: 2 })} ATR above`
              : b.dist_to_resistance != null
                ? `${formatNumber(b.dist_to_resistance, { decimals: 2 })} points above — no ATR multiple`
                : null
          }
          show={b.resistance_level != null}
        />
        <Fact
          k="ATR"
          v={formatNumber(b.atr, { decimals: 2 })}
          caveat={b.atr_avg != null ? `avg ${formatNumber(b.atr_avg, { decimals: 2 })}` : null}
          show={b.atr != null}
        />
        <Fact
          k="Continuous stale"
          v={`${formatNumber(b.cont_stale_sessions)} sessions`}
          flagged={(b.cont_stale_sessions ?? 0) > 0}
          show={b.cont_stale_sessions != null}
        />
      </Group>

      <Group label="External">
        <Fact
          k="LME 3M"
          v={formatNumber(b.lme_value, { decimals: 2 })}
          caveat={b.lme_as_of ? `as of ${istDate(b.lme_as_of)}` : null}
          show={b.lme_value != null}
        />
        <Fact k="LME change" v={formatPct(b.lme_change_pct)} show={b.lme_change_pct != null} />
        <Fact
          k="EIA inventory"
          v={formatNumber(b.eia_value)}
          caveat={b.eia_as_of ? `as of ${istDate(b.eia_as_of)}` : null}
          show={b.eia_value != null}
        />
        <Fact k="EIA w/w" v={formatSignedNumber(b.eia_wow)} show={b.eia_wow != null} />
      </Group>
    </div>
  )
}

function Group({
  label,
  basis,
  children,
}: {
  label: string
  basis?: string | null
  children: ReactNode
}) {
  const kids = Array.isArray(children) ? children.flat() : [children]
  const any = kids.some((c) => c && typeof c === 'object' && 'props' in c && c.props.show)
  if (!any) return null
  return (
    <Spine label={label}>
      <dl className="grid gap-x-6 gap-y-1 [grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]">
        {children}
      </dl>
      {basis && (
        <p className="mt-2 text-[11px] leading-[1.5] text-apex-fg-tertiary">{basis}</p>
      )}
    </Spine>
  )
}

function Fact({
  k,
  v,
  caveat,
  flagged,
  sans,
  show,
}: {
  k: string
  v: string
  caveat?: string | null
  flagged?: boolean
  sans?: boolean
  show?: boolean
}) {
  if (!show) return null
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 border-b-[0.5px] border-apex-border-subtle/45 py-[3px]">
      <dt className="whitespace-nowrap text-[11px] text-apex-fg-tertiary">{k}</dt>
      <dd
        className={cn(
          'm-0 min-w-0 break-words text-right text-[13px]',
          sans ? '' : 'apex-tabular',
          flagged ? 'text-apex-yellow' : 'text-apex-fg',
        )}
      >
        {v}
        {caveat && (
          <span className="mt-px block text-[11px] leading-[1.35] text-apex-yellow [font-family:var(--apex-font-sans)] [font-variant-numeric:normal]">
            {caveat}
          </span>
        )}
      </dd>
    </div>
  )
}
