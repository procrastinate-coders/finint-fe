import { TriangleAlert } from 'lucide-react'
import { ScreenError, ScreenLoading } from '@/components/common/ScreenState'
import { useBriefToday } from '@/lib/query/hooks'
import { istDate } from '@/lib/format'

/**
 * The brief landing — a MINIMAL FIN-162 stub. The full per-instrument brief
 * screen is FIN-162; FIN-161 needs a real destination for "View brief" and, more
 * importantly, a place that surfaces the honesty metrics at the top (law 4). A
 * degraded brief that succeeded is flagged HERE too, not just in the generate
 * modal — the one thing that must never be hidden.
 */
export function BriefScreen() {
  const brief = useBriefToday(true)

  if (brief.isPending) return <ScreenLoading />
  if (brief.isError) {
    return <ScreenError error={brief.error} onRetry={() => brief.refetch()} />
  }

  const data = brief.data
  const guardFailed = data.meta?.guard_failed ?? false
  const fabricated = data.meta?.fabricated_claims ?? 0
  const withheld = (data.instruments ?? [])
    .filter((i) => i.ai_read?.guard_failed)
    .map((i) => i.instrument)
  const degraded = guardFailed || fabricated > 0 || withheld.length > 0

  return (
    <div className="mx-auto max-w-[820px] space-y-5">
      <header>
        <h1 className="text-[22px] font-semibold text-apex-fg">{data.label}</h1>
        <p className="mt-0.5 text-[13px] text-apex-fg-tertiary">
          Market opens {data.market_open} · brief for {istDate(data.date)}
        </p>
      </header>

      {/* Honesty metrics — FIRST-CLASS, at the top (law 4). */}
      {degraded && (
        <div
          role="alert"
          className="space-y-1 rounded-[12px] border-[0.5px] border-apex-orange/40 bg-apex-orange-tint px-4 py-3"
        >
          <div className="flex items-center gap-2 text-[14px] font-medium text-apex-orange">
            <TriangleAlert className="size-4 shrink-0" aria-hidden />
            This brief is degraded — substance guards withheld content
          </div>
          <ul className="ml-6 list-disc text-[12.5px] leading-[18px] text-apex-fg-secondary">
            {guardFailed && <li>A substance guard fired on this run.</li>}
            {withheld.length > 0 && (
              <li>
                Read withheld for:{' '}
                <span className="font-medium text-apex-fg">
                  {withheld.join(', ')}
                </span>
                .
              </li>
            )}
            {fabricated > 0 && (
              <li>
                {fabricated} fabricated claim{fabricated === 1 ? '' : 's'} caught
                and removed.
              </li>
            )}
          </ul>
        </div>
      )}

      <section className="space-y-2 rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary px-4 py-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-apex-fg-secondary">
          Session read
        </h2>
        <p className="text-[15px] leading-[22px] text-apex-fg">
          {data.market.session_read}
        </p>
        {data.market.regime?.headline && (
          <p className="text-[13px] leading-[19px] text-apex-fg-secondary">
            {data.market.regime.headline}
          </p>
        )}
      </section>

      <p className="text-[12px] text-apex-fg-tertiary">
        The full per-instrument brief screen lands in FIN-162.
        {' '}
        {(data.instruments?.length ?? 0) > 0 &&
          `${data.instruments?.length} instrument read${data.instruments?.length === 1 ? '' : 's'} · `}
        {(data.market.catalysts?.length ?? 0)} overnight catalyst
        {(data.market.catalysts?.length ?? 0) === 1 ? '' : 's'}.
      </p>
    </div>
  )
}
