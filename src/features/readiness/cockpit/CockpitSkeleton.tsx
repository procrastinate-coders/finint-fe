import { Skeleton } from '@/design-system'

/**
 * A loading state SHAPED like the Bento Cockpit — the decision bar over the
 * sources rail | board | news+macro grid — so the readiness screen settles into
 * place instead of jumping from generic bars to the real layout.
 */
export function CockpitSkeleton() {
  return (
    <div
      className="flex flex-col gap-3.5 lg:h-[calc(100svh-150px)] lg:min-h-[600px]"
      aria-busy="true"
    >
      {/* decision bar */}
      <div className="flex shrink-0 items-center gap-5 rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary px-5 py-4">
        <Skeleton className="h-7 w-24 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Skeleton className="h-9 w-32 rounded-[10px]" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* rail | board | news+macro */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 lg:grid-cols-[244px_minmax(0,1fr)_340px]">
        <Tile>
          <div className="space-y-2.5 p-3.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="size-2 shrink-0 rounded-full" />
                <Skeleton className="h-3.5 flex-1" />
              </div>
            ))}
          </div>
        </Tile>

        <Tile>
          <div className="grid grid-cols-2 gap-2.5 p-4 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="space-y-2 rounded-[12px] border-[0.5px] border-apex-border bg-apex-secondary/40 p-2.5"
              >
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </Tile>

        <div className="grid min-h-0 grid-rows-[1.5fr_1fr] gap-3.5">
          <Tile>
            <div className="space-y-2.5 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-[8px]" />
              ))}
            </div>
          </Tile>
          <Tile>
            <div className="grid grid-cols-2 gap-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-[8px]" />
              ))}
            </div>
          </Tile>
        </div>
      </div>
    </div>
  )
}

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 overflow-hidden rounded-[14px] border-[0.5px] border-apex-border bg-apex-primary">
      {children}
    </div>
  )
}
