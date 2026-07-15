import { useMatches } from '@tanstack/react-router'
import { Glass, IstClock } from '@/design-system'
import { useAuth } from '@/lib/auth'

export function Header() {
  const matches = useMatches()
  const title =
    [...matches].reverse().find((m) => m.staticData?.title)?.staticData
      ?.title ?? 'FININT'
  const { user } = useAuth()

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
        {user?.name && (
          <span className="text-[13px] text-apex-fg-secondary">
            {user.name}
          </span>
        )}
      </div>
    </Glass>
  )
}
