import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A staggered entrance — fade + rise, motion-safe (reduced-motion gets nothing).
 * `backwards` fill keeps it hidden until its delay so the page assembles calmly. */
export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-backwards motion-safe:duration-500',
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
