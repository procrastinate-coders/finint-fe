import { formatNumber, formatPercentile } from '@/lib/format'
import type { AnalystReport, AnalystSpec } from './report-shape'
import type { RatioBlock } from './stream-a-fields'

/**
 * What each analyst said about the WHOLE board, plus the board-level blocks only
 * some of them emit (the crossmarket rupee backdrop, the news macro read) and the
 * cross-instrument ratios.
 *
 * ⚠️ THIS is the part that is genuinely per-ANALYST, so this is the one section
 * grouped that way. The 36 instrument reads are grouped by instrument (see
 * InstrumentPanel); forcing a board-wide note into an instrument card would have
 * meant repeating it nine times or attributing it to an instrument it is not
 * about. Grouping follows what the thing IS, not one rule applied everywhere.
 *
 * It sits BELOW the instruments on purpose: a trader opens this page for an
 * instrument, and 4 × ~700 words of board-wide prose ahead of the board would be
 * a wall between him and his actual question. The coverage strip at the top
 * already tells him whether all four ran.
 */
export function BoardLevel({
  reports,
  ratios,
}: {
  reports: Array<{ spec: AnalystSpec; report: AnalystReport }>
  ratios: Array<{ key: string; ratio: RatioBlock }>
}) {
  if (reports.length === 0 && ratios.length === 0) {
    return (
      <p className="text-[12.5px] text-apex-fg-secondary">
        No analyst landed a board-level note for this run.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {reports.map(({ spec, report }) => {
        const blocks = boardBlocks(report)
        if (!report.board_note && blocks.length === 0) return null
        return (
          <article
            key={spec.agent}
            className="rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-apex-fg">
                {spec.label}
              </h3>
              <span className="text-[10.5px] text-apex-fg-tertiary">{spec.remit}</span>
            </div>
            {report.board_note && (
              <p className="mt-1.5 max-w-[95ch] text-[12.5px] leading-[19px] text-apex-fg-secondary">
                {report.board_note}
              </p>
            )}
            {blocks.map((b) => (
              <p
                key={b.label}
                className="mt-1.5 max-w-[95ch] text-[12px] leading-[18px] text-apex-fg-secondary"
              >
                <span className="mr-1.5 text-[9.5px] font-medium uppercase tracking-[0.06em] text-apex-fg-tertiary">
                  {b.label}
                </span>
                {b.text}
              </p>
            ))}
            {/* An empty catalyst list is a real, common and honest outcome — it is
                stated, not left to be inferred from a missing section. */}
            {report.catalysts != null && (
              <p className="mt-1.5 text-[11.5px] text-apex-fg-tertiary">
                {report.catalysts.length === 0
                  ? 'No overnight catalysts were stored for this run.'
                  : `${formatNumber(report.catalysts.length)} overnight catalysts stored.`}
              </p>
            )}
          </article>
        )
      })}

      {ratios.length > 0 && (
        <article className="rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary px-4 py-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-apex-fg">
            Cross-instrument ratios
          </h3>
          <div className="mt-2 flex flex-col gap-2.5">
            {ratios.map(({ key, ratio }) => (
              <Ratio key={key} name={key} r={ratio} />
            ))}
          </div>
        </article>
      )}
    </div>
  )
}

/**
 * ⚠️ THE VALUE AND THE PERCENTILE ARE TWO DIFFERENT MEASUREMENTS, and they are
 * labelled as such rather than printed as a pair the reader has to disentangle.
 * The value is today's ACTUAL contract over today's ACTUAL contract; the
 * percentile ranks a BACK-ADJUSTED CONTINUOUS series over its window, and the two
 * series differ slightly in level. The backend states this in `basis`, so `basis`
 * is rendered verbatim beneath both — summarising it into a label would lose the
 * one sentence that makes the pair safe to read.
 */
function Ratio({ name, r }: { name: string; r: RatioBlock }) {
  const pair =
    r.numerator && r.denominator ? `${r.numerator} / ${r.denominator}` : name
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-[12px] font-medium text-apex-fg">{pair}</span>
        {r.value != null && (
          <span className="apex-tabular text-[12px] text-apex-fg-secondary">
            value {formatNumber(r.value, { decimals: 2 })}
            <span className="ml-1 text-[10.5px] text-apex-fg-tertiary">
              (today&rsquo;s actual contracts)
            </span>
          </span>
        )}
        {r.percentile != null && (
          <span className="apex-tabular text-[12px] text-apex-fg-secondary">
            {formatPercentile(r.percentile)} percentile
            <span className="ml-1 text-[10.5px] text-apex-fg-tertiary">
              (
              {r.window != null
                ? `over ${formatNumber(r.window)} continuous sessions`
                : 'window not recorded — the rank has no stated sample'}
              )
            </span>
          </span>
        )}
        {r.unit_convention && (
          <span className="text-[10.5px] text-apex-fg-tertiary">
            units: {r.unit_convention}
          </span>
        )}
      </div>
      {r.basis && (
        <p className="mt-0.5 max-w-[95ch] text-[10.5px] leading-[15px] text-apex-fg-tertiary">
          {r.basis}
        </p>
      )}
    </div>
  )
}

/** The board-level prose blocks an analyst may carry beyond its `board_note`. */
function boardBlocks(r: AnalystReport): Array<{ label: string; text: string }> {
  const out: Array<{ label: string; text: string }> = []
  const push = (label: string, v: unknown) => {
    if (typeof v === 'string' && v) out.push({ label, text: v })
  }
  push('USD/INR', r.backdrop?.usdinr_read)
  push('DXY', r.macro?.dxy_read)
  push('EIA', r.macro?.eia_read)
  push('Consensus', r.macro?.consensus)
  return out
}
