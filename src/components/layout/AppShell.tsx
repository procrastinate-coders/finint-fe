import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

/** The ambient aurora the frosted chrome refracts. Static (no live feed). */
function Aura() {
  return (
    <div className="apex-aura" aria-hidden>
      <span className="a-blue" />
      <span className="a-green" />
      <span className="a-red" />
      <span className="a-indigo" />
    </div>
  )
}

const COLLAPSE_KEY = 'finint.sidebar_collapsed'

function readCollapsed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(COLLAPSE_KEY) === '1'
}

/** Authenticated shell: floating glass sidebar + glass toolbar over the aura. */
export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readCollapsed)

  function toggle() {
    setCollapsed((v) => {
      const next = !v
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  return (
    <div className="relative min-h-svh overflow-x-clip bg-apex-canvas text-apex-fg">
      <Aura />
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      {/* Below lg the rail is always icon-only (no room to expand), so the
          content clears 104px; at lg+ the manual `collapsed` state decides. */}
      <div
        className={cn(
          'relative z-10 pl-[104px] pr-5 transition-[padding] duration-200 ease-out',
          !collapsed && 'lg:pl-[260px]',
        )}
      >
        <Header />
        <main className="mx-auto max-w-[1600px] pb-10 pt-6">{children}</main>
      </div>
    </div>
  )
}
