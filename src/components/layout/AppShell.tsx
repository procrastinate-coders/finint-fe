import type { ReactNode } from 'react'
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

/** Authenticated shell: floating glass sidebar + glass toolbar over the aura. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh overflow-x-clip bg-apex-canvas text-apex-fg">
      <Aura />
      <Sidebar />
      <div className="relative z-10 pl-[260px] pr-5 transition-[padding] duration-200 ease-out max-xl:pl-[104px]">
        <Header />
        <main className="mx-auto max-w-[1600px] pb-10 pt-6">{children}</main>
      </div>
    </div>
  )
}
