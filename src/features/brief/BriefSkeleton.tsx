import { Skeleton } from '@/design-system'

/**
 * A loading state SHAPED like the brief — same reading column, same lead card,
 * board and deep-read silhouettes — so the screen doesn't jump when data lands.
 */
export function BriefSkeleton() {
  return (
    <div className="mx-auto max-w-[1160px] pb-6" aria-busy="true">
      {/* header */}
      <div className="mb-4 flex items-end justify-between gap-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="hidden h-8 w-64 sm:block" />
      </div>

      {/* honesty line */}
      <Skeleton className="mb-4 h-11 w-full rounded-[10px]" />

      {/* jump nav */}
      <div className="mb-4 flex gap-2 rounded-[12px] border-[0.5px] border-apex-border-subtle p-1.5">
        {['w-16', 'w-14', 'w-16', 'w-20', 'w-24'].map((w, i) => (
          <Skeleton key={i} className={`h-7 rounded-[8px] ${w}`} />
        ))}
      </div>

      <div className="space-y-9">
        {/* market */}
        <section>
          <Skeleton className="mb-3 h-4 w-40" />
          <div className="rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary p-5">
            <Skeleton className="mb-3 h-3 w-24" />
            <div className="max-w-[70ch] space-y-2 border-l-2 border-apex-border-strong pl-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-[78%]" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border-[0.5px] border-apex-border-subtle sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="space-y-1.5 bg-apex-secondary/30 px-3.5 py-2.5"
                >
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="space-y-2 rounded-[12px] border-[0.5px] border-apex-border bg-apex-primary p-3.5"
              >
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            ))}
          </div>
        </section>

        {/* board */}
        <section>
          <Skeleton className="mb-3 h-4 w-56" />
          <div className="max-w-[760px] overflow-hidden rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b-[0.5px] border-apex-border-subtle px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        </section>

        {/* deep reads */}
        <section>
          <Skeleton className="mb-3 h-4 w-48" />
          <div className="space-y-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-[16px] border-[0.5px] border-apex-border bg-apex-primary"
              >
                <div className="flex items-center justify-between border-b-[0.5px] border-apex-border-subtle px-5 py-3.5">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-4 w-24 rounded" />
                </div>
                <div className="grid lg:grid-cols-[248px_minmax(0,1fr)]">
                  <div className="space-y-4 border-b-[0.5px] border-apex-border-subtle bg-apex-secondary/25 p-5 lg:border-b-0 lg:border-r-[0.5px]">
                    {Array.from({ length: 4 }).map((__, j) => (
                      <div key={j} className="space-y-1.5">
                        <Skeleton className="h-2.5 w-20" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-[95%]" />
                    <Skeleton className="h-4 w-[88%]" />
                    <Skeleton className="h-16 w-full rounded-[10px]" />
                    <Skeleton className="h-4 w-[70%]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
