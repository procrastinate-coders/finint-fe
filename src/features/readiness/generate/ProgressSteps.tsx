import { AlertCircle, Check, Loader2 } from 'lucide-react'
import type { RunStep } from '@/lib/api/contracts'
import { cn } from '@/lib/utils'
import { STEP_LABEL, STEP_ORDER } from './step-meta'

/**
 * The 4-step progress. Renders in the canonical fetch→scan→news→write order
 * (never trusting array order), each row showing the API's live `detail`. The
 * state glyph is the truth: a terminal run must show NO spinner (FIN-164 fixed
 * `write: running` persisting after the run ended) — `write` is `done` or
 * `error`, never a forever-spinner.
 */
export function ProgressSteps({ steps }: { steps: RunStep[] }) {
  const byKey = new Map(steps.map((s) => [s.key, s]))
  return (
    <ol className="space-y-1">
      {STEP_ORDER.map((key) => {
        const step = byKey.get(key)
        const state = step?.state ?? 'pending'
        return (
          <li
            key={key}
            className={cn(
              'flex items-center gap-3 rounded-[10px] border-[0.5px] px-3 py-2.5 transition-colors',
              state === 'running'
                ? 'border-apex-blue/40 bg-apex-blue-tint'
                : state === 'error'
                  ? 'border-apex-red/40 bg-apex-red-tint'
                  : 'border-apex-border bg-apex-secondary/40',
            )}
          >
            <StateGlyph state={state} />
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-[13px] font-medium',
                  state === 'pending'
                    ? 'text-apex-fg-tertiary'
                    : 'text-apex-fg',
                )}
              >
                {STEP_LABEL[key] ?? key}
              </div>
              {step?.detail && (
                <div className="truncate text-[11.5px] text-apex-fg-tertiary">
                  {step.detail}
                </div>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function StateGlyph({ state }: { state: string }) {
  if (state === 'done') {
    return (
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-apex-green-tint text-apex-green">
        <Check className="size-3.5" aria-label="done" />
      </span>
    )
  }
  if (state === 'running') {
    return (
      <Loader2
        className="size-5 shrink-0 animate-spin text-apex-blue"
        aria-label="running"
      />
    )
  }
  if (state === 'error') {
    return (
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-apex-red-tint text-apex-red">
        <AlertCircle className="size-3.5" aria-label="failed" />
      </span>
    )
  }
  return (
    <span
      className="inline-flex size-5 shrink-0 items-center justify-center"
      aria-label="pending"
    >
      <span className="size-2 rounded-full bg-apex-fg-tertiary/50" aria-hidden />
    </span>
  )
}
