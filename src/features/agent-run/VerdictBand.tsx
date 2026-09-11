import { formatNumber } from '@/lib/format'
import { Spine } from './Spine'
import { CAUSE_REASON, type Verdict } from './verdict'

/**
 * THE VERDICT BAND — the page's way in.
 *
 * ~50 words at the top that say what this run found, so a reader is not asked to
 * derive it from 3,300 words of prose. Everything here is counted off a typed
 * field (see `verdict.ts`); nothing is read out of an agent's sentence.
 *
 * ⚠️ IT DOES NOT REPLACE THE READS. The prose below is not hidden, summarised or
 * collapsed — the band is a way in, not a substitute. A reader who wants the
 * four analysts on COPPER still gets all four, stacked, in full.
 */
export function VerdictBand({ v }: { v: Verdict }) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary px-5 py-4">
      <Spine label="Gate">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px]">
          {v.gateOk === false ? (
            <span className="text-[17px] font-semibold text-apex-red">Gate refused</span>
          ) : v.gateOk === true ? (
            <span className="font-semibold text-apex-green">Gate passed</span>
          ) : (
            // Silence is never rounded up to a pass.
            <span className="font-semibold text-apex-yellow">Gate not recorded</span>
          )}
          {v.gateReason && (
            <span className="text-[13px] text-apex-fg-secondary">{v.gateReason}</span>
          )}
          <span className="text-[13px] text-apex-fg-secondary">
            {formatNumber(v.instruments)} instruments · {v.analystsLanded} of{' '}
            {v.analystsExpected} analysts landed
          </span>
        </div>
      </Spine>

      <Spine label="Tension" className="border-t-[0.5px] border-apex-border pt-3">
        <TensionLines v={v} />
      </Spine>

      <Spine label="Declined" className="border-t-[0.5px] border-apex-border pt-3">
        <Declines v={v} />
      </Spine>

      <Spine label="Guard" className="border-t-[0.5px] border-apex-border pt-3">
        <GuardLine v={v} />
      </Spine>
    </div>
  )
}

/**
 * ⚠️ THE LINE THE PAGE EXISTS FOR, and it carries the most weight on the screen.
 *
 * FIN-216 built `prior_close_sessions` / `implied_open_span_days` precisely
 * because an implied open measured across a long weekend was being read as "last
 * night". The board now states the span, and this is the first place it reaches
 * a reader — without scrolling, and without anyone having to notice it inside a
 * paragraph.
 */
function TensionLines({ v }: { v: Verdict }) {
  const none = v.spanNames.length === 0 && v.divergenceNames.length === 0
  if (none) {
    return (
      <p className="max-w-[64ch] text-[17px] leading-[1.45] tracking-[-0.011em] text-apex-fg">
        No span mislabelled, no divergence flagged — the overnight reads and the
        positioning reads point the same way.
      </p>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      {v.spanNames.length > 0 && (
        <p className="max-w-[64ch] text-[17px] leading-[1.45] tracking-[-0.011em] text-apex-fg">
          <span className="text-apex-yellow">
            {v.spanNames.length} of {v.instruments} implied opens are not overnight
          </span>{' '}
          — they span {formatNumber(v.spanDays)} calendar days, so a move read as
          “last night” is {formatNumber(v.spanDays)} days of drift.
          <span className="apex-tabular mt-2 block text-[11px] tracking-normal text-apex-fg-secondary">
            {v.spanNames.join(' · ')}
          </span>
        </p>
      )}
      {v.divergenceNames.length > 0 && (
        <p className="max-w-[64ch] text-[17px] leading-[1.45] tracking-[-0.011em] text-apex-fg">
          {v.divergenceNames.length} instrument
          {v.divergenceNames.length === 1 ? '' : 's'} where positioning and the
          overnight move disagree.
          <span className="apex-tabular mt-2 block text-[11px] tracking-normal text-apex-fg-secondary">
            {v.divergenceNames.join(' · ')}
          </span>
        </p>
      )}
    </div>
  )
}

/**
 * ⚠️ THE CAUSE, NAMED ONCE. A declined field is the system being honest, and the
 * reason is usually structural — Tier B has no international reference every
 * morning of its life. Saying that once beats nine instruments each explaining
 * it in a paragraph. This is a two-line note, deliberately not a section.
 */
function Declines({ v }: { v: Verdict }) {
  if (v.declinedTotal === 0) {
    return (
      <p className="max-w-[72ch] text-[13px] leading-[1.55] text-apex-fg-secondary">
        Nothing declined — every analyst spoke to every field it was given.
      </p>
    )
  }
  const top = v.causes.slice(0, 3)
  const rest = v.causes.length - top.length
  return (
    <p className="max-w-[72ch] text-[13px] leading-[1.55] text-apex-fg-secondary">
      {formatNumber(v.declinedTotal)} fields declined across {v.causes.length}{' '}
      {v.causes.length === 1 ? 'cause' : 'causes'}.{' '}
      {top.map((c, i) => (
        <span key={c.field}>
          {i > 0 && ' · '}
          <span className="apex-tabular font-medium text-apex-fg">{c.field}</span>
          {' ×'}
          {c.count}
          {CAUSE_REASON[c.field] && (
            <span className="text-apex-fg-tertiary"> ({CAUSE_REASON[c.field]})</span>
          )}
        </span>
      ))}
      {rest > 0 && <span className="text-apex-fg-tertiary"> · and {rest} more</span>}
    </p>
  )
}

/**
 * ⚠️ ABSENT IS NOT ZERO. Three different facts, three different sentences: the
 * guard was never consulted · it ran and denied nothing · it denied N. A
 * zero-deny run is a RESULT, not an empty section.
 */
function GuardLine({ v }: { v: Verdict }) {
  const g = v.guard
  if (!g.served) {
    return (
      <p className="max-w-[72ch] text-[13px] leading-[1.55] text-apex-fg-secondary">
        <span className="font-medium text-apex-yellow">Decisions not served</span> —
        the run carries only a line count
        {g.total > 0 && <> ({formatNumber(g.total)})</>}. Whether the guard allowed
        or denied cannot be shown from this payload.
      </p>
    )
  }
  if (g.denied === 0) {
    return (
      <p className="max-w-[72ch] text-[13px] leading-[1.55] text-apex-fg-secondary">
        <span className="font-medium text-apex-green">Ran, found nothing.</span>{' '}
        {formatNumber(g.total)} decisions, none denied — every number traced to the
        board.
      </p>
    )
  }
  return (
    <p className="max-w-[72ch] text-[13px] leading-[1.55] text-apex-fg-secondary">
      <span className="font-medium text-apex-yellow">
        {formatNumber(g.denied)} denied
      </span>{' '}
      of {formatNumber(g.total)} decisions.{' '}
      <span className="text-apex-fg-tertiary">
        A denial may be the guard working, or a false positive — the reasons are
        below.
      </span>
    </p>
  )
}
