import { useEffect } from 'react'
import {
  AlertCircle,
  Ban,
  Check,
  FileText,
  Loader2,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { Glass } from '@/design-system'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/client'
import { messageFromErrorBody, type CostReport } from '@/lib/api/contracts'
import { useBriefToday, useGenerate, useGenerateStatus } from '@/lib/query/hooks'
import { formatUsd } from '@/lib/format'
import { CostReadout } from './CostReadout'
import { ProgressSteps } from './ProgressSteps'
import { summarizeDegradation } from './degraded'

// The real, current cost of a run — today's captured number (FIN-164). Shown
// BEFORE commit so Father knows the consequence. Honest: it's what a run spends.
const ESTIMATED_COST_USD = 0.11

/**
 * The generate flow (FIN-161). A glass modal state-machine: CONFIRM (states the
 * real cost — it costs money, so a confirm is required, law 1) → RUNNING (the 4
 * real steps, polled, never blocking on the ~3-min run) → COMPLETE (flags a
 * degraded/positioning-only brief BEFORE handoff — law 2/4) · ERROR (names what
 * failed via `reason` + shows the real cost — a failed run still spent money) ·
 * BLOCKED (409 hard-critical red, fail-closed with its reason). Phase is DERIVED
 * from the mutation + poll (no phase stored in an effect) so it can never drift
 * from the API truth.
 */
export function GenerateFlow({
  positioningOnly,
  onClose,
  onViewBrief,
}: {
  positioningOnly: boolean
  onClose: () => void
  onViewBrief: () => void
}) {
  const generate = useGenerate()
  const post = generate.data ?? null

  const isAlreadyComplete = post?.status === 'already_complete'
  const postBrief = isAlreadyComplete ? (post?.brief ?? null) : null
  const runId = !isAlreadyComplete ? (post?.run_id ?? null) : null

  const status = useGenerateStatus(runId, !!runId)
  const statusData = status.data
  const runDone = !!runId && statusData?.status === 'done'
  const runErrored = !!runId && statusData?.status === 'error'

  // Fresh run's degraded flag lives in the brief, not the status — fetch it once
  // the run is done (NOT for landing; that's FIN-172). already_complete already
  // carries the brief, so no fetch there.
  const briefQuery = useBriefToday(runDone && !postBrief)

  const is409 = generate.error instanceof ApiError && generate.error.status === 409
  const malformed = !!post && !runId && !isAlreadyComplete

  const phase = generate.isError
    ? is409
      ? 'blocked'
      : 'error'
    : postBrief || runDone
      ? 'complete'
      : runErrored
        ? 'error'
        : runId
          ? 'running'
          : malformed
            ? 'error'
            : 'confirm'

  // Escape closes at any phase (a background run keeps going server-side).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const runPositioningOnly = post?.positioning_only ?? positioningOnly
  const brief = postBrief ?? briefQuery.data ?? null
  const degradation = brief ? summarizeDegradation(brief) : null

  const errorReason =
    statusData?.reason ??
    (generate.error instanceof ApiError ? generate.error.message : null)
  const errorCost = statusData?.cost ?? null

  const blockedReason =
    generate.error instanceof ApiError
      ? (messageFromErrorBody(generate.error.body ?? {}) ??
        generate.error.message)
      : 'The run was blocked.'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <Glass
        variant="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gen-modal-title"
        className="flex max-h-[calc(100svh-2rem)] w-full max-w-[480px] flex-col overflow-hidden p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="gen-modal-title"
            className="text-[18px] font-medium text-apex-fg"
          >
            {phase === 'confirm' && 'Generate the morning brief'}
            {phase === 'running' && 'Generating the brief'}
            {phase === 'complete' && 'Brief ready'}
            {phase === 'error' && 'Generation failed'}
            {phase === 'blocked' && 'Can’t generate yet'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-[8px] p-1 text-apex-fg-tertiary transition-colors hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {phase === 'confirm' && (
            <ConfirmBody positioningOnly={positioningOnly} />
          )}
          {phase === 'running' && (
            <RunningBody
              steps={statusData?.steps ?? []}
              positioningOnly={runPositioningOnly}
            />
          )}
          {phase === 'complete' && (
            <CompleteBody
              positioningOnly={runPositioningOnly}
              alreadyComplete={isAlreadyComplete}
              degradation={degradation}
              loadingBrief={briefQuery.isPending && runDone && !postBrief}
            />
          )}
          {phase === 'error' && (
            <ErrorBody reason={errorReason} cost={errorCost} />
          )}
          {phase === 'blocked' && <BlockedBody reason={blockedReason} />}
        </div>

        <div className="mt-5 flex items-center justify-end gap-3">
          {phase === 'confirm' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => generate.mutate()}
                disabled={generate.isPending}
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Starting…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" aria-hidden />
                    Generate · {formatUsd(ESTIMATED_COST_USD)}
                  </>
                )}
              </Button>
            </>
          )}
          {phase === 'running' && (
            <Button variant="outline" onClick={onClose}>
              Run in background
            </Button>
          )}
          {phase === 'complete' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={onViewBrief}>
                <FileText className="size-3.5" aria-hidden />
                View brief
              </Button>
            </>
          )}
          {(phase === 'error' || phase === 'blocked') && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </Glass>
    </div>
  )
}

function ConfirmBody({ positioningOnly }: { positioningOnly: boolean }) {
  return (
    <div className="space-y-4">
      <p className="text-[13px] leading-[19px] text-apex-fg-secondary">
        This runs the two AI agents over today’s scan and writes the layered
        brief — the market backdrop and a per-instrument read. It{' '}
        <span className="font-medium text-apex-fg">costs money</span> and takes a
        few minutes; you can leave it running in the background.
      </p>
      <div className="flex items-baseline justify-between gap-3 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/40 px-3 py-2.5">
        <span className="text-[12px] text-apex-fg-secondary">
          Estimated cost
        </span>
        <span className="apex-tabular text-[15px] font-semibold text-apex-fg">
          ≈ {formatUsd(ESTIMATED_COST_USD)}
        </span>
      </div>
      {positioningOnly && (
        <div className="flex gap-2.5 rounded-[10px] border-[0.5px] border-apex-border bg-apex-secondary/40 px-3 py-2.5">
          <FileText
            className="mt-0.5 size-4 shrink-0 text-apex-fg-tertiary"
            aria-hidden
          />
          <p className="text-[12px] leading-[17px] text-apex-fg-secondary">
            Nothing crossed the overnight news window, so this will be a{' '}
            <span className="font-medium text-apex-fg">positioning-only</span>{' '}
            brief — the honest read when the board leads and the wires are quiet.
          </p>
        </div>
      )}
    </div>
  )
}

function RunningBody({
  steps,
  positioningOnly,
}: {
  steps: { key: string; state: string; detail?: string | null }[]
  positioningOnly: boolean
}) {
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-apex-fg-tertiary">
        Running in the background — this takes a few minutes.
        {positioningOnly && ' Positioning-only (news is quiet).'}
      </p>
      <ProgressSteps steps={steps} />
    </div>
  )
}

function CompleteBody({
  positioningOnly,
  alreadyComplete,
  degradation,
  loadingBrief,
}: {
  positioningOnly: boolean
  alreadyComplete: boolean
  degradation: ReturnType<typeof summarizeDegradation> | null
  loadingBrief: boolean
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-apex-green-tint text-apex-green">
          <Check className="size-5" aria-hidden />
        </span>
        <div className="text-[13px] text-apex-fg-secondary">
          {alreadyComplete
            ? 'Today’s brief already existed — served from store, no new spend.'
            : 'The morning brief is written and ready.'}
        </div>
      </div>

      {/* Degraded MUST be flagged before handoff (law 2/4). It succeeded AND is
          degraded — both are true; never route on silently as if it were clean. */}
      {degradation?.degraded && (
        <div
          role="alert"
          className="space-y-1 rounded-[10px] border-[0.5px] border-apex-orange/40 bg-apex-orange-tint px-3 py-2.5"
        >
          <div className="flex items-center gap-2 text-[13px] font-medium text-apex-orange">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            Degraded — substance guards withheld content
          </div>
          <ul className="ml-6 list-disc text-[12px] leading-[17px] text-apex-fg-secondary">
            {degradation.guardFailed && <li>A guard fired on this run.</li>}
            {degradation.withheldInstruments.length > 0 && (
              <li>
                Read withheld for:{' '}
                <span className="font-medium text-apex-fg">
                  {degradation.withheldInstruments.join(', ')}
                </span>
                .
              </li>
            )}
            {degradation.fabricatedClaims > 0 && (
              <li>
                {degradation.fabricatedClaims} fabricated claim
                {degradation.fabricatedClaims === 1 ? '' : 's'} caught and
                removed.
              </li>
            )}
          </ul>
        </div>
      )}

      {loadingBrief && (
        <p className="flex items-center gap-2 text-[12px] text-apex-fg-tertiary">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Checking the brief’s honesty metrics…
        </p>
      )}

      {positioningOnly && (
        <p className="text-[12px] leading-[17px] text-apex-fg-secondary">
          This is a{' '}
          <span className="font-medium text-apex-fg">positioning-only</span>{' '}
          brief — nothing fresh crossed the overnight window. A real, honest
          outcome, not a warning.
        </p>
      )}
    </div>
  )
}

function ErrorBody({
  reason,
  cost,
}: {
  reason: string | null
  cost: CostReport | null
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-apex-red-tint text-apex-red">
          <AlertCircle className="size-5" aria-hidden />
        </span>
        <div>
          <div className="text-[13px] font-medium text-apex-fg">
            The run stopped before the brief was ready.
          </div>
          {/* NAME what failed — `reason` is populated on every terminal error.
              "Something went wrong" is a lie when the API told us exactly. */}
          <p className="mt-1 text-[12.5px] leading-[18px] text-apex-red">
            {reason ?? 'The backend did not return a reason.'}
          </p>
        </div>
      </div>
      <CostReadout cost={cost} />
    </div>
  )
}

function BlockedBody({ reason }: { reason: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-apex-red-tint text-apex-red">
        <Ban className="size-5" aria-hidden />
      </span>
      <div>
        <div className="text-[13px] font-medium text-apex-fg">
          A hard-critical source is red — the brief is held.
        </div>
        <p className="mt-1 text-[12.5px] leading-[18px] text-apex-red">
          {reason}
        </p>
      </div>
    </div>
  )
}
