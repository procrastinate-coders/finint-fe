import { TriangleAlert } from 'lucide-react'
import type { AgentRunBoardRow } from '@/lib/api/contracts'
import {
  formatFractionPct,
  formatNumber,
  formatPct,
  formatPercentile,
  formatSharePct,
  formatSignedNumber,
} from '@/lib/format'
import { extrasOf, premiumReading } from './stream-a-fields'

/**
 * The deterministic facts ONE instrument's four analysts read — rendered once,
 * above their prose, never repeated inside it.
 *
 * ⚠️ THIS IS THE INPUT; THE PROSE BELOW IT IS THE OUTPUT. Father is judging a
 * second pipeline, and the only way to judge it is to see the two as separate
 * objects. Every number here comes from `board[]` — the scan the agents read —
 * and NONE is ever parsed out of an agent's sentence.
 *
 * ⚠️ A fact the board does not carry is OMITTED, not zeroed and not dashed into
 * a column. The one exception is a value whose companion is missing: those are
 * named as withheld, because silence there would read as "not measured" when the
 * truth is "measured, but not safely reportable".
 */
export function BoardFacts({ row }: { row: AgentRunBoardRow | undefined }) {
  if (!row) {
    return (
      <div className="border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/30 px-4 py-2">
        <p className="flex items-start gap-2 text-[11.5px] leading-[16px] text-apex-fg-secondary">
          <TriangleAlert className="mt-px size-3.5 shrink-0 text-apex-yellow" aria-hidden />
          The board facts for this instrument are not served with the run. The reads
          below state numbers; they are NOT repeated as values here, because a
          number read out of a sentence is not a measurement.
        </p>
      </div>
    )
  }

  const x = extrasOf(row)
  const premium = premiumReading(x)

  return (
    <div className="border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/30 px-4 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
        <Tag>board</Tag>
        {row.total_oi != null && <Fact>OI {formatNumber(row.total_oi)}</Fact>}
        {row.oi_change != null && (
          <Fact>Δ {formatSignedNumber(row.oi_change)}</Fact>
        )}
        {/* ⚠️ The percentile and its caveat are ONE element — a bare percentile is
            a number whose meaning was never established. */}
        {row.cot_percentile != null && (
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 text-[12px]">
            <span className="apex-tabular text-apex-fg-secondary">
              COT {formatPercentile(row.cot_percentile)}
            </span>
            {row.cot_confidence && (
              <span className="inline-flex items-center gap-1 text-[10.5px] text-apex-yellow">
                <TriangleAlert className="size-3 shrink-0" aria-hidden />
                {row.cot_confidence}
              </span>
            )}
          </span>
        )}
        {row.implied_open_pct != null && (
          <Fact>implied open {formatPct(row.implied_open_pct, { decimals: 2 })}</Fact>
        )}
        {x.intl_change_pct != null && (
          <Fact>reference {formatPct(x.intl_change_pct, { decimals: 2 })}</Fact>
        )}
        {x.usdinr_change_pct != null && (
          <Fact>USD/INR {formatPct(x.usdinr_change_pct, { decimals: 2 })}</Fact>
        )}
      </div>

      {/* --- term structure + the roll ------------------------------------- */}
      {(x.term_structure != null ||
        x.near_next_spread != null ||
        x.sessions_to_expiry != null ||
        x.next_oi_share != null) && (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Tag>structure</Tag>
          {x.term_structure && (
            <span className="text-[12px] text-apex-fg-secondary">
              {x.term_structure}
            </span>
          )}
          {x.near_next_spread != null && (
            <Fact>
              near/next {formatSignedNumber(x.near_next_spread)}
              {x.near_next_spread_change != null && (
                <> ({formatSignedNumber(x.near_next_spread_change)} on the session)</>
              )}
            </Fact>
          )}
          {x.sessions_to_expiry != null && (
            <Fact>{formatNumber(x.sessions_to_expiry)} sessions to expiry</Fact>
          )}
          {/* A share of the two-contract book — unsigned; it is not a change. */}
          {x.next_oi_share != null && (
            <Fact>next contract holds {formatSharePct(x.next_oi_share)} of OI</Fact>
          )}
          {(x.spread_basis || x.roll_basis) && (
            <Basis>{[x.spread_basis, x.roll_basis].filter(Boolean).join(' · ')}</Basis>
          )}
        </div>
      )}

      {/* --- import-parity premium ----------------------------------------- */}
      {premium.kind !== 'absent' && (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Tag>premium</Tag>
          {premium.kind === 'z_unusable' ? (
            <>
              {premium.pct != null && (
                <Fact>{formatFractionPct(premium.pct)} to import parity</Fact>
              )}
              {/* ⚠️ A z with no sample size behind it is not a reading. */}
              <span className="inline-flex items-center gap-1 text-[11px] text-apex-yellow">
                <TriangleAlert className="size-3 shrink-0" aria-hidden />
                z withheld — the board carries no window for it, and a z-score
                without its sample size states more than it knows
              </span>
            </>
          ) : (
            <>
              {premium.pct != null && (
                <Fact>{formatFractionPct(premium.pct)} to import parity</Fact>
              )}
              {/* ⚠️ THE Z AND ITS WINDOW ARE ONE ELEMENT. 196 sessions against a
                  180 floor is close enough to the floor that the window is part
                  of the reading, not a footnote. */}
              {premium.z != null && premium.window != null && (
                <Fact>
                  z {formatSignedNumber(premium.z, { decimals: 2 })} over{' '}
                  {formatNumber(premium.window)} sessions
                </Fact>
              )}
              {premium.basis && <Basis>{premium.basis}</Basis>}
            </>
          )}
        </div>
      )}

      {/* --- levels + volatility ------------------------------------------- */}
      {(x.support_level != null ||
        x.resistance_level != null ||
        x.atr != null ||
        x.dist_to_support_atr != null) && (
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Tag>levels</Tag>
          {x.support_level != null && (
            <Fact>
              support {formatNumber(x.support_level)}
              {/* An ATR multiple is the comparable figure; raw points are not
                  comparable across instruments, so both are labelled. */}
              {x.dist_to_support_atr != null ? (
                <> ({formatNumber(x.dist_to_support_atr, { decimals: 2 })} ATR below)</>
              ) : (
                x.dist_to_support != null && (
                  <> ({formatNumber(x.dist_to_support)} points below — no ATR multiple)</>
                )
              )}
            </Fact>
          )}
          {x.resistance_level != null && (
            <Fact>
              resistance {formatNumber(x.resistance_level)}
              {x.dist_to_resistance_atr != null ? (
                <> ({formatNumber(x.dist_to_resistance_atr, { decimals: 2 })} ATR above)</>
              ) : (
                x.dist_to_resistance != null && (
                  <> ({formatNumber(x.dist_to_resistance)} points above — no ATR multiple)</>
                )
              )}
            </Fact>
          )}
          {x.atr != null && (
            <Fact>
              ATR {formatNumber(x.atr, { decimals: 0 })}
              {x.atr_avg != null && <> vs {formatNumber(x.atr_avg)} avg</>}
            </Fact>
          )}
          {x.cont_stale_sessions != null && x.cont_stale_sessions > 0 && (
            <span className="text-[11px] text-apex-yellow">
              continuous series stale {formatNumber(x.cont_stale_sessions)} sessions
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9.5px] font-medium uppercase tracking-[0.06em] text-apex-fg-tertiary">
      {children}
    </span>
  )
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="apex-tabular text-[12px] text-apex-fg-secondary">{children}</span>
  )
}

/** The backend's own words for how a figure was derived — rendered verbatim. */
function Basis({ children }: { children: React.ReactNode }) {
  return (
    <span className="basis-full text-[10.5px] leading-[15px] text-apex-fg-tertiary">
      {children}
    </span>
  )
}
