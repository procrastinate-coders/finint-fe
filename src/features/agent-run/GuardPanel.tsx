import { Ban, Check, TriangleAlert } from 'lucide-react'
import type { AgentRunResponse } from '@/lib/api/contracts'
import { istDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type Guard = NonNullable<AgentRunResponse['guard']>

/**
 * ⚠️ A DENIED write never reaches PostToolUse, so without this log the guard's
 * catches are INVISIBLE (SAD §5, gap 1). Denials are shown with the same weight
 * as allows and in a CAUTION tone, never an alarm one: a deny may be the guard
 * working, or it may be a false positive strangling the report — that judgement
 * is the reader's, and it needs both counts side by side. FIN-175 died of 51
 * false rejects against 1 true positive, which nobody could see at the time.
 *
 * ⚠️ AN EMPTY LIST IS AMBIGUOUS AND MUST NOT BE FLATTENED. The generated contract
 * defaults `decisions` to `[]`, so "not served" and "nothing was logged" arrive
 * looking identical — and rendering both as "0 denied · 0 allowed" would assert
 * the guard made no decisions, which is a fabrication in the second case (law 1).
 * The payload can still tell them apart WITHOUT inferring: the run separately
 * records how many LINES the guard log had. A count with no decisions is the
 * pre-FIN-231 state (a number standing in for the log); a zero count is a run
 * that genuinely logged nothing. Both are stated in their own words.
 */
export function GuardPanel({ guard }: { guard: Guard | null | undefined }) {
  if (!guard) {
    return (
      <Note>
        <span className="font-medium text-apex-fg">Guard not recorded</span> — this
        run carries no provenance log at all, so whether anything was allowed or
        denied is not stated. It is not being read as "nothing was denied".
      </Note>
    )
  }

  const decisions = guard.decisions ?? []
  const lines = guard.lines
  const sha = guard.sha256

  if (decisions.length === 0) {
    // A count without the decisions it counts — the exact state FIN-231 G2 fixed.
    if (lines != null && lines > 0) {
      return (
        <Note>
          <span className="font-medium text-apex-fg">
            Guard decisions are not served
          </span>{' '}
          — the run record carries only a line count (
          <span className="apex-tabular">{lines}</span> decisions)
          {sha && (
            <>
              {' '}and a hash (<span className="apex-tabular">{sha.slice(0, 12)}</span>)
            </>
          )}
          . Whether the guard allowed or denied, and why, cannot be shown from this
          payload.
        </Note>
      )
    }
    return (
      <Note tone="quiet">
        <span className="font-medium text-apex-fg">
          No provenance decisions were logged
        </span>{' '}
        — the guard recorded nothing for this run. That is not the same as the
        guard passing everything: an empty log means it was never consulted.
      </Note>
    )
  }

  const denies = decisions.filter((d) => d.decision === 'deny')
  const allows = decisions.filter((d) => d.decision !== 'deny')
  // The log had more lines than were served — say so rather than let the counts
  // below read as the whole record.
  const short = lines != null && lines > decisions.length
  // ⚠️ A DECISION COUNT IS NOT A CLAIM COUNT. One deny can carry several
  // ungrounded claims — the real 2026-09-05 log denied ONE write containing FOUR
  // of them, and "1 denied" reads as a guard barely firing. Judging whether the
  // guard is working or strangling the report needs the claim count beside it.
  //
  // ⚠️ ZERO IS NOT A CLAIM COUNT HERE. The guard WRITER does not emit `claims`
  // yet — the pusher and the endpoint carry them, so a real denial arrives with
  // `claim_count: 0`. Printing "1 denied (0 claims)" would state that a denial
  // rested on nothing, which is a fabrication about the guard. A count is shown
  // only when it is genuinely positive; otherwise the prose reason stands alone.
  const counted =
    guard.claim_count ??
    denies.reduce((n, d) => n + (d.claim_count ?? (d.claims ?? []).length), 0)
  const claims = counted > 0 ? counted : null

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
        <span className="inline-flex items-center gap-1.5 text-apex-yellow">
          <Ban className="size-3.5" aria-hidden />
          <span className="apex-tabular font-medium">
            {guard.denied ?? denies.length}
          </span>{' '}
          denied
          {claims !== null && (
            <span className="text-apex-fg-tertiary">
              (<span className="apex-tabular">{claims}</span>{' '}
              {claims === 1 ? 'claim' : 'claims'})
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5 text-apex-fg-secondary">
          <Check className="size-3.5 text-apex-green" aria-hidden />
          <span className="apex-tabular font-medium">{allows.length}</span> allowed
        </span>
        <span className="text-[11px] text-apex-fg-tertiary">
          a denial may be the guard working, or a false positive — read the reason
        </span>
      </div>
      {short && (
        <p className="mb-2 text-[11px] text-apex-yellow">
          the run recorded{' '}
          <span className="apex-tabular">{lines}</span> log lines but served{' '}
          <span className="apex-tabular">{decisions.length}</span> — this is not the
          whole log
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {decisions.map((d, i) => {
          const denied = d.decision === 'deny'
          return (
            <li
              key={i}
              className={cn(
                'rounded-[8px] border-[0.5px] px-3 py-2',
                denied
                  ? 'border-apex-yellow/40 bg-apex-yellow-tint'
                  : 'border-apex-border-subtle bg-apex-secondary/30',
              )}
            >
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <span
                  className={cn(
                    'text-[11px] font-semibold uppercase tracking-[0.05em]',
                    denied ? 'text-apex-yellow' : 'text-apex-green',
                  )}
                >
                  {d.decision ?? 'decision not recorded'}
                </span>
                {d.agent_id && (
                  <span className="apex-tabular text-[11px] text-apex-fg-tertiary">
                    {d.agent_id}
                  </span>
                )}
                {d.ts && (
                  <span className="apex-tabular ml-auto text-[10.5px] text-apex-fg-tertiary">
                    {istDateTime(d.ts)}
                  </span>
                )}
              </div>
              {/* ⚠️ THE CLAIMS, one per line, when the backend structures them.
                  The prose `reason` bundles every claim into one sentence, which
                  is unreadable at four claims and impossible to count. The raw
                  `expected` level array is deliberately NOT printed — it is a
                  14-element wall that buries the claim it is meant to support;
                  `expected_prose` is the readable form and is shown when served. */}
              {(d.claims ?? []).length > 0 ? (
                <ul className="mt-1 flex flex-col gap-0.5">
                  {(d.claims ?? []).map((c, j) => (
                    <li
                      key={j}
                      className="text-[12px] leading-[17px] text-apex-fg-secondary"
                    >
                      <span className="apex-tabular font-medium text-apex-fg">
                        {[c.instrument, c.field].filter(Boolean).join(' · ') ||
                          'claim'}
                      </span>
                      {c.found && <> — {c.found}</>}
                      {!c.found && c.value != null && (
                        <> — <span className="apex-tabular">{c.value}</span></>
                      )}
                      {c.kind && (
                        <span className="ml-1.5 text-[10.5px] text-apex-fg-tertiary">
                          {c.kind}
                        </span>
                      )}
                      {c.expected_prose && (
                        <span className="text-apex-fg-tertiary">
                          {' '}
                          — {c.expected_prose}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                d.reason && (
                  <p className="mt-1 max-w-[100ch] text-[12px] leading-[17px] text-apex-fg-secondary">
                    {d.reason}
                  </p>
                )
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Note({
  tone = 'caution',
  children,
}: {
  tone?: 'caution' | 'quiet'
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-[10px] border-[0.5px] px-4 py-3',
        tone === 'caution'
          ? 'border-apex-yellow/40 bg-apex-yellow-tint'
          : 'border-apex-border bg-apex-secondary/50',
      )}
    >
      <TriangleAlert
        className={cn(
          'mt-px size-4 shrink-0',
          tone === 'caution' ? 'text-apex-yellow' : 'text-apex-fg-tertiary',
        )}
        aria-hidden
      />
      <p className="text-[12.5px] leading-[18px] text-apex-fg-secondary">{children}</p>
    </div>
  )
}
