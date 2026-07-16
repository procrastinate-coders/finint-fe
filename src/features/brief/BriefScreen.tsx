import { ScreenError } from '@/components/common/ScreenState'
import { useBriefToday } from '@/lib/query/hooks'
import { BriefRenderer } from './BriefRenderer'
import { BriefSkeleton } from './BriefSkeleton'

/** /brief/today — the morning brief. THE PRODUCT (FIN-162). */
export function BriefScreen() {
  const brief = useBriefToday(true)

  if (brief.isPending) return <BriefSkeleton />
  if (brief.isError) {
    return <ScreenError error={brief.error} onRetry={() => brief.refetch()} />
  }
  return <BriefRenderer brief={brief.data} />
}
