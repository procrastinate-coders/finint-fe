import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import type { ReadinessSource } from '@/lib/api/contracts'
import { ScreenError } from '@/components/common/ScreenState'
import { CockpitSkeleton } from './cockpit/CockpitSkeleton'
import { queryKeys, useReadiness, useRefreshSpine } from '@/lib/query/hooks'
import { RefreshReport } from './RefreshReport'
import { RefreshScopeModal } from './RefreshScopeModal'
import { KiteRefreshModal } from './KiteRefreshModal'
import { EvidenceCockpit } from './cockpit/EvidenceCockpit'
import { GenerateFlow } from './generate/GenerateFlow'

/**
 * The readiness/evidence screen — the app's home. It renders the Bento Cockpit
 * (FIN-169's `evidence`) over the FIN-160 spine: a STANDING manual refresh (the
 * only way the spine fetches — FIN-174 killed the on-land auto-refresh so nothing
 * spends the GNews quota without Father's click), the honest per-source refresh
 * report, and the Kite daily-login modal. The cockpit's decision bar + sources
 * rail SUPERSEDE the old flat source list — every input is in one non-scroll
 * surface (FFE-010).
 */
export function ReadinessScreen() {
  const readiness = useReadiness()
  const refresh = useRefreshSpine()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [kiteOpen, setKiteOpen] = useState(false)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [refreshScopeOpen, setRefreshScopeOpen] = useState(false)
  const [reportDismissed, setReportDismissed] = useState(false)

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

  if (readiness.isPending) return <CockpitSkeleton />
  if (readiness.isError) {
    return (
      <ScreenError error={readiness.error} onRetry={() => readiness.refetch()} />
    )
  }

  const data = readiness.data
  // Common case after FIN-145's news-freshness filter: nothing crossed the
  // overnight window → a positioning-only run. An honest outcome, not an edge.
  const positioningOnly = (data.evidence?.news.fresh_count ?? 0) === 0

  // BARE POST /refresh — every leg. The deliberate full sweep, chosen from the
  // scope modal ("Refresh all"). Spends every quota-limited API.
  function runRefresh() {
    setReportDismissed(false)
    refresh.mutate(undefined)
  }

  // FILTERED POST /refresh {"sources": keys} — one dot, or the stale subset
  // (FIN-192). One stale source never spends every quota-limited API.
  function refreshSources(keys: string[]) {
    setReportDismissed(false)
    refresh.mutate(keys)
  }

  // A refreshable dot clicked in the rail: Kite is special — its action is a Kite
  // LOGIN, not a spine leg (the backend 400s {"sources":["kite"]}), so it opens
  // the daily-login modal; anything else refreshes just that source.
  function onRefreshSource(source: ReadinessSource) {
    if (source.action === 'kite_refresh') {
      setKiteOpen(true)
      return
    }
    refreshSources([source.key])
  }

  const showFeedback =
    refresh.isPending ||
    refresh.isError ||
    (!!refresh.data && !reportDismissed)

  return (
    <>
      <EvidenceCockpit
        data={data}
        refreshing={refresh.isPending}
        onRefresh={() => setRefreshScopeOpen(true)}
        onRefreshKite={() => setKiteOpen(true)}
        onGenerate={() => setGenerateOpen(true)}
        onViewBrief={() => navigate({ to: '/brief/today' })}
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

      {refreshScopeOpen && (
        <RefreshScopeModal
          sources={data.sources}
          onClose={() => setRefreshScopeOpen(false)}
          onRefreshAll={() => {
            setRefreshScopeOpen(false)
            runRefresh()
          }}
          onRefreshSources={(keys) => {
            setRefreshScopeOpen(false)
            refreshSources(keys)
          }}
        />
      )}

      {kiteOpen && (
        <KiteRefreshModal
          onClose={() => setKiteOpen(false)}
          onComplete={() => setKiteOpen(false)}
        />
      )}

      {generateOpen && (
        <GenerateFlow
          positioningOnly={positioningOnly}
          onClose={() => setGenerateOpen(false)}
          onViewBrief={() => {
            setGenerateOpen(false)
            navigate({ to: '/brief/today' })
          }}
        />
      )}
    </>
  )
}
