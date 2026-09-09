import { TriangleAlert } from 'lucide-react'
import type { AgentRunBoardRow } from '@/lib/api/contracts'
import {
  formatNumber,
  formatPct,
  formatPercentile,
  formatSharePct,
  formatSignedNumber,
  istDate,
} from '@/lib/format'

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
 *
 * All 39 fields come straight off the GENERATED contract — `AgentRunBoardRow` is
 * flat and typed end to end, so there is no local schema between this and the
 * spec. The `stream-a-fields.ts` shim that read them off `.passthrough()` while
 * the backend shipped nine is deleted.
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

  const premium = premiumReading(row)

  return (
    <div className="border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/30 px-4 py-2.5">
      {/* --- positioning + the close ---------------------------------------- */}
      <Row tag="board">
        {row.total_oi != null && <Fact>OI {formatNumber(row.total_oi)}</Fact>}
        {row.oi_change != null && <Fact>Δ {formatSignedNumber(row.oi_change)}</Fact>}
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
        {row.last_close != null && (
          <Fact>
            close {formatNumber(row.last_close, { decimals: 2 })}
            {/* ⚠️ An UNSETTLED close is provisional — the exchange has not final­ised
                it. Saying so is the difference between a price and a placeholder,
                and it is the check the gate refuses on. */}
            {row.last_close_settled === false && (
              <span className="ml-1 text-[10.5px] text-apex-yellow">unsettled</span>
            )}
          </Fact>
        )}
      </Row>

      {/* --- the overnight legs --------------------------------------------- */}
      <Row
        tag="overnight"
        when={
          row.implied_open_pct != null ||
          row.intl_change_pct != null ||
          row.usdinr_change_pct != null
        }
      >
        {row.implied_open_pct != null && (
          <Fact>implied open {formatPct(row.implied_open_pct)}</Fact>
        )}
        {row.intl_change_pct != null && (
          <Fact>reference {formatPct(row.intl_change_pct)}</Fact>
        )}
        {row.usdinr_change_pct != null && (
          <Fact>USD/INR {formatPct(row.usdinr_change_pct)}</Fact>
        )}
      </Row>

      {/* --- term structure + the roll -------------------------------------- */}
      <Row
        tag="structure"
        when={
          row.term_structure != null ||
          row.near_next_spread != null ||
          row.sessions_to_expiry != null ||
          row.next_oi_share != null
        }
      >
        {row.term_structure && (
          <span className="text-[12px] text-apex-fg-secondary">{row.term_structure}</span>
        )}
        {row.near_next_spread != null && (
          <Fact>
            near/next {formatSignedNumber(row.near_next_spread, { decimals: 2 })}
            {row.near_next_spread_change != null && (
              <>
                {' '}
                ({formatSignedNumber(row.near_next_spread_change, { decimals: 2 })} on
                the session)
              </>
            )}
          </Fact>
        )}
        {row.sessions_to_expiry != null && (
          <Fact>{formatNumber(row.sessions_to_expiry)} sessions to expiry</Fact>
        )}
        {/* A share of the two-contract book — unsigned; it is not a change. */}
        {row.next_oi_share != null && (
          <Fact>next contract holds {formatSharePct(row.next_oi_share)} of OI</Fact>
        )}
        {(row.spread_basis || row.roll_basis) && (
          <Basis>{[row.spread_basis, row.roll_basis].filter(Boolean).join(' · ')}</Basis>
        )}
      </Row>

      {/* --- import-parity premium ------------------------------------------ */}
      <Row tag="premium" when={premium.kind !== 'absent'}>
        {premium.kind !== 'absent' && premium.pct != null && (
          // ⚠️ PERCENTAGE POINTS, like every sibling `_pct` on this board. It was
          // the one fraction until FIN-228 Stream C converted it; rendering it
          // through a fraction formatter now would print −1.58% as −0.0158%.
          <Fact>{formatPct(premium.pct)} to import parity</Fact>
        )}
        {premium.kind === 'z_unusable' ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-apex-yellow">
            <TriangleAlert className="size-3 shrink-0" aria-hidden />
            z withheld — the board carries no window for it, and a z-score without
            its sample size states more than it knows
          </span>
        ) : (
          premium.kind === 'shown' &&
          premium.z != null &&
          premium.window != null && (
            // ⚠️ THE Z AND ITS WINDOW ARE ONE ELEMENT. The window is PER INSTRUMENT
            // (GOLD 196, SILVER 216) against a 180 floor — close enough to the floor
            // that it is part of the reading, not a footnote.
            <Fact>
              z {formatSignedNumber(premium.z, { decimals: 2 })} over{' '}
              {formatNumber(premium.window)} sessions
            </Fact>
          )
        )}
        {premium.kind !== 'absent' && premium.basis && <Basis>{premium.basis}</Basis>}
      </Row>

      {/* --- levels + volatility -------------------------------------------- */}
      <Row
        tag="levels"
        when={
          row.support_level != null ||
          row.resistance_level != null ||
          row.atr != null ||
          row.cont_stale_sessions != null
        }
      >
        {row.support_level != null && (
          <Fact>
            support {formatNumber(row.support_level, { decimals: 2 })}
            <Distance atr={row.dist_to_support_atr} points={row.dist_to_support} where="below" />
          </Fact>
        )}
        {row.resistance_level != null && (
          <Fact>
            resistance {formatNumber(row.resistance_level, { decimals: 2 })}
            <Distance
              atr={row.dist_to_resistance_atr}
              points={row.dist_to_resistance}
              where="above"
            />
          </Fact>
        )}
        {row.atr != null ? (
          <Fact>
            ATR {formatNumber(row.atr, { decimals: 2 })}
            {row.atr_avg != null && <> vs {formatNumber(row.atr_avg, { decimals: 2 })} avg</>}
          </Fact>
        ) : (
          <span className="text-[11px] text-apex-yellow">
            no ATR on the board — nothing here can be sized against volatility
          </span>
        )}
        {row.cont_stale_sessions != null && row.cont_stale_sessions > 0 && (
          <span className="text-[11px] text-apex-yellow">
            continuous series stale {formatNumber(row.cont_stale_sessions)} sessions
          </span>
        )}
      </Row>

      {/* --- the LME reference (Tier B's whole international leg) ------------ */}
      <Row
        tag="LME"
        when={row.lme_value != null || row.lme_change_pct != null || row.lme_as_of != null}
      >
        {row.lme_value != null && <Fact>{formatNumber(row.lme_value, { decimals: 2 })}</Fact>}
        {row.lme_change_pct != null && <Fact>{formatPct(row.lme_change_pct)}</Fact>}
        {/* ⚠️ An as-of date is not decoration on a Tier B leg — LME 3M is the only
            international reference these four have, and its age is the reading. */}
        {row.lme_as_of && <Stamp>as of {istDate(row.lme_as_of)}</Stamp>}
      </Row>

      {/* --- the EIA inventory print (the energy pair) ----------------------- */}
      <Row
        tag="EIA"
        when={row.eia_value != null || row.eia_wow != null || row.eia_as_of != null}
      >
        {row.eia_value != null && <Fact>{formatNumber(row.eia_value)}</Fact>}
        {row.eia_wow != null && <Fact>w/w {formatSignedNumber(row.eia_wow)}</Fact>}
        {row.eia_as_of && <Stamp>as of {istDate(row.eia_as_of)}</Stamp>}
      </Row>
    </div>
  )
}

// ============================================================================
// ⚠️ THE PREMIUM Z NEVER TRAVELS WITHOUT ITS WINDOW
// ============================================================================
type PremiumReading =
  | { kind: 'absent' }
  /** A z with no sample size behind it is withheld, and the page says why. */
  | { kind: 'z_unusable'; pct: number | null | undefined; basis: string | null | undefined }
  | {
      kind: 'shown'
      pct: number | null | undefined
      z: number | null | undefined
      window: number | null | undefined
      basis: string | null | undefined
    }

/**
 * ⚠️ A Z-SCORE WITHOUT ITS SAMPLE SIZE IS FIN-215's DEFECT IN A NEW PLACE. The
 * window is per instrument and sits close to its own floor — 196 and 216 sessions
 * against a floor of 180 — so it is part of the reading, not a footnote. A
 * `premium_z` with no `premium_window` beside it is therefore WITHHELD and named
 * as withheld; it is never quietly printed as if the sample were established.
 *
 * The percentage needs no window and is shown either way. A window with no z is
 * not shown alone either: the backend refuses the z when the sample is short and
 * says so in `premium_basis`, which is rendered verbatim instead of summarised.
 *
 * ⚠️ THIS RULE OUTLIVED THE SHIM IT SHIPPED IN. `stream-a-fields.ts` existed only
 * to read fields off an untyped passthrough and is deleted; the rule is rendering
 * policy, so it lives with the rendering.
 */
function premiumReading(row: AgentRunBoardRow): PremiumReading {
  const hasZ = row.premium_z != null
  const hasWindow = row.premium_window != null
  if (!hasZ && row.premium_pct == null) return { kind: 'absent' }
  if (hasZ && !hasWindow) {
    return { kind: 'z_unusable', pct: row.premium_pct, basis: row.premium_basis }
  }
  return {
    kind: 'shown',
    pct: row.premium_pct,
    z: row.premium_z,
    window: row.premium_window,
    basis: row.premium_basis,
  }
}

// --- small pieces ---------------------------------------------------------

function Row({
  tag,
  when = true,
  children,
}: {
  tag: string
  when?: boolean
  children: React.ReactNode
}) {
  if (!when) return null
  return (
    <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 first:mt-0">
      <span className="text-[9.5px] font-medium uppercase tracking-[0.06em] text-apex-fg-tertiary">
        {tag}
      </span>
      {children}
    </div>
  )
}

function Fact({ children }: { children: React.ReactNode }) {
  return (
    <span className="apex-tabular text-[12px] text-apex-fg-secondary">{children}</span>
  )
}

/**
 * ⚠️ An ATR multiple is comparable across instruments; raw points are not. When
 * the board has no ATR the distance is still shown — labelled as points, and
 * labelled as NOT normalised, so it is never read as the comparable figure.
 */
function Distance({
  atr,
  points,
  where,
}: {
  atr: number | null | undefined
  points: number | null | undefined
  where: 'above' | 'below'
}) {
  if (atr != null) return <> ({formatNumber(atr, { decimals: 2 })} ATR {where})</>
  if (points != null)
    return <> ({formatNumber(points, { decimals: 2 })} points {where} — no ATR multiple)</>
  return null
}

/** The backend's own words for how a figure was derived — rendered verbatim. */
function Basis({ children }: { children: React.ReactNode }) {
  return (
    <span className="basis-full text-[10.5px] leading-[15px] text-apex-fg-tertiary">
      {children}
    </span>
  )
}

function Stamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="apex-tabular text-[10.5px] text-apex-fg-tertiary">{children}</span>
  )
}
