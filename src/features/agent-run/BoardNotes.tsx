import type { AnalystReport, AnalystSpec } from './report-shape'

/**
 * Each analyst on the WHOLE board — collapsed behind its first sentence.
 *
 * ⚠️ THE ONLY THING ON THIS PAGE THAT COLLAPSES, and it earns it: four notes of
 * roughly 270 words each sat fully expanded between the reader and the board,
 * which is most of what "overwhelming" meant. The first sentence plus a word
 * count is enough to decide whether to open one.
 *
 * ⚠️ THE SUMMARY IS THE NOTE'S OWN FIRST SENTENCE, cut at a full stop — never a
 * generated précis. Summarising an agent's prose would be inventing a claim it
 * did not make, which is the thing this whole system exists not to do. If the
 * cut lands badly the reader opens it; nothing is lost.
 */
export function BoardNotes({
  reports,
}: {
  reports: Array<{ spec: AnalystSpec; report: AnalystReport }>
}) {
  const notes = reports
    .map(({ spec, report }) => ({ spec, report, extra: extraBlocks(report) }))
    .filter(({ report, extra }) => !!report.board_note || extra.length > 0)

  if (notes.length === 0) {
    return (
      <p className="text-[13px] text-apex-fg-secondary">
        No analyst landed a board-level note for this run.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {notes.map(({ spec, report, extra }) => {
        const body = report.board_note ?? extra[0] ?? ''
        const words = [report.board_note ?? '', ...extra]
          .join(' ')
          .split(/\s+/)
          .filter(Boolean).length
        return (
          <details
            key={spec.agent}
            className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary"
          >
            <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 px-4 py-3 transition-colors duration-[120ms] hover:bg-white/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-apex-blue md:grid-cols-[108px_minmax(0,1fr)_auto] md:gap-4 [&::-webkit-details-marker]:hidden">
              <span className="col-span-full text-[11px] font-medium uppercase tracking-[0.08em] text-apex-fg md:col-span-1">
                {spec.label}
              </span>
              <span className="min-w-0 truncate text-[13px] text-apex-fg-secondary">
                {firstSentence(body)}
              </span>
              <span className="whitespace-nowrap text-[11px] text-apex-fg-tertiary">
                {words} words
              </span>
            </summary>
            <div className="grid gap-2 px-4 pb-4 md:grid-cols-[108px_minmax(0,1fr)] md:gap-4">
              <div />
              <div>
                {report.board_note && (
                  <p className="m-0 max-w-[76ch] text-[13px] leading-[1.6] text-apex-fg-secondary">
                    {report.board_note}
                  </p>
                )}
                {extra.map((text, i) => (
                  <p
                    key={i}
                    className="mt-2 max-w-[76ch] text-[13px] leading-[1.6] text-apex-fg-secondary"
                  >
                    {text}
                  </p>
                ))}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}

/** The board-level prose an analyst may carry beyond its `board_note`. */
function extraBlocks(r: AnalystReport): string[] {
  const out: string[] = []
  const push = (v: unknown) => {
    if (typeof v === 'string' && v) out.push(v)
  }
  push(r.backdrop?.usdinr_read)
  push(r.macro?.dxy_read)
  push(r.macro?.eia_read)
  push(r.macro?.consensus)
  return out
}

/** The note's OWN first sentence — a cut, never a summary. */
function firstSentence(s: string): string {
  const m = s.match(/^[\s\S]{0,190}?[.;](\s|$)/)
  return (m ? m[0] : s.slice(0, 190)).trim()
}
