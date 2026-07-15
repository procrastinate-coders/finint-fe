import { cn } from '@/lib/utils'

/**
 * Flat shimmer skeleton for data slots. Glass chrome renders immediately; data
 * skeletons fill in (CLAUDE.md law 9/10 — data stays flat, never glass). Size
 * it with width/height utilities.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('apex-skeleton', className)} aria-hidden />
}
