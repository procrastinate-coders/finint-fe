import { Link } from '@tanstack/react-router'
import { ArrowRight, Clock, ShieldAlert, ShieldCheck } from 'lucide-react'
import type { BriefListItem } from '@/lib/api/contracts'
import { ScreenError } from '@/components/common/ScreenState'
import { Skeleton } from '@/design-system'
import { useBriefs } from '@/lib/query/hooks'
import { istDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Reveal } from './Reveal'

/** /history — past briefs, on the same surface as today's (GET /briefs). */
export function HistoryList() {
  const briefs = useBriefs()

  return (
    <div className="mx-auto max-w-[720px] pb-6">
      <Reveal>
        <header className="mb-5 flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary text-apex-fg-secondary">
            <Clock className="size-4" aria-hidden />
          </span>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-apex-fg">
              History
            </h1>
            <p className="text-[12.5px] text-apex-fg-tertiary">
              Past morning briefs — open any date to read it on the same surface.
            </p>
          </div>
        </header>
      </Reveal>

      {briefs.isPending ? (
        <HistorySkeleton />
      ) : briefs.isError ? (
        <ScreenError error={briefs.error} onRetry={() => briefs.refetch()} />
      ) : briefs.data.length === 0 ? (
        <div className="rounded-[14px] border-[0.5px] border-dashed border-apex-border bg-apex-secondary/30 px-6 py-12 text-center">
          <p className="text-[14px] font-medium text-apex-fg">No briefs yet</p>
          <p className="mt-1 text-[12.5px] text-apex-fg-tertiary">
            Generated briefs will appear here, most recent first.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {briefs.data.map((b, i) => (
            <Reveal key={b.date} delay={40 + i * 40}>
              <HistoryRow item={b} />
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  )
}

function HistoryRow({ item }: { item: BriefListItem }) {
  const degraded = item.guard_failed
  return (
    <li>
      <Link
        to="/brief/$date"
        params={{ date: item.date }}
        className={cn(
          'group flex items-center gap-4 overflow-hidden rounded-[14px] border-[0.5px] border-apex-border border-l-2 bg-apex-primary px-4 py-3.5 transition-all hover:border-apex-border-strong hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue',
          degraded ? 'border-l-apex-orange' : 'border-l-apex-green',
        )}
      >
        <span
          className={cn(
            'inline-flex size-9 shrink-0 items-center justify-center rounded-full',
            degraded
              ? 'bg-apex-orange-tint text-apex-orange'
              : 'bg-apex-green-tint text-apex-green',
          )}
        >
          {degraded ? (
            <ShieldAlert className="size-4" aria-hidden />
          ) : (
            <ShieldCheck className="size-4" aria-hidden />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium text-apex-fg">
              {item.label}
            </span>
            <span
              className={cn(
                'rounded-[5px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.03em]',
                degraded
                  ? 'bg-apex-orange-tint text-apex-orange'
                  : 'bg-apex-green-tint text-apex-green',
              )}
            >
              {degraded ? 'Degraded' : 'Clean'}
            </span>
          </div>
          {item.generated_at && (
            <div className="apex-tabular mt-0.5 text-[11px] text-apex-fg-tertiary">
              generated {istDateTime(item.generated_at)}
            </div>
          )}
        </div>

        <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-medium text-apex-fg-tertiary transition-colors group-hover:text-apex-fg">
          <span className="hidden opacity-0 transition-opacity group-hover:opacity-100 sm:inline">
            Read
          </span>
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </Link>
    </li>
  )
}

export function HistorySkeleton() {
  return (
    <ul className="space-y-2.5" aria-busy="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary px-4 py-3.5"
        >
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="size-4 shrink-0 rounded" />
        </li>
      ))}
    </ul>
  )
}
