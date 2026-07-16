import { Link } from '@tanstack/react-router'
import { Gauge, LayoutGrid, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Glass, BrandMark, Wordmark } from '@/design-system'
import { cn } from '@/lib/utils'

// Only routes that EXIST are linked (typed Links). The Brief is the whole app
// today; History + settings arrive with FIN-149.
interface NavItem {
  to: string
  label: string
  icon: typeof Gauge
  exact?: boolean
  devOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Readiness', icon: Gauge, exact: true },
  {
    to: '/dev/components',
    label: 'Components',
    icon: LayoutGrid,
    devOnly: true,
  },
]

/**
 * The glass sidebar. `collapsed` (persisted in AppShell) is the manual state —
 * icon-only at 64px; it still expands on hover so a collapsed rail stays
 * navigable (the rail is `fixed`, so a hover-expand overlays content, never
 * shoves it). Labels show when expanded OR on hover.
 */
export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean
  onToggle: () => void
}) {
  const items = NAV.filter((n) => !n.devOnly || import.meta.env.DEV)
  // Icon-only by default (mobile + collapsed); labels appear on hover, and stay
  // visible at lg+ only when NOT collapsed.
  const labelCls = cn(
    'whitespace-nowrap hidden group-hover:inline',
    !collapsed && 'lg:inline',
  )

  return (
    <Glass
      variant="sidebar"
      as="aside"
      className={cn(
        'group fixed bottom-5 left-5 top-5 z-20 flex w-[64px] flex-col overflow-hidden transition-[width] duration-200 ease-out hover:w-[220px]',
        !collapsed && 'lg:w-[220px]',
      )}
    >
      <div className="flex h-[60px] items-center gap-3 px-4">
        <BrandMark size={26} />
        <Wordmark className={cn('inline-block text-[15px]', labelCls)} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: Boolean(exact) }}
            className="flex h-9 items-center gap-3 rounded-[8px] px-3 text-[13px] text-apex-fg-secondary transition-colors duration-[100ms] hover:bg-white/[0.04] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-apex-blue"
            activeProps={{ className: 'bg-white/[0.07] text-apex-fg' }}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className={labelCls}>{label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t-[0.5px] border-apex-border-subtle px-3 py-3">
        {/* Read-only is the product: FININT frames the morning; Father decides. */}
        <span
          className={cn(
            'inline-flex items-center gap-2 pl-1 text-[11px] font-medium text-apex-fg-tertiary',
            labelCls,
          )}
        >
          Read-only · pre-market
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-apex-fg-tertiary transition-colors hover:bg-white/[0.05] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" aria-hidden />
          ) : (
            <PanelLeftClose className="size-4" aria-hidden />
          )}
        </button>
      </div>
    </Glass>
  )
}
