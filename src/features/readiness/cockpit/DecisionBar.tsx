import { Ban, FileText, RotateCw, Sparkles } from 'lucide-react'
import { Glass, StatusDot } from '@/design-system'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReadinessSource } from '@/lib/api/contracts'
import { useCountUp } from './useCountUp'

/**
 * The DECISION tile (Bento Cockpit). The point of the screen: spend ≈$0.12 or
 * not. Glass (chrome/action). When blocked, the UNBLOCK action leads; red is
 * spent here and nowhere else. The 8-dot strip is the verdict in miniature —
 * glanceable state without reading rows.
 */
export function DecisionBar({
  canGenerate,
  blockedReason,
  positioningOnly,
  freshCount,
  sources,
  onRefreshKite,
  onGenerate,
}: {
  canGenerate: boolean
  blockedReason: string | null
  positioningOnly: boolean
  freshCount: string
  sources: ReadinessSource[]
  onRefreshKite?: () => void
  onGenerate?: () => void
}) {
  const kiteBlocked = sources.some(
    (s) => s.action === 'kite_refresh' && s.status === 'red',
  )
  const [freshNum, freshDenom] = freshCount.split('/')
  const counted = Math.round(useCountUp(Number(freshNum) || 0))
  return (
    <Glass
      variant="toolbar"
      className="flex shrink-0 animate-in flex-wrap items-center gap-x-5 gap-y-3 fade-in slide-in-from-top-2 px-5 py-4 duration-500"
    >
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.05em]',
          canGenerate
            ? 'bg-apex-green-tint text-apex-green'
            : 'bg-apex-red-tint text-apex-red',
        )}
      >
        {canGenerate ? (
          <Sparkles className="finint-breathe size-3.5" aria-hidden />
        ) : (
          <Ban className="size-3.5" aria-hidden />
        )}
        {canGenerate ? 'Ready' : 'Not ready'}
      </span>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-medium text-apex-fg">
          <FileText className="size-4 text-apex-fg-tertiary" aria-hidden />
          {positioningOnly
            ? 'Generate a positioning-only brief'
            : 'Generate the morning brief'}
        </div>
        <div className="mt-0.5 text-[12px] text-apex-fg-tertiary">
          {canGenerate
            ? `≈ $0.12 · the AI narrative${positioningOnly ? ' · nothing fresh overnight' : ''}`
            : blockedReason}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-5 sm:ml-auto sm:w-auto sm:justify-end">
        {!canGenerate && kiteBlocked ? (
          <button
            type="button"
            onClick={onRefreshKite}
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border-[0.5px] border-apex-yellow bg-apex-yellow-tint px-3.5 text-[13px] font-medium text-apex-yellow transition-colors hover:bg-apex-yellow-tint/70"
          >
            <RotateCw className="size-4" aria-hidden />
            Refresh Kite token
          </button>
        ) : (
          <Button size="lg" disabled={!canGenerate} onClick={onGenerate}>
            <FileText aria-hidden />
            Generate
          </Button>
        )}

        <div className="flex items-center gap-3 border-l-[0.5px] border-apex-border-subtle pl-5">
          <div className="flex items-center gap-1">
            {sources.map((s) => (
              <StatusDot key={s.key} status={s.status} className="size-[7px]" />
            ))}
          </div>
          <span className="apex-tabular text-[13px] font-medium text-apex-fg">
            {`${counted}/${freshDenom}`}
          </span>
        </div>
      </div>
    </Glass>
  )
}
