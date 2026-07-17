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
  const [mobileOpen, setMobileOpen] = useState(false)

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
      <Sidebar
        collapsed={collapsed}
        onToggle={toggle}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* Scrim behind the mobile drawer (lg hides it — the rail is persistent). */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
        />
      )}

      {/* Content clears the rail at lg (104px collapsed / 260px expanded); on
          mobile it's full-width (px-5) — the drawer is off-canvas. */}
      <div
        className={cn(
          'relative z-10 px-5 transition-[padding] duration-200 ease-out',
          collapsed ? 'lg:pl-[104px]' : 'lg:pl-[260px]',
        )}
      >
        <Header onMobileMenu={() => setMobileOpen(true)} />
        <main className="mx-auto max-w-[1600px] pb-10 pt-6">{children}</main>
      </div>
    </div>
  )
}
