import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ReadinessSource } from '@/lib/api/contracts'
import { SourceRow } from '@/design-system'
import { Button } from '@/components/ui/button'
import { ScreenError, ScreenLoading } from '@/components/common/ScreenState'
import { istDate } from '@/lib/format'
import { queryKeys, useReadiness, useRefreshSpine } from '@/lib/query/hooks'
import {
  hasAttemptedOnLandRefresh,
  markOnLandRefreshAttempted,
  shouldRefreshOnLand,
} from './on-land'
import { RefreshReport } from './RefreshReport'
import { KiteRefreshModal } from './KiteRefreshModal'

export function ReadinessScreen() {
  const readiness = useReadiness()
  const refresh = useRefreshSpine()
  const queryClient = useQueryClient()
  const [kiteOpen, setKiteOpen] = useState(false)
  const [reportDismissed, setReportDismissed] = useState(false)

  const sources = readiness.data?.sources

  // On-land auto-refresh — STALE-GATED, at most once per session (FFE-006). The
  // module guard survives StrictMode's double-mount and cannot loop if a source
  // stays red after the refresh. All-amber → shouldRefreshOnLand is false → zero
  // calls (the GNews quota is 100/day; a naive rule exhausts it).
  useEffect(() => {
    if (!sources || hasAttemptedOnLandRefresh()) return
    if (!shouldRefreshOnLand(sources)) return
    markOnLandRefreshAttempted()
    // (reportDismissed is already false on mount — no reset needed here.)
    refresh.mutate()
  }, [sources, refresh])

  // already_running → bound the wait with started_at (refresh_spine runs ~7s),
  // then re-read ONCE. Never poll forever.
  useEffect(() => {
    const res = refresh.data
    if (!res || res.status !== 'already_running') return
    let waitMs = 8000
    if (res.started_at) {
      const elapsed = Date.now() - new Date(res.started_at).getTime()
      waitMs = Math.min(8000, Math.max(1500, 8000 - elapsed))
    }
    const id = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.readiness })
    }, waitMs)
    return () => clearTimeout(id)
  }, [refresh.data, queryClient])

  if (readiness.isPending) return <ScreenLoading />
  if (readiness.isError) {
    return (
      <ScreenError
        error={readiness.error}
        onRetry={() => readiness.refetch()}
      />
    )
  }

  const data = readiness.data
  const kite = data.sources.find((s) => s.key === 'kite')

  function onAction(source: ReadinessSource) {
    if (source.action === 'kite_refresh') {
      setKiteOpen(true)
      return
    }
    // news_refresh / refresh → the spine refresh (POST /refresh).
    setReportDismissed(false)
    refresh.mutate()
  }

  const today = istDate(new Date().toISOString())

  return (
    <div className="max-w-[820px]">
      <p className="mb-6 text-[14px] leading-[20px] text-apex-fg-secondary">
        Your pre-market intelligence read for {today}. MCX opens 9:00 IST —
        generate once the sources are fresh, then scan the board before the
        bell.
      </p>

      {/* Generate gate — the button's function is FIN-161; here it is gated by
          can_generate and otherwise inert (no /generate call). */}
      <div className="mb-2 flex flex-wrap items-center gap-4">
        <Button
          size="lg"
          disabled={!data.can_generate}
          onClick={() =>
            toast.info('Brief generation is coming in the next update.')
          }
        >
          <FileText aria-hidden />
          Generate brief
        </Button>
      </div>
      {!data.can_generate && data.blocked_reason && (
        <p className="mb-2 text-[12px] text-apex-fg-tertiary">
          {data.blocked_reason}
        </p>
      )}

      {/* Refresh feedback — honest per-source truth, never a generic toast. */}
      <div className="mt-6 space-y-4">
        {refresh.isPending && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4 text-[13px] text-apex-fg-secondary"
          >
            <Loader2
              className="size-4 animate-spin text-apex-blue"
              aria-hidden
            />
            Refreshing sources…
          </div>
        )}
        {refresh.isError && (
          <div
            role="alert"
            className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4 text-[13px] text-apex-red"
          >
            Could not reach the backend to refresh. Check the connection and try
            again.
          </div>
        )}
        {refresh.data && !refresh.isPending && !reportDismissed && (
          <RefreshReport
            result={refresh.data}
            onDismiss={() => setReportDismissed(true)}
          />
        )}

        {/* Data-source health — mapped FROM the array (law 5), never hardcoded. */}
        <div className="overflow-hidden rounded-[10px] border-[0.5px] border-apex-border">
          <div className="flex items-center justify-between bg-apex-secondary px-4 py-3">
            <span className="text-[13px] font-medium text-apex-fg">
              Data sources
            </span>
            <span className="apex-tabular text-[11px] text-apex-fg-secondary">
              {data.fresh_count} fresh
            </span>
          </div>
          {data.sources.map((s) => (
            <SourceRow
              key={s.key}
              source={s}
              onAction={onAction}
              actionPending={refresh.isPending && s.action !== 'kite_refresh'}
            />
          ))}
        </div>

        {kite && kite.status === 'red' && (
          <p className="px-0.5 text-[12px] leading-[17px] text-apex-fg-secondary">
            <span className="text-apex-yellow">
              Kite needs a daily manual login
            </span>{' '}
            — refresh to generate on fresh price &amp; open-interest data.
          </p>
        )}
      </div>

      {kiteOpen && (
        <KiteRefreshModal
          onClose={() => setKiteOpen(false)}
          onComplete={() => setKiteOpen(false)}
        />
      )}
    </div>
  )
}
