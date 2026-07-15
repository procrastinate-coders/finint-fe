import { useMatches, useNavigate } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
import { Glass, IstClock, Skeleton } from '@/design-system'
import { useAuth } from '@/lib/auth'
import { useMe } from '@/lib/query/hooks'

export function Header() {
  const matches = useMatches()
  const title =
    [...matches].reverse().find((m) => m.staticData?.title)?.staticData
      ?.title ?? 'FININT'
  const { logout } = useAuth()
  const navigate = useNavigate()
  const me = useMe()

  async function onLogout() {
    await logout()
    await navigate({ to: '/login' })
  }

  return (
    <Glass
      variant="toolbar"
      as="header"
      className="sticky top-5 z-10 mb-5 flex h-[64px] items-center justify-between gap-3 px-4 sm:px-6"
    >
      <div className="truncate text-[15px] font-medium text-apex-fg">
        {title}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden sm:block">
          <IstClock />
        </span>
        {me.isPending ? (
          <Skeleton className="h-4 w-32" />
        ) : (
          me.data?.email && (
            <span
              className="hidden max-w-[220px] truncate text-[13px] text-apex-fg-secondary sm:inline"
              title={me.data.email}
            >
              {me.data.email}
            </span>
          )
        )}
        <button
          type="button"
          onClick={onLogout}
          aria-label="Sign out"
          className="inline-flex items-center gap-1.5 rounded-[8px] border-[0.5px] border-apex-border px-2.5 py-1.5 text-[12px] font-medium text-apex-fg-secondary transition-colors hover:bg-white/[0.04] hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
        >
          <LogOut className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </Glass>
  )
}
