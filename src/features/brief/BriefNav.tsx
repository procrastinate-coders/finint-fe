import { cn } from '@/lib/utils'
import { scrollToSection, useScrollSpy } from './useScrollSpy'

export interface NavSection {
  id: string
  label: string
  withheld?: boolean
}

/**
 * The sticky jump-nav — scroll-spies the sections and smooth-scrolls to them.
 * Gives the long brief a spine: a trader sees where he is and jumps to any
 * instrument in one click. Sticks just below the app header.
 */
export function BriefNav({ sections }: { sections: NavSection[] }) {
  const ids = sections.map((s) => s.id)
  const active = useScrollSpy(ids)

  return (
    <nav className="sticky top-[84px] z-[9] -mx-1 mb-4 flex items-center gap-1 overflow-x-auto rounded-[12px] border-[0.5px] border-apex-border-subtle bg-apex-canvas/80 px-1.5 py-1.5 backdrop-blur-md [scrollbar-width:none]">
      {sections.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => scrollToSection(s.id)}
          className={cn(
            'shrink-0 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue',
            active === s.id
              ? 'bg-white/[0.08] text-apex-fg'
              : 'text-apex-fg-tertiary hover:text-apex-fg-secondary',
          )}
        >
          {s.label}
          {s.withheld && (
            <span
              className="ml-1.5 inline-block size-1.5 translate-y-[-1px] rounded-full bg-apex-orange"
              aria-label="withheld"
            />
          )}
        </button>
      ))}
    </nav>
  )
}
