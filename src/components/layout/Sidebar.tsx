import { Link } from '@tanstack/react-router'
import { FileText, LayoutGrid } from 'lucide-react'
import { Glass, BrandMark, Wordmark } from '@/design-system'
import { cn } from '@/lib/utils'

// ≤1280px the glass sidebar collapses to icons (64px) and expands on hover.
const labelCls = 'max-xl:hidden max-xl:group-hover:inline whitespace-nowrap'

// Only routes that EXIST are linked (typed Links). The Brief is the whole app
// today; History + settings arrive with FIN-149.
interface NavItem {
  to: string
  label: string
  icon: typeof FileText
  exact?: boolean
  devOnly?: boolean
}

const NAV: NavItem[] = [
  { to: '/', label: 'Brief', icon: FileText, exact: true },
  {
    to: '/dev/components',
    label: 'Components',
    icon: LayoutGrid,
    devOnly: true,
  },
]

export function Sidebar() {
  const items = NAV.filter((n) => !n.devOnly || import.meta.env.DEV)

  return (
    <Glass
      variant="sidebar"
      as="aside"
      className="group fixed bottom-5 left-5 top-5 z-20 flex w-[220px] flex-col overflow-hidden transition-[width] duration-200 ease-out max-xl:w-[64px] max-xl:hover:w-[220px]"
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

      <div className="border-t-[0.5px] border-apex-border-subtle px-4 py-3">
        {/* Read-only is the product: FININT frames the morning; Father decides. */}
        <span className="inline-flex items-center gap-2 text-[11px] font-medium text-apex-fg-tertiary">
          <span className={labelCls}>Read-only · pre-market</span>
        </span>
      </div>
    </Glass>
  )
}
