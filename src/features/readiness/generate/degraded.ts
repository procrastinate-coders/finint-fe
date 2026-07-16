import type { ServedBrief } from '@/lib/api/contracts'

/**
 * The honesty summary of a served brief (CLAUDE.md law 4 — `guard_failed` and
 * `fabricated_claims` are FIRST-CLASS UI, not debug fields). A run can SUCCEED
 * AND be degraded: both are true, and the screen must say so before it hands the
 * brief off. Hiding a degraded brief to look polished is the one unforgivable UI
 * decision in this product.
 */
export interface DegradationSummary {
  /** Any honesty signal fired — the brief must be flagged, not shipped clean. */
  degraded: boolean
  /** meta.guard_failed — a substance guard withheld one or more fields. */
  guardFailed: boolean
  /** meta.fabricated_claims — invented content the guard caught (should be 0). */
  fabricatedClaims: number
  /** Instruments whose AI read was withheld (ai_read.guard_failed). */
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
