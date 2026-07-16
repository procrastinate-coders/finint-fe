import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ReadinessSource } from '@/lib/api/contracts'
import { ScreenError, ScreenLoading } from '@/components/common/ScreenState'
import { queryKeys, useReadiness, useRefreshSpine } from '@/lib/query/hooks'
import {
  hasAttemptedOnLandRefresh,
  markOnLandRefreshAttempted,
  shouldRefreshOnLand,
} from './on-land'
import { RefreshReport } from './RefreshReport'
import { KiteRefreshModal } from './KiteRefreshModal'
import { EvidenceCockpit } from './cockpit/EvidenceCockpit'

/**
 * The readiness/evidence screen — the app's home. It renders the Bento Cockpit
 * (FIN-169's `evidence`) over the FIN-160 spine: a stale-gated on-land refresh,
 * the honest per-source refresh report, and the Kite daily-login modal. The
 * cockpit's decision bar + sources rail SUPERSEDE the old flat source list —
 * every input is now in one non-scroll surface (FFE-010).
 */
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
      <ScreenError error={readiness.error} onRetry={() => readiness.refetch()} />
    )
  }

  const data = readiness.data

  // A refreshable source clicked in the rail: Kite opens the daily-login modal;
  // everything else triggers the spine refresh (POST /refresh).
  function onRefreshSource(source: ReadinessSource) {
    if (source.action === 'kite_refresh') {
      setKiteOpen(true)
      return
    }
    setReportDismissed(false)
    refresh.mutate()
  }

  const showFeedback =
    refresh.isPending ||
    refresh.isError ||
    (!!refresh.data && !reportDismissed)

  return (
    <>
      <EvidenceCockpit
        data={data}
        onRefreshKite={() => setKiteOpen(true)}
        onGenerate={() =>
          toast.info('Brief generation is coming in the next update.')
        }
        onRefreshSource={onRefreshSource}
      />

      {/* Refresh feedback — honest per-source truth, floated so it never
          disturbs the non-scroll cockpit grid. Never a generic toast. */}
      {showFeedback && (
        <div className="fixed bottom-5 right-5 z-40 w-[380px] max-w-[calc(100vw-2.5rem)]">
          {refresh.isPending && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4 text-[13px] text-apex-fg-secondary shadow-lg shadow-black/30"
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
              className="rounded-[10px] border-[0.5px] border-apex-border bg-apex-primary p-4 text-[13px] text-apex-red shadow-lg shadow-black/30"
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
        </div>
      )}

      {kiteOpen && (
        <KiteRefreshModal
          onClose={() => setKiteOpen(false)}
          onComplete={() => setKiteOpen(false)}
        />
      )}
    </>
  )
}
