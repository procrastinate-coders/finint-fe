import type { ServedBrief } from '@/lib/api/contracts'

/**
 * The honesty summary of a served brief (CLAUDE.md law 2/4 — `guard_failed` and
 * `fabricated_claims` are FIRST-CLASS UI, not debug fields). A run can SUCCEED
 * AND be degraded: both are true, and the screen must say so. Hiding a degraded
 * brief to look polished is THE ONE UNFORGIVABLE UI DECISION in this product.
 *
 * Shared by the generate flow (handoff flag) and the brief surface (the banner).
 */
export interface DegradationSummary {
  /** Any honesty signal fired — the brief must be flagged, not shipped clean. */
  degraded: boolean
  /** meta.guard_failed — a substance guard withheld one or more fields. */
  guardFailed: boolean
  /**
   * meta.fabricated_claims — a DEGRADATION count (FIN-171: withheld text fields
   * across the market layer + every instrument), not a per-claim score.
   */
  fabricatedClaims: number
  /** Instruments whose AI read was (partly or wholly) withheld. */
  withheldInstruments: string[]
}

export function summarizeDegradation(brief: ServedBrief): DegradationSummary {
  const guardFailed = brief.meta?.guard_failed ?? false
  const fabricatedClaims = brief.meta?.fabricated_claims ?? 0
  const withheldInstruments = (brief.instruments ?? [])
    .filter((i) => i.ai_read?.guard_failed)
    .map((i) => i.instrument)
  return {
    degraded:
      guardFailed || fabricatedClaims > 0 || withheldInstruments.length > 0,
    guardFailed,
    fabricatedClaims,
    withheldInstruments,
  }
}

/** Positioning-only = the news pass yielded no catalysts. Likely COMMON (news
 * is thin; Tier-B has structurally zero coverage) — a real, honest read. */
export function isPositioningOnly(brief: ServedBrief): boolean {
  return (brief.market?.catalysts?.length ?? 0) === 0
}
