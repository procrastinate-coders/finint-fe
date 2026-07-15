import type { ReactNode } from 'react'
import { RotateCw, TriangleAlert } from 'lucide-react'
import { Skeleton } from '@/design-system'
import { ApiError } from '@/lib/api/client'

/** Flat, glass-free loading state (data stays flat — law 9/10). */
export function ScreenLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-[84px]" />
      <div className="space-y-3 rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  )
}

/**
 * A specific, recoverable error: names the failure + offers Retry in place. An
 * ApiError carries the backend's own message; anything else gets a plain line.
 */
export function ScreenError({
  error,
  onRetry,
}: {
  error: unknown
  onRetry?: () => void
}) {
  const msg =
    error instanceof ApiError
      ? error.message
      : 'Could not load this screen. Check the backend connection.'
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4 text-[14px] text-apex-red"
    >
      <span className="flex items-center gap-2">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        {msg}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-apex-border px-2.5 py-1 text-[12px] font-medium text-apex-fg-secondary transition-colors hover:bg-white/[0.04] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
        >
          <RotateCw className="size-3.5" aria-hidden />
          Retry
        </button>
      )}
    </div>
  )
}

export function ScreenEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-8 text-center text-[14px] text-apex-fg-secondary">
      {children}
    </div>
  )
}
