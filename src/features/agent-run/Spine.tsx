import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * THE ALIGNMENT SPINE — the page's one structural idea.
 *
 * Every region hangs off the same label gutter: the verdict band's rows, the six
 * board-fact groups, the four analyst reads, the board notes, the guard
 * decisions. One rule down the whole page.
 *
 * ⚠️ This is what stops a dense page reading as scattered. The previous version
 * had no spine at all — every region invented its own alignment, which is why
 * nine panels of correct information still felt like debris. Density is bought
 * with alignment, not with smaller type.
 *
 * Collapses to a single column below `md`, where a 108px gutter would leave the
 * content about forty characters wide.
 */
export function Spine({
  label,
  children,
  className,
}: {
  label: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid items-start gap-2 md:grid-cols-[108px_minmax(0,1fr)] md:gap-4',
        className,
      )}
    >
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-apex-fg-tertiary md:pt-0.5">
        {label}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** A titled region. Quiet regions (guard, receipts) get a lighter head. */
export function Section({
  title,
  subtitle,
  quiet,
  children,
}: {
  title: string
  subtitle?: ReactNode
  quiet?: boolean
  children: ReactNode
}) {
  return (
    <section className={cn(quiet && 'border-t-[0.5px] border-apex-border pt-4')}>
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2
          className={cn(
            quiet
              ? 'text-[11px] font-medium uppercase tracking-[0.08em] text-apex-fg-secondary'
              : 'text-[15px] font-semibold tracking-[-0.012em] text-apex-fg',
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <span className="text-[11px] text-apex-fg-tertiary">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  )
}
