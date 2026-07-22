import { useState } from 'react'
import { BoardTile } from './BoardTile'
import { DecisionBar } from './DecisionBar'
import { MacroTile } from './MacroTile'
import { NewsTile } from './NewsTile'
import { SourcesRail } from './SourcesRail'
import type { ReadinessResponse, ReadinessSource } from '@/lib/api/contracts'
import { sourceFeeds } from './provenance'

/**
 * The Bento Cockpit — the readiness/evidence screen (FFE-010). A NON-SCROLL
 * command centre: decision on top, sources → board → news/macro below as bento
 * tiles (size = importance). It's a living SYSTEM — hovering a source lights up
 * the evidence it PRODUCES (lineage → "where the board comes from"); hovering a
 * board row explains, in plain words, where its numbers come from and what the
 * positioning MEANS (focus+context). Renders the live /readiness response (its
 * additive `evidence` block, FIN-169); when `evidence` is absent it degrades to
 * the decision bar + sources rail alone — honest, never a blank.
 *
 * Non-scroll on lg+ (fixed viewport height); below lg it stacks and scrolls —
 * this is a desktop cockpit, with a usable mobile fallback.
 */
export function EvidenceCockpit({
  data,
  refreshing,
  onRefresh,
  onRefreshKite,
  onGenerate,
  onViewBrief,
  onRefreshSource,
}: {
  data: ReadinessResponse
  refreshing?: boolean
  onRefresh?: () => void
  onRefreshKite?: () => void
  onGenerate?: () => void
  onViewBrief?: () => void
  onRefreshSource?: (source: ReadinessSource) => void
}) {
  const [hoveredSource, setHoveredSource] = useState<string | null>(null)
  const feeds = hoveredSource ? sourceFeeds(hoveredSource) : null
  const positioningOnly = (data.evidence?.news.fresh_count ?? 0) === 0
  const board = data.evidence?.board ?? []
  const macro = data.evidence?.macro ?? []

  return (
    <div className="flex flex-col gap-3.5 lg:h-[calc(100svh-150px)] lg:min-h-[600px]">
      <DecisionBar
        brief={data.brief ?? null}
        canGenerate={data.can_generate}
        blockedReason={data.blocked_reason ?? null}
        positioningOnly={positioningOnly}
        freshCount={data.fresh_count}
        sources={data.sources}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onRefreshKite={onRefreshKite}
        onGenerate={onGenerate}
        onViewBrief={onViewBrief}
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 lg:grid-cols-[244px_minmax(0,1fr)_340px]">
        <SourcesRail
          sources={data.sources}
          hovered={hoveredSource}
          onHover={setHoveredSource}
          onAction={onRefreshSource}
          delayMs={80}
        />

        <BoardTile
          rows={board}
          macro={macro}
          hoveredSource={hoveredSource}
          delayMs={160}
        />

        <div className="grid min-h-0 grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-1 lg:grid-rows-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {data.evidence && (
            <>
              <NewsTile
                news={data.evidence.news}
                lit={feeds === 'news'}
                delayMs={240}
              />
              <MacroTile
                rows={macro}
                lit={feeds === 'macro'}
                hoveredSource={hoveredSource}
                delayMs={320}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
