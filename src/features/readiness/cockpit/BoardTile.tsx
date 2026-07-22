import { useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import type { BoardRow, MacroRow } from '@/lib/api/contracts'
import {
  DASH,
  formatInr,
  formatNumber,
  formatSignedNumber,
  istDate,
} from '@/lib/format'
import { type LmeRef, lmeRefFor } from '@/lib/mcx/lme'
import { type EiaRef, eiaRefFor, formatEia } from '@/lib/mcx/eia'
import { cn } from '@/lib/utils'
import { PercentileMarker } from './PercentileMarker'
import { Tile } from './Tile'
import { SEGMENT_LABEL, cotMeaning, oiStateInfo } from './provenance'

/** The LME 3M level formatted honestly: an integer stays whole (13,836), a half
 *  keeps its decimal (3,170.5) — never rounded away. Presented with the USD/t
 *  unit so it can never be mistaken for a ₹ price or an implied-open %. */
function formatLmeLevel(value: number): string {
  return formatNumber(value, { decimals: Number.isInteger(value) ? 0 : 1 })
}

/**
 * The BOARD, the hero tile (Bento Cockpit). One CARD per instrument, grouped by
 * segment — the cards REFLOW to the column width, so nothing ever scrolls
 * sideways (a horizontal table-scroll hides columns you can't tell are there).
 * Each card is self-contained and information-rich: price + as-of/freshness, OI
 * and its change, the positioning STATE with the observed price/OI move
 * (descriptive, never a pick — law 2/8), and the COT crowding marker (Tier-B is
 * LME-priced, so "no COT reference" by design — law 3). Hovering a card explains
 * it in plain words in the focus footer; hovering a source lights the columns it
 * feeds (lineage). Fixed segment order.
 */

const SEGMENT_ORDER = ['bullion', 'energy', 'base_metals']

function suffix(
  instrument: string,
  contract: string | null | undefined,
): string {
  if (!contract) return DASH
  return contract.startsWith(instrument)
    ? contract.slice(instrument.length)
    : contract
}

interface Group {
  key: string
  label: string
  rows: BoardRow[]
}

function groupBySegment(rows: BoardRow[]): Group[] {
  const groups: Group[] = []
  for (const key of SEGMENT_ORDER) {
    const seg = rows.filter((r) => r.segment === key)
    if (seg.length) groups.push({ key, label: SEGMENT_LABEL[key] ?? key, rows: seg })
  }
  const other = rows.filter(
    (r) => !r.segment || !SEGMENT_ORDER.includes(r.segment),
  )
  if (other.length) groups.push({ key: 'other', label: 'Other', rows: other })
  return groups
}

export function BoardTile({
  rows,
  macro,
  hoveredSource,
  delayMs,
}: {
  rows: BoardRow[]
  /** The evidence macro rows — the LME_*_3M reference levels are joined from here
   *  onto each base-metal card (FIN-142). Optional so the tile degrades honestly
   *  if `evidence.macro` is ever absent. */
  macro?: MacroRow[]
  hoveredSource: string | null
  delayMs?: number
}) {
  const [hoverId, setHoverId] = useState<string | null>(null)
  const asOf = rows.find((r) => r.as_of)?.as_of ?? null
  const age = rows.find((r) => r.age_days != null)?.age_days ?? null
  const allStale = rows.length > 0 && rows.every((r) => !r.is_fresh)

  const priceLit = hoveredSource === 'kite' || hoveredSource === 'board'
  const cotLit = hoveredSource === 'cot' || hoveredSource === 'board'
  // FIN-142: hovering the LME source lights each base metal's LME 3M line — the
  // same lineage affordance the other sources get.
  const lmeLit = hoveredSource === 'lme'
  // FIN-188: hovering the EIA source lights the CRUDEOIL/NATURALGAS inventory line.
  const eiaLit = hoveredSource === 'eia'

  const focus = rows.find((r) => r.instrument_id === hoverId) ?? null
  const groups = groupBySegment(rows)

  return (
    <Tile
      title="Board"
      meta={
        <span className="inline-flex items-center gap-1.5">
          {rows.length} instruments · price/OI
          {allStale && (
            <span className="text-apex-orange/90">
              · as-of {istDate(asOf)} ({age}d)
            </span>
          )}
        </span>
      }
      lit={priceLit || cotLit || lmeLit || eiaLit}
      litLabel={
        hoveredSource === 'cot'
          ? 'CFTC'
          : hoveredSource === 'lme'
            ? 'LME'
            : hoveredSource === 'eia'
              ? 'EIA'
              : 'Kite'
      }
      delayMs={delayMs}
      bodyClassName="flex flex-col"
    >
      {/* ONE grid → every card is the same width across segments; the segment
          headers span the full row (col-span-full) so grouping never distorts
          card size. Reflows to the column; vertical scroll only, never sideways. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-0.5">
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(196px,1fr))]">
          {groups.map((g) => (
            <div key={g.key} className="contents">
              <div className="col-span-full flex items-center gap-2 pb-0.5 pl-0.5 pt-1 first:pt-0">
                <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-apex-fg-secondary">
                  {g.label}
                </span>
                <span className="apex-tabular text-[10px] text-apex-fg-tertiary">
                  {g.rows.length}
                </span>
                <span className="h-px flex-1 bg-apex-border-subtle" />
              </div>
              {g.rows.map((r) => (
                <InstrumentCard
                  key={r.instrument_id}
                  row={r}
                  lme={lmeRefFor(r.instrument_id, macro)}
                  eia={eiaRefFor(r.instrument_id, macro)}
                  on={hoverId === r.instrument_id}
                  onHover={setHoverId}
                  priceLit={priceLit}
                  cotLit={cotLit}
                  lmeLit={lmeLit}
                  eiaLit={eiaLit}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FOCUS footer — the hovered card explained in plain words */}
      <FocusFooter
        row={focus}
        lme={focus ? lmeRefFor(focus.instrument_id, macro) : null}
        eia={focus ? eiaRefFor(focus.instrument_id, macro) : null}
      />
    </Tile>
  )
}

function InstrumentCard({
  row,
  lme,
  eia,
  on,
  onHover,
  priceLit,
  cotLit,
  lmeLit,
  eiaLit,
}: {
  row: BoardRow
  lme: LmeRef | null
  eia: EiaRef | null
  on: boolean
  onHover: (id: string | null) => void
  priceLit: boolean
  cotLit: boolean
  lmeLit: boolean
  eiaLit: boolean
}) {
  const info = oiStateInfo(row.oi_state)
  const building = info?.building ?? false
  const tierB = row.data_tier !== 'A'

  return (
    <button
      type="button"
      onMouseEnter={() => onHover(row.instrument_id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(row.instrument_id)}
      onBlur={() => onHover(null)}
      className={cn(
        'flex flex-col gap-1 rounded-[12px] border-[0.5px] p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue',
        on
          ? 'border-apex-blue/50 bg-white/[0.045]'
          : 'border-apex-border bg-apex-secondary/40 hover:bg-white/[0.03]',
      )}
    >
      {/* header: instrument + contract · tier + freshness */}
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[13.5px] font-semibold text-apex-fg">
            {row.instrument_id}
          </span>
          <span className="apex-tabular text-[10px] text-apex-fg-tertiary">
            {suffix(row.instrument_id, row.contract)}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'rounded-[4px] px-1 py-px text-[9px] font-semibold uppercase tracking-[0.04em]',
              tierB
                ? 'bg-apex-tertiary text-apex-fg-tertiary'
                : 'bg-apex-blue-tint text-apex-blue',
            )}
          >
            {tierB ? 'B · LME' : 'A'}
          </span>
          <FreshDot fresh={row.is_fresh} age={row.age_days} />
        </span>
      </div>

      {/* close price + as-of */}
      <div>
        <div
          className={cn(
            '-mx-1 rounded px-1 apex-tabular text-[19px] font-semibold leading-none text-apex-fg transition-colors',
            priceLit && 'bg-apex-blue-tint',
          )}
        >
          {formatInr(row.close, { decimals: 0 })}
        </div>
        <div className="mt-0.5 text-[10px] text-apex-fg-tertiary">
          {row.as_of ? istDate(row.as_of) : DASH}
          {!row.is_fresh && row.age_days != null && (
            <span className="text-apex-orange/90"> · {row.age_days}d old</span>
          )}
        </div>
      </div>

      {/* OI + ΔOI */}
      <div
        className={cn(
          '-mx-1 mt-0.5 grid grid-cols-2 gap-2 rounded px-1 transition-colors',
          priceLit && 'bg-apex-blue-tint',
        )}
      >
        <Stat label="OI" value={formatNumber(row.oi)} />
        <Stat
          label="Δ OI"
          value={formatSignedNumber(row.oi_change)}
          align="right"
        />
      </div>

      {/* positioning state + the observed move */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'text-[11px] uppercase tracking-[0.02em]',
            building
              ? 'font-semibold text-apex-fg'
              : 'font-normal text-apex-fg-tertiary',
          )}
        >
          {info ? info.label : DASH}
        </span>
        {info && <MoveGlyph price={info.price} oi={info.oi} />}
      </div>

      {/* COT crowding */}
      <div
        className={cn(
          '-mx-1 flex items-center justify-between gap-2 rounded px-1 transition-colors',
          cotLit && 'bg-apex-blue-tint',
        )}
      >
        <span className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
          COT
        </span>
        {tierB ? (
          <span className="text-[10px] text-apex-fg-tertiary/80">
            no int'l reference
          </span>
        ) : (
          <PercentileMarker value={row.cot_percentile} />
        )}
      </div>

      {/* LME 3M reference LEVEL (FIN-142) — the international context this base
          metal was previously "disconnected" from. It is a reference PRICE
          (USD/t), NOT an implied open and NOT a pre-open move: no %, no sign.
          Rendered only when the backend actually shipped a level (fail-closed —
          a metals.dev-down metal simply shows no line, never a fabricated one). */}
      {lme && (
        <div
          className={cn(
            '-mx-1 flex items-center justify-between gap-2 rounded px-1 transition-colors',
            lmeLit && 'bg-apex-blue-tint',
          )}
        >
          <span className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
            LME 3M
          </span>
          <span className="apex-tabular text-[11px] text-apex-fg-secondary">
            {formatLmeLevel(lme.value)}
            <span className="ml-1 text-[9.5px] text-apex-fg-tertiary">USD/t</span>
          </span>
        </div>
      )}

      {/* EIA weekly inventory (FIN-188) — the energy card's international leg,
          previously stranded in the macro list. A RELEASED FACT: the level + the
          backend-computed WoW, with the backend's draw/build word shown NEUTRALLY
          (descriptive of the inventory move, never a buy/sell read — law 2/8).
          Fail-closed: no EIA row → no line (never fabricated). */}
      {eia && <EiaCardLine eia={eia} lit={eiaLit} />}
    </button>
  )
}

/** The EIA inventory line on a CRUDEOIL / NATURALGAS card (FIN-188). */
function EiaCardLine({ eia, lit }: { eia: EiaRef; lit: boolean }) {
  const line = formatEia(eia)
  return (
    <div
      className={cn(
        '-mx-1 rounded px-1 py-0.5 transition-colors',
        lit && 'bg-apex-blue-tint',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
          {line.label}
        </span>
        {line.direction && (
          <span className="rounded-[4px] bg-apex-tertiary px-1 text-[9px] font-medium uppercase tracking-[0.03em] text-apex-fg-secondary">
            {line.direction}
          </span>
        )}
      </div>
      <div className="apex-tabular mt-px text-[11px] text-apex-fg-secondary">
        {line.level}
        {line.wow && (
          <span className="text-apex-fg-tertiary"> · {line.wow}</span>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  align = 'left',
}: {
  label: string
  value: string
  align?: 'left' | 'right'
}) {
  return (
    <span
      className={cn(
        'flex items-baseline gap-1.5',
        align === 'right' && 'justify-end',
      )}
    >
      <span className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-apex-fg-tertiary">
        {label}
      </span>
      <span className="apex-tabular text-[13px] text-apex-fg-secondary">
        {value}
      </span>
    </span>
  )
}

function FreshDot({
  fresh,
  age,
}: {
  fresh: boolean
  age: number | null | undefined
}) {
  return (
    <span
      className="inline-flex items-center gap-1"
      title={fresh ? 'fresh' : age != null ? `${age}d old` : 'stale'}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          fresh ? 'bg-apex-green' : 'bg-apex-orange',
        )}
        aria-hidden
      />
    </span>
  )
}

/** The observed price/OI move — two neutral arrows. Descriptive only; colour
 * stays neutral so it never reads as a buy/sell direction (law 2/8). */
function MoveGlyph({
  price,
  oi,
}: {
  price: 'up' | 'down'
  oi: 'up' | 'down'
}) {
  return (
    <span className="inline-flex items-center gap-2 text-[9.5px] uppercase tracking-[0.04em] text-apex-fg-tertiary">
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

function FocusFooter({
  row,
  lme,
  eia,
}: {
  row: BoardRow | null
  lme: LmeRef | null
  eia: EiaRef | null
}) {
  return (
    <div className="min-h-[76px] border-t-[0.5px] border-apex-border-subtle bg-apex-secondary/40 px-4 py-3">
      {row ? (
        <FocusContent row={row} lme={lme} eia={eia} />
      ) : (
        <p className="text-[12px] leading-[16px] text-apex-fg-tertiary">
          Hover an instrument to see where the numbers come from and what the
          positioning means.
        </p>
      )}
    </div>
  )
}

function FocusContent({
  row,
  lme,
  eia,
}: {
  row: BoardRow
  lme: LmeRef | null
  eia: EiaRef | null
}) {
  const info = oiStateInfo(row.oi_state)
  const eiaLine = eia ? formatEia(eia) : null
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="text-[13px] font-semibold text-apex-fg">
          {row.instrument_id}
        </span>
        <span className="apex-tabular text-[12px] text-apex-fg-tertiary">
          {row.contract}
        </span>
        <span className="text-[11px] text-apex-fg-tertiary">
          · price/OI from Kite
          {row.as_of && ` · close as-of ${istDate(row.as_of)}`}
          {!row.is_fresh && row.age_days != null && (
            <span className="text-apex-orange/90"> ({row.age_days}d stale)</span>
          )}
        </span>
      </div>
      {info && (
        <p className="mt-1 text-[12px] leading-[16px] text-apex-fg-secondary">
          <span className="font-medium text-apex-fg">{info.label}</span> —{' '}
          {info.meaning}.
        </p>
      )}
      <p className="mt-0.5 text-[11px] leading-[15px] text-apex-fg-tertiary">
        COT {cotMeaning(row.cot_percentile)}
        {row.cot_as_of &&
          row.cot_percentile != null &&
          ` · CFTC, as-of ${istDate(row.cot_as_of)}`}
        .
      </p>
      {lme && (
        <p className="mt-0.5 text-[11px] leading-[15px] text-apex-fg-tertiary">
          LME 3M reference {formatLmeLevel(lme.value)} USD/t — an international
          context level (metals.dev
          {lme.asOf && `, as-of ${istDate(lme.asOf)}`}), not an implied open.
        </p>
      )}
      {eiaLine && (
        <p className="mt-0.5 text-[11px] leading-[15px] text-apex-fg-tertiary">
          {eiaLine.label} {eiaLine.level}
          {eiaLine.wow && `, ${eiaLine.wow}`}
          {eiaLine.direction && ` (${eiaLine.direction})`} — a released EIA weekly
          fact
          {eia?.asOf && `, week-ending ${istDate(eia.asOf)}`}, not an implied open.
        </p>
      )}
    </div>
  )
}
