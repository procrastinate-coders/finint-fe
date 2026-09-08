import type { ReactNode } from 'react'

/** A titled region, matching the brief's research-note heading. Local to this
 *  feature — features never import each other (CLAUDE.md law 11). */
export function Section({
  id,
  title,
  subtitle,
  right,
  children,
}: {
  id?: string
  title: string
  subtitle?: ReactNode
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
