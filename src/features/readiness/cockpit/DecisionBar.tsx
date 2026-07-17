import { Ban, Check, FileText, RotateCw, Sparkles, TriangleAlert } from 'lucide-react'
import { Glass, StatusDot } from '@/design-system'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ReadinessBrief, ReadinessSource } from '@/lib/api/contracts'
import { istTime } from '@/lib/format'
import { useCountUp } from './useCountUp'

/**
 * The DECISION tile — the one thing Naveen must know in a glance at 8am: is my
 * brief ready, or do I need to make one? The CTA is driven by the `brief` block
 * (FIN-172):
 *   complete   → View brief. NOT Generate — generating re-serves what he has for
 *                $0, so "Generate ≈$0.12" would be a false statement.
 *   incomplete → BOTH. Read what's there, OR spend ~$0.12 to re-run and improve
 *                it (a positioning-only/partial brief re-generates once news
 *                returns). The difference is made obvious.
 *   no brief   → the readiness gate + Generate (the original path).
 * A degraded brief (guard_failed) is FLAGGED here too — never hidden (law 2/4).
 */
export function DecisionBar({
  brief,
  canGenerate,
  blockedReason,
  positioningOnly,
  freshCount,
  sources,
  onRefreshKite,
  onGenerate,
  onViewBrief,
}: {
  brief: ReadinessBrief | null
  canGenerate: boolean
  blockedReason: string | null
  positioningOnly: boolean
  freshCount: string
  sources: ReadinessSource[]
  onRefreshKite?: () => void
  onGenerate?: () => void
  onViewBrief?: () => void
}) {
  const kiteBlocked = sources.some(
    (s) => s.action === 'kite_refresh' && s.status === 'red',
  )
  const [freshNum, freshDenom] = freshCount.split('/')
  const counted = Math.round(useCountUp(Number(freshNum) || 0))

  const hasBrief = brief?.exists ?? false
  const complete = hasBrief && (brief?.is_complete ?? false)
  const incomplete = hasBrief && !(brief?.is_complete ?? false)
  const degraded = brief?.guard_failed ?? false

  // The Generate / Refresh-Kite affordance (shared by incomplete + no-brief).
  const generateAction =
    !canGenerate && kiteBlocked ? (
      <button
        type="button"
        onClick={onRefreshKite}
        className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-[10px] border-[0.5px] border-apex-yellow bg-apex-yellow-tint px-3.5 text-[13px] font-medium text-apex-yellow transition-colors hover:bg-apex-yellow-tint/70"
      >
        <RotateCw className="size-4" aria-hidden />
        Refresh Kite token
      </button>
    ) : (
      <Button
        size="lg"
        variant={incomplete ? 'outline' : 'default'}
        disabled={!canGenerate}
        onClick={onGenerate}
      >
        <FileText aria-hidden />
        {incomplete ? 'Re-generate · ≈ $0.12' : 'Generate'}
      </Button>
    )

  return (
    <Glass
      variant="toolbar"
      className="flex shrink-0 animate-in flex-wrap items-center gap-x-5 gap-y-3 fade-in slide-in-from-top-2 px-5 py-4 duration-500"
    >
      <StateBadge complete={complete} incomplete={incomplete} canGenerate={canGenerate} />

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[15px] font-medium text-apex-fg">
          <FileText className="size-4 text-apex-fg-tertiary" aria-hidden />
          {complete && 'Your morning brief is ready'}
          {incomplete &&
            `${brief?.positioning_only ? 'Positioning-only' : 'Partial'} brief is ready`}
          {!hasBrief &&
            (positioningOnly
              ? 'Generate a positioning-only brief'
              : 'Generate the morning brief')}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-apex-fg-tertiary">
          {complete && (
            <>
              <span>
                generated {istTime(brief?.generated_at)} · $0 to open
              </span>
              {degraded && <DegradedTag />}
            </>
          )}
          {incomplete && (
            <>
              <span>Read it now, or re-generate to improve (≈ $0.12)</span>
              {degraded && <DegradedTag />}
            </>
          )}
          {!hasBrief && (
            <span>
              {canGenerate
                ? `≈ $0.12 · the AI narrative${positioningOnly ? ' · nothing fresh overnight' : ''}`
                : blockedReason}
            </span>
          )}
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end">
        {complete && (
          <Button size="lg" onClick={onViewBrief}>
            <FileText aria-hidden />
            View brief
          </Button>
        )}
        {incomplete && (
          <>
            <Button size="lg" onClick={onViewBrief}>
              <FileText aria-hidden />
              View brief
            </Button>
            {generateAction}
          </>
        )}
        {!hasBrief && generateAction}

        <div className="flex items-center gap-3 border-l-[0.5px] border-apex-border-subtle pl-4">
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

function StateBadge({
  complete,
  incomplete,
  canGenerate,
}: {
  complete: boolean
  incomplete: boolean
  canGenerate: boolean
}) {
  if (complete) {
    return (
      <Badge className="bg-apex-green-tint text-apex-green">
        <Check className="size-3.5" aria-hidden />
        Brief ready
      </Badge>
    )
  }
  if (incomplete) {
    return (
      <Badge className="bg-apex-yellow-tint text-apex-yellow">
        <FileText className="size-3.5" aria-hidden />
        Partial brief
      </Badge>
    )
  }
  return canGenerate ? (
    <Badge className="bg-apex-green-tint text-apex-green">
      <Sparkles className="finint-breathe size-3.5" aria-hidden />
      Ready
    </Badge>
  ) : (
    <Badge className="bg-apex-red-tint text-apex-red">
      <Ban className="size-3.5" aria-hidden />
      Not ready
    </Badge>
  )
}

function Badge({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.05em]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Degraded still lands, FLAGGED (law 2/4) — never hidden behind a clean CTA. */
function DegradedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[5px] bg-apex-orange-tint px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.03em] text-apex-orange">
      <TriangleAlert className="size-3" aria-hidden />
      degraded
    </span>
  )
}
