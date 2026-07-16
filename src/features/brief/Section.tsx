import type { ReactNode } from 'react'

/**
 * A lightweight titled region (NOT a heavy card — the data inside carries its own
 * surfaces). One consistent heading style so the page reads as a research note,
 * not a stack of nested boxes. `scroll-mt` clears the sticky header + jump-nav.
 */
export function Section({
  id,
  title,
  subtitle,
  right,
  children,
}: {
  id?: string
  title: string
  subtitle?: string
  right?: ReactNode
  children: ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-[140px]">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[15px] font-semibold tracking-tight text-apex-fg">
            {title}
          </h2>
          {subtitle && (
            <span className="text-[12px] text-apex-fg-tertiary">{subtitle}</span>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}
