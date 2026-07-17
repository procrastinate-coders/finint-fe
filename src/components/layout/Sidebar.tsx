import { Link } from '@tanstack/react-router'
import { Clock, FileText, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Glass, BrandMark, Wordmark } from '@/design-system'
import { cn } from '@/lib/utils'

// Only routes that EXIST are linked (typed Links).
interface NavItem {
  to: string
  label: string
  icon: typeof FileText
  exact?: boolean
}

// ONE destination (FIN-172): the home IS the Morning brief — the cockpit is its
// "not yet" state. No separate Brief tab; you reach the read via "View brief".
const NAV: NavItem[] = [
  { to: '/', label: 'Morning brief', icon: FileText, exact: true },
  { to: '/history', label: 'History', icon: Clock },
]

/**
 * The glass sidebar. Two responsive modes:
 * - **lg+**: a persistent rail. `collapsed` (persisted) toggles 220px ↔ 64px
 *   icon-only; a collapsed rail still hover-expands (it's `fixed`, so it overlays,
 *   never shoves content).
 * - **< lg**: an OFF-CANVAS DRAWER (220px, full labels). Hidden by default so the
 *   content gets the full narrow screen; a hamburger opens it, a tap on the scrim
 *   or any link closes it. A persistent rail on a phone would eat ~1/3 the width.
 */
export function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  // Labels: always shown in the mobile drawer (220px); on the lg rail, hidden
  // only when collapsed (and then on hover).
  const labelCls = cn(
    'whitespace-nowrap',
    collapsed && 'lg:hidden lg:group-hover:inline',
  )

  return (
    <Glass
      variant="sidebar"
      as="aside"
      className={cn(
        'group fixed bottom-5 left-5 top-5 z-30 flex w-[220px] flex-col overflow-hidden',
        // mobile: slide the drawer in/out
        'transition-transform duration-200 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-[calc(100%+1.25rem)]',
        // lg: always visible rail; animate width instead
        'lg:translate-x-0 lg:transition-[width]',
        collapsed ? 'lg:w-[64px] lg:hover:w-[220px]' : 'lg:w-[220px]',
      )}
    >
      <div className="flex h-[60px] items-center gap-3 px-4">
        <BrandMark size={26} />
        <Wordmark className={cn('inline-block text-[15px]', labelCls)} />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={onMobileClose}
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
        {/* Collapse toggle is a desktop-rail affordance; the mobile drawer closes
            via the scrim or a link tap. */}
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden size-8 shrink-0 items-center justify-center rounded-[8px] text-apex-fg-tertiary transition-colors hover:bg-white/[0.05] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue lg:flex"
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
