import { useCallback, useState, type KeyboardEvent } from 'react'
import type { AgentRunBoardRow } from '@/lib/api/contracts'
import {
  formatNumber,
  formatPercentile,
  formatSignedNumber,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { BoardFacts } from './BoardFacts'
import { AnalystReads, type AnalystSlot } from './AnalystReads'
import type { AnalystSpec } from './report-shape'
import type { InstrumentFlags } from './verdict'

/**
 * THE BOARD — nine instruments, five columns, figures at 15px.
 *
 * ⚠️ FIVE COLUMNS, NOT FORTY-EIGHT. These are the figures a reader compares
 * ACROSS instruments; the rest live in the detail where they can be labelled.
 * The previous version rendered board facts as a wrap of prose spans per
 * instrument, so GOLD's OI never lined up under SILVER's — on a page whose
 * entire job is comparison.
 *
 * The FLAGS column is how the verdict band connects to the rows: the instruments
 * the band named are the ones marked here.
 */
export function BoardTable({
  board,
  specs,
  flags,
  slotsFor,
}: {
  board: AgentRunBoardRow[]
  specs: AnalystSpec[]
  flags: Map<string, InstrumentFlags>
  slotsFor: (instrument: string) => Map<string, AnalystSlot>
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set())

  const toggle = useCallback((name: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }, [])

  const onKey = useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>, name: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle(name)
        return
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
      e.preventDefault()
      const rows = Array.from(
        e.currentTarget.closest('tbody')?.querySelectorAll<HTMLTableRowElement>(
          'tr[data-row]',
        ) ?? [],
      )
      const i = rows.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)
      rows[i]?.focus()
    },
    [toggle],
  )

  if (board.length === 0) {
    return (
      <p className="text-[13px] text-apex-fg-secondary">
        No instruments were served with this run.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Instrument</Th>
              <Th className="hidden lg:table-cell">OI state</Th>
              <Th num>Total OI</Th>
              <Th num>Δ OI</Th>
              <Th num className="hidden sm:table-cell">
                COT
              </Th>
              <Th>Flags</Th>
            </tr>
          </thead>
          <tbody>
            {board.map((b) => {
              const name = b.instrument ?? '—'
              const isOpen = open.has(name)
              const f = flags.get(name)
              return (
                <Row
                  key={name}
                  row={b}
                  name={name}
                  isOpen={isOpen}
                  flags={f}
                  specs={specs}
                  slots={slotsFor(name)}
                  onToggle={toggle}
                  onKey={onKey}
                />
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({
  row,
  name,
  isOpen,
  flags,
  specs,
  slots,
  onToggle,
  onKey,
}: {
  row: AgentRunBoardRow
  name: string
  isOpen: boolean
  flags: InstrumentFlags | undefined
  specs: AnalystSpec[]
  slots: Map<string, AnalystSlot>
  onToggle: (n: string) => void
  onKey: (e: KeyboardEvent<HTMLTableRowElement>, n: string) => void
}) {
  const change = row.oi_change
  return (
    <>
      <tr
        data-row
        tabIndex={0}
        role="button"
        aria-expanded={isOpen}
        onClick={() => onToggle(name)}
        onKeyDown={(e) => onKey(e, name)}
        className={cn(
          'cursor-pointer transition-colors duration-[120ms] hover:bg-white/[0.04]',
          'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-apex-blue',
          isOpen && 'bg-apex-secondary',
        )}
      >
        <Td first={isOpen}>
          <span
            aria-hidden
            className={cn(
              'inline-block w-[11px] transition-transform duration-[120ms]',
              isOpen ? 'rotate-90 text-apex-blue' : 'text-apex-fg-tertiary',
            )}
          >
            ›
          </span>{' '}
          <span className="text-[15px] font-medium tracking-[-0.012em]">{name}</span>
        </Td>
        <Td className="hidden lg:table-cell">
          <span className="text-[13px] text-apex-fg-secondary">
            {row.oi_state ?? '—'}
          </span>
        </Td>
        <Td num fig>
          {formatNumber(row.total_oi)}
        </Td>
        <Td
          num
          fig
          className={
            change == null
              ? 'text-apex-fg-tertiary'
              : change > 0
                ? 'text-apex-green'
                : change < 0
                  ? 'text-apex-red'
                  : 'text-apex-fg-tertiary'
          }
        >
          {formatSignedNumber(change)}
        </Td>
        <Td num fig className="hidden sm:table-cell">
          {formatPercentile(row.cot_percentile)}
        </Td>
        <Td>
          <span className="inline-flex gap-1">
            {flags?.span && (
              <Flag tone="yellow">span</Flag>
            )}
            {flags?.divergence && <Flag tone="blue">div</Flag>}
            {!flags?.span && !flags?.divergence && (
              <span className="text-[13px] text-apex-fg-tertiary">—</span>
            )}
          </span>
        </Td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={6} className="border-b-[0.5px] border-apex-border bg-apex-canvas p-0">
            <div className="px-4 pb-8 pt-6">
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="text-[17px] font-semibold tracking-[-0.018em] text-apex-fg">
                  {name}
                </h3>
                <span className="text-[13px] text-apex-fg-secondary">
                  {row.oi_state ?? 'no OI state named'}
                </span>
                {row.data_tier && (
                  <span className="text-[13px] text-apex-fg-secondary">
                    Tier {row.data_tier}
                  </span>
                )}
                {flags?.span && <Flag tone="yellow">implied open not overnight</Flag>}
              </div>
              <BoardFacts row={row} />
              <div className="mt-6">
                <AnalystReads instrument={name} specs={specs} slots={slots} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Th({
  children,
  num,
  className,
}: {
  children: React.ReactNode
  num?: boolean
  className?: string
}) {
  return (
    <th
      scope="col"
      className={cn(
        'sticky top-0 z-[2] whitespace-nowrap border-b-[0.5px] border-apex-border bg-apex-secondary px-4 py-2',
        'text-[11px] font-medium uppercase tracking-[0.08em] text-apex-fg-tertiary',
        num ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  )
}

function Td({
  children,
  num,
  fig,
  first,
  className,
}: {
  children: React.ReactNode
  num?: boolean
  fig?: boolean
  first?: boolean
  className?: string
}) {
  return (
    <td
      className={cn(
        'h-12 whitespace-nowrap border-b-[0.5px] border-apex-border px-4 align-middle',
        num && 'text-right',
        // figures at 15px — the previous table shipped 13px and read as small
        fig && 'apex-tabular text-[15px]',
        first && 'shadow-[inset_2px_0_0_var(--apex-blue)]',
        className,
      )}
    >
      {children}
    </td>
  )
}

function Flag({
  tone,
  children,
}: {
  tone: 'yellow' | 'blue'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'apex-tabular rounded-[4px] px-1.5 py-px text-[11px]',
        tone === 'yellow'
          ? 'bg-apex-yellow-tint text-apex-yellow'
          : 'bg-apex-blue-tint text-apex-blue',
      )}
    >
      {children}
    </span>
  )
}
