import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { ScreenError } from '@/components/common/ScreenState'
import { useBrief } from '@/lib/query/hooks'
import { BriefRenderer } from './BriefRenderer'
import { BriefSkeleton } from './BriefSkeleton'

/** /brief/$date — a past brief, on the exact same surface as today's. */
export function BriefByDate({ date }: { date: string }) {
  const brief = useBrief(date)

  if (brief.isPending) return <BriefSkeleton />
  if (brief.isError) {
    return <ScreenError error={brief.error} onRetry={() => brief.refetch()} />
  }

  return (
    <div className="space-y-3">
      <Link
        to="/history"
        className="mx-auto flex max-w-[1100px] items-center gap-1.5 text-[12px] text-apex-fg-secondary transition-colors hover:text-apex-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apex-blue"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        History
      </Link>
      <BriefRenderer brief={brief.data} />
    </div>
  )
}
